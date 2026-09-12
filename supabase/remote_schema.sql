


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."adjust_product_qty"("p_product_id" bigint, "p_adjustment_quantity" integer, "p_adjustment_type" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
    v_current_stock integer;
    v_new_stock integer;
begin
    -- Basic validation
    if p_adjustment_quantity = 0 then
        raise exception 'Adjustment quantity cannot be zero';
    end if;

    if p_adjustment_type not in (
        'RESTOCK',
        'DAMAGE',
        'STOCK_COUNT',
        'CORRECTION'
    ) then
        raise exception 'Invalid adjustment type: %', p_adjustment_type;
    end if;

    -- Get existing stock and lock the row.
    select stock_quantity
    into v_current_stock
    from public.product_stock
    where product_id = p_product_id
    for update;

    -- No stock record yet → treat stock as zero.
    if not found then
        v_current_stock := 0;
    end if;

    -- Calculate new stock
    v_new_stock := v_current_stock + p_adjustment_quantity;

    -- Do not allow negative stock
    if v_new_stock < 0 then
        raise exception
            'Insufficient stock. Current stock: %, adjustment: %',
            v_current_stock,
            p_adjustment_quantity;
    end if;

    -- Create or update stock record
    insert into public.product_stock (
        product_id,
        stock_quantity,
        updated_at
    )
    values (
        p_product_id,
        v_new_stock,
        now()
    )
    on conflict (product_id)
    do update set
        stock_quantity = excluded.stock_quantity,
        updated_at = now();

    -- Store adjustment history
    insert into public.stock_adjustments (
        product_id,
        quantity,
        adjustment_type,
        note,
        created_at
    )
    values (
        p_product_id,
        p_adjustment_quantity,
        p_adjustment_type,
        nullif(trim(p_note), ''),
        now()
    );

    return v_new_stock;
end;
$$;


ALTER FUNCTION "public"."adjust_product_qty"("p_product_id" bigint, "p_adjustment_quantity" integer, "p_adjustment_type" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."convert_order_to_transaction"("p_order_id" bigint, "p_transaction_code" "text", "p_transaction_time" timestamp without time zone, "p_payment_method" "text", "p_cashier" "text") RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_transaction_id bigint;
    v_order_status text;
    v_existing_transaction_id bigint;
    v_transaction_amount numeric;
    v_stock_quantity integer;
    v_product record;
    v_unready_item record;
BEGIN

    /*
     * ============================================================
     * 1. Validate basic transaction information
     * ============================================================
     */

    IF p_transaction_code IS NULL
       OR trim(p_transaction_code) = ''
    THEN
        RAISE EXCEPTION 'Transaction code is required';
    END IF;

    IF p_payment_method IS NULL
       OR trim(p_payment_method) = ''
    THEN
        RAISE EXCEPTION 'Payment method is required';
    END IF;


    /*
     * ============================================================
     * 2. Lock the order
     *
     * This prevents two concurrent conversion attempts from
     * finalizing the same order.
     * ============================================================
     */

    SELECT
        o.status
    INTO
        v_order_status
    FROM public.orders o
    WHERE o.order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Order % does not exist',
            p_order_id;
    END IF;


    /*
     * ============================================================
     * 3. Validate order status
     *
     * Only pending and delivered orders can be finalized.
     *
     * paid       -> already finalized
     * cancelled  -> cannot be finalized
     * ============================================================
     */

    IF v_order_status = 'paid' THEN
        RAISE EXCEPTION
            'Order % has already been paid',
            p_order_id;
    END IF;

    IF v_order_status = 'cancelled' THEN
        RAISE EXCEPTION
            'Cancelled order % cannot be converted to a transaction',
            p_order_id;
    END IF;

    IF v_order_status NOT IN ('pending', 'delivered') THEN
        RAISE EXCEPTION
            'Order % has invalid status: %',
            p_order_id,
            v_order_status;
    END IF;


    /*
     * ============================================================
     * 4. Check whether a transaction already exists
     *
     * This is also protected by UNIQUE(transactions.order_id),
     * but checking explicitly gives a clearer error.
     * ============================================================
     */

    SELECT t.transaction_id
    INTO v_existing_transaction_id
    FROM public.transactions t
    WHERE t.order_id = p_order_id;

    IF FOUND THEN
        RAISE EXCEPTION
            'Order % already has transaction %',
            p_order_id,
            v_existing_transaction_id;
    END IF;


    /*
     * ============================================================
     * 5. Validate order items
     * ============================================================
     */

    IF NOT EXISTS (
        SELECT 1
        FROM public.order_items oi
        WHERE oi.order_id = p_order_id
    ) THEN
        RAISE EXCEPTION
            'Order % has no items',
            p_order_id;
    END IF;


    /*
     * ============================================================
     * 6. Lock all relevant product stock rows
     *
     * Lock in product_id order to reduce the possibility of
     * deadlocks when multiple orders are being finalized
     * concurrently.
     *
     * This lock is important because readiness/FIFO depends on
     * current stock.
     * ============================================================
     */

    FOR v_product IN
        SELECT DISTINCT oi.product_id
        FROM public.order_items oi
        WHERE oi.order_id = p_order_id
        ORDER BY oi.product_id
    LOOP

        SELECT ps.stock_quantity
        INTO v_stock_quantity
        FROM public.product_stock ps
        WHERE ps.product_id = v_product.product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'Stock record does not exist for product_id %',
                v_product.product_id;
        END IF;

    END LOOP;


    /*
     * ============================================================
     * 7. Validate FIFO readiness
     *
     * order_item_readiness already contains the project's FIFO
     * rules:
     *
     * - pending + delivered are open demand
     * - TRUE overrides receive priority
     * - otherwise FIFO uses due_date, created_at, order_id,
     *   order_item_id
     * - stock is allocated per product
     *
     * We require EVERY item in this order to be ready.
     * ============================================================
     */

    SELECT
        r.order_item_id,
        r.product_id,
        r.quantity_ordered,
        r.stock_quantity,
        r.is_ready_override,
        r.computed_is_ready
    INTO v_unready_item
    FROM public.order_item_readiness r
    WHERE r.order_id = p_order_id
      AND r.is_ready = FALSE
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION
            'Order % cannot be converted: order item % for product_id % is not ready. Requested: %, available stock: %',
            p_order_id,
            v_unready_item.order_item_id,
            v_unready_item.product_id,
            v_unready_item.quantity_ordered,
            v_unready_item.stock_quantity;
    END IF;


    /*
     * ============================================================
     * 8. Calculate transaction amount
     *
     * Do NOT trust the frontend for this value.
     *
     * transaction_amount =
     *     SUM(quantity_ordered * unit_price)
     * ============================================================
     */

    SELECT COALESCE(
        SUM(
            oi.quantity_ordered::numeric * oi.unit_price
        ),
        0
    )
    INTO v_transaction_amount
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id;


    /*
     * ============================================================
     * 9. Create transaction
     * ============================================================
     */

    INSERT INTO public.transactions (
        transaction_code,
        order_id,
        transaction_time,
        payment_method,
        transaction_amount,
        cashier
    )
    VALUES (
        p_transaction_code,
        p_order_id,
        p_transaction_time,
        p_payment_method,
        v_transaction_amount,
        p_cashier
    )
    RETURNING transaction_id
    INTO v_transaction_id;


    /*
     * ============================================================
     * 10. Copy order items -> transaction items
     *
     * This is a snapshot of the finalized order.
     *
     * Generated columns such as subtotal and total_cogs are
     * calculated automatically by transaction_items.
     * ============================================================
     */

    INSERT INTO public.transaction_items (
        transaction_id,
        product_id,
        quantity,
        unit_price,
        unit_cost_labor,
        unit_cost_ingredient,
        unit_cost_utilities,
        unit_cost_packaging
    )
    SELECT
        v_transaction_id,
        oi.product_id,
        oi.quantity_ordered,
        oi.unit_price,
        oi.unit_cost_labor,
        oi.unit_cost_ingredient,
        oi.unit_cost_utilities,
        oi.unit_cost_packaging
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id;


    /*
     * ============================================================
     * 11. Decrease stock
     *
     * Aggregate duplicate products first.
     *
     * The rows are already locked from step 6.
     * ============================================================
     */

    FOR v_product IN
        SELECT
            oi.product_id,
            SUM(oi.quantity_ordered)::integer AS quantity
        FROM public.order_items oi
        WHERE oi.order_id = p_order_id
        GROUP BY oi.product_id
        ORDER BY oi.product_id
    LOOP

        UPDATE public.product_stock
        SET
            stock_quantity = stock_quantity - v_product.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = v_product.product_id
          AND stock_quantity >= v_product.quantity;

        IF NOT FOUND THEN

            SELECT ps.stock_quantity
            INTO v_stock_quantity
            FROM public.product_stock ps
            WHERE ps.product_id = v_product.product_id;

            RAISE EXCEPTION
                'Insufficient stock for product_id %. Requested: %, available: %',
                v_product.product_id,
                v_product.quantity,
                COALESCE(v_stock_quantity, 0);

        END IF;

    END LOOP;


    /*
     * ============================================================
     * 12. Mark order as paid
     * ============================================================
     */

    UPDATE public.orders
    SET status = 'paid'
    WHERE order_id = p_order_id;


    /*
     * ============================================================
     * 13. Return transaction ID
     * ============================================================
     */

    RETURN v_transaction_id;

END;
$$;


ALTER FUNCTION "public"."convert_order_to_transaction"("p_order_id" bigint, "p_transaction_code" "text", "p_transaction_time" timestamp without time zone, "p_payment_method" "text", "p_cashier" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."business_settlement" (
    "business_settlement_id" bigint NOT NULL,
    "sales_revenue" numeric NOT NULL,
    "sales_labor_cost" numeric NOT NULL,
    "sales_packaging_cost" numeric NOT NULL,
    "sales_utility_cost" numeric NOT NULL,
    "sales_ingredient_cost" numeric NOT NULL,
    "sales_margin" numeric NOT NULL,
    "settled_labor_cost" numeric,
    "settled_packaging_cost" numeric,
    "settled_utility_cost" numeric,
    "settled_ingredient_cost" numeric,
    "total_additional_expenses" numeric DEFAULT 0 NOT NULL,
    "profit_retained" numeric DEFAULT 0,
    "profit_distributed" numeric DEFAULT 0,
    "deficit_covered" numeric DEFAULT 0,
    "settlement_start" timestamp without time zone,
    "settlement_end" timestamp without time zone,
    "settlement_additional_selector" "jsonb",
    "settlement_status" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone,
    "updated_by" "uuid",
    "deleted_at" timestamp without time zone,
    "deleted_by" "uuid",
    "settlement_name" "text" NOT NULL,
    CONSTRAINT "business_settlement_non_negative_check" CHECK ((("sales_revenue" >= (0)::numeric) AND ("sales_labor_cost" >= (0)::numeric) AND ("sales_packaging_cost" >= (0)::numeric) AND ("sales_utility_cost" >= (0)::numeric) AND ("sales_ingredient_cost" >= (0)::numeric) AND ("sales_margin" >= (0)::numeric) AND (("settled_labor_cost" IS NULL) OR ("settled_labor_cost" >= (0)::numeric)) AND (("settled_packaging_cost" IS NULL) OR ("settled_packaging_cost" >= (0)::numeric)) AND (("settled_utility_cost" IS NULL) OR ("settled_utility_cost" >= (0)::numeric)) AND (("settled_ingredient_cost" IS NULL) OR ("settled_ingredient_cost" >= (0)::numeric)) AND ("total_additional_expenses" >= (0)::numeric) AND ("profit_retained" >= (0)::numeric) AND ("profit_distributed" >= (0)::numeric) AND ("deficit_covered" >= (0)::numeric))),
    CONSTRAINT "business_settlement_sales_balance_check" CHECK (("sales_revenue" = (((("sales_labor_cost" + "sales_packaging_cost") + "sales_utility_cost") + "sales_ingredient_cost") + "sales_margin"))),
    CONSTRAINT "business_settlement_settlement_balance_check" CHECK ((("settlement_status" = 'DRAFT'::"text") OR (("settled_labor_cost" IS NOT NULL) AND ("settled_packaging_cost" IS NOT NULL) AND ("settled_utility_cost" IS NOT NULL) AND ("settled_ingredient_cost" IS NOT NULL) AND (("sales_revenue" + "deficit_covered") = (((((("settled_labor_cost" + "settled_packaging_cost") + "settled_utility_cost") + "settled_ingredient_cost") + "total_additional_expenses") + "profit_retained") + "profit_distributed"))))),
    CONSTRAINT "business_settlement_settlement_status_check" CHECK (("settlement_status" = ANY (ARRAY['DRAFT'::"text", 'CONFIRMED'::"text", 'SETTLED'::"text"])))
);


ALTER TABLE "public"."business_settlement" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_business_settlement"("p_settlement_name" "text", "p_selection_mode" "text", "p_add_ids" bigint[] DEFAULT '{}'::bigint[], "p_exclude_ids" bigint[] DEFAULT '{}'::bigint[], "p_settlement_start" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_settlement_end" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_product_category" "text"[] DEFAULT NULL::"text"[], "p_product_name" "text"[] DEFAULT NULL::"text"[], "p_settlement_additional_selector" "jsonb" DEFAULT NULL::"jsonb") RETURNS "public"."business_settlement"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_settlement public.business_settlement;
    v_ids bigint[];
BEGIN
    IF p_selection_mode = 'ALL' THEN
        SELECT array_agg(transaction_item_id) INTO v_ids
        FROM public.resolve_settlement_candidate_ids(
            NULL,
            p_settlement_start,
            p_settlement_end,
            p_product_category,
			p_product_name
        )
        WHERE transaction_item_id <> ALL(p_exclude_ids);
    ELSE
        v_ids := p_add_ids;
    END IF;

    INSERT INTO public.business_settlement (
        settlement_name, 
		sales_revenue, 
		sales_labor_cost, 
		sales_packaging_cost,
        sales_utility_cost, 
		sales_ingredient_cost, 
		sales_margin,
        settlement_start, 
		settlement_end, 
		settlement_additional_selector, 
		settlement_status
    )
    SELECT 
		p_settlement_name,
		COALESCE(SUM(ti.subtotal), 0),
        COALESCE(SUM(ti.unit_cost_labor * ti.quantity), 0),
        COALESCE(SUM(ti.unit_cost_packaging * ti.quantity), 0),
        COALESCE(SUM(ti.unit_cost_utilities * ti.quantity), 0),
        COALESCE(SUM(ti.unit_cost_ingredient * ti.quantity), 0),
        COALESCE(SUM(ti.subtotal - ti.total_cogs), 0),
        p_settlement_start, 
		p_settlement_end, 
		p_settlement_additional_selector, 
		'DRAFT'
    FROM public.transaction_items ti
    WHERE v_ids IS NOT NULL 
		AND ti.transaction_item_id = ANY(v_ids)
		AND ti.business_settlement_id IS NULL
    RETURNING 
		* 
	INTO v_settlement;

    IF v_ids IS NOT NULL AND cardinality(v_ids) > 0 
	THEN
		UPDATE public.transaction_items
        SET business_settlement_id = v_settlement.business_settlement_id
        WHERE transaction_item_id = ANY(v_ids)
		AND business_settlement_id IS NULL;
    END IF;

    RETURN v_settlement;
END;
$$;


ALTER FUNCTION "public"."create_business_settlement"("p_settlement_name" "text", "p_selection_mode" "text", "p_add_ids" bigint[], "p_exclude_ids" bigint[], "p_settlement_start" timestamp without time zone, "p_settlement_end" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[], "p_settlement_additional_selector" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_order_with_items"("p_customer_name" "text", "p_customer_address" "text" DEFAULT NULL::"text", "p_due_date" "date" DEFAULT NULL::"date", "p_notes" "text" DEFAULT NULL::"text", "p_items" "jsonb" DEFAULT '[]'::"jsonb") RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_order_id bigint;
    v_item jsonb;
BEGIN
    IF NULLIF(trim(p_customer_name), '') IS NULL THEN
        RAISE EXCEPTION 'Customer name is required';
    END IF;

    IF p_due_date IS NULL THEN
        RAISE EXCEPTION 'Due date is required';
    END IF;

    IF p_items IS NULL
       OR jsonb_typeof(p_items) <> 'array'
       OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'At least one order item is required';
    END IF;

    INSERT INTO public.orders (
        customer_name,
        customer_address,
        due_date,
        notes,
        status
    )
    VALUES (
        trim(p_customer_name),
        NULLIF(trim(p_customer_address), ''),
        p_due_date,
        NULLIF(trim(p_notes), ''),
        'pending'
    )
    RETURNING order_id
    INTO v_order_id;

    FOR v_item IN
        SELECT value
        FROM jsonb_array_elements(p_items)
    LOOP

        IF (v_item->>'product_id') IS NULL THEN
            RAISE EXCEPTION 'Every order item requires product_id';
        END IF;

        IF (v_item->>'quantity_ordered') IS NULL
           OR (v_item->>'quantity_ordered')::integer <= 0 THEN
            RAISE EXCEPTION 'Order item quantity must be greater than zero';
        END IF;

        IF (v_item->>'unit_price') IS NULL
           OR (v_item->>'unit_price')::numeric < 0 THEN
            RAISE EXCEPTION 'Order item unit_price must be zero or greater';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM public.products p
            WHERE p.product_id = (v_item->>'product_id')::bigint
              AND p.deleted_at IS NULL
              AND p.is_active = TRUE
        ) THEN
            RAISE EXCEPTION
                'Product % does not exist or is inactive',
                v_item->>'product_id';
        END IF;

        INSERT INTO public.order_items (
            order_id,
            product_id,
            quantity_ordered,
            unit_price,
            unit_cost_labor,
            unit_cost_ingredient,
            unit_cost_utilities,
            unit_cost_packaging
        )
        VALUES (
            v_order_id,
            (v_item->>'product_id')::bigint,
            (v_item->>'quantity_ordered')::integer,
            (v_item->>'unit_price')::numeric,

            COALESCE(
                (v_item->>'unit_cost_labor')::numeric,
                0
            ),

            COALESCE(
                (v_item->>'unit_cost_ingredient')::numeric,
                0
            ),

            COALESCE(
                (v_item->>'unit_cost_utilities')::numeric,
                0
            ),

            COALESCE(
                (v_item->>'unit_cost_packaging')::numeric,
                0
            )
        );
    END LOOP;

    RETURN v_order_id;
END;
$$;


ALTER FUNCTION "public"."create_order_with_items"("p_customer_name" "text", "p_customer_address" "text", "p_due_date" "date", "p_notes" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_product_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO public.product_stock (
        product_id,
        stock_quantity
    )
    VALUES (
        NEW.product_id,
        0
    );

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_product_stock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_transaction"("p_transaction_code" "text", "p_transaction_time" timestamp without time zone, "p_payment_method" "text", "p_transaction_amount" numeric, "p_cashier" "text", "p_items" "jsonb") RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$

DECLARE
    v_transaction_id bigint;
    v_item record;
    v_updated_rows integer;

BEGIN

    /*
     * ============================================================
     * 1. Validate items
     * ============================================================
     */

    IF p_items IS NULL
       OR jsonb_typeof(p_items) <> 'array'
       OR jsonb_array_length(p_items) = 0
    THEN
        RAISE EXCEPTION 'Transaction must contain at least one item';
    END IF;


    /*
     * ============================================================
     * 2. Validate transaction items
     *
     * Required:
     * - product_id
     * - quantity
     * - unit_price
     * - unit_cost_labor
     * - unit_cost_ingredient
     * - unit_cost_utilities
     * ============================================================
     */

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_items) AS item
        WHERE (item->>'product_id') IS NULL
           OR (item->>'quantity') IS NULL
           OR (item->>'unit_price') IS NULL
           OR (item->>'unit_cost_labor') IS NULL
           OR (item->>'unit_cost_ingredient') IS NULL
           OR (item->>'unit_cost_utilities') IS NULL
		   OR (item->>'unit_cost_packaging') IS NULL

           OR (item->>'quantity')::integer <= 0
           OR (item->>'unit_price')::numeric < 0
           OR (item->>'unit_cost_labor')::numeric < 0
           OR (item->>'unit_cost_ingredient')::numeric < 0
           OR (item->>'unit_cost_utilities')::numeric < 0
           OR (item->>'unit_cost_packaging')::numeric < 0
    ) THEN
        RAISE EXCEPTION
            'Every transaction item must have a valid product_id, positive quantity, non-negative unit_price, and non-negative unit costs';
    END IF;


    /*
     * ============================================================
     * 3. Insert transaction
     * ============================================================
     */

    INSERT INTO transactions (
        transaction_code,
        transaction_time,
        payment_method,
        transaction_amount,
        cashier
    )
    VALUES (
        p_transaction_code,
        p_transaction_time,
        p_payment_method,
        p_transaction_amount,
        p_cashier
    )
    RETURNING transaction_id
    INTO v_transaction_id;


    /*
     * ============================================================
     * 4. Insert transaction items
     *
     * subtotal is NOT inserted.
     * It is generated automatically:
     *
     *     subtotal = quantity * unit_price
     *
     * total_cogs is also NOT inserted.
     * It is generated automatically:
     *
     *     total_cogs =
     *         quantity *
     *         (
     *             unit_cost_labor
     *             + unit_cost_ingredient
     *             + unit_cost_utilities
     *         )
     * ============================================================
     */

    INSERT INTO transaction_items (
        transaction_id,
        product_id,
        quantity,
        unit_price,
        unit_cost_labor,
        unit_cost_ingredient,
        unit_cost_utilities, 
		unit_cost_packaging
    )
    SELECT
        v_transaction_id,
        (item->>'product_id')::bigint,
        (item->>'quantity')::integer,
        (item->>'unit_price')::numeric,
        (item->>'unit_cost_labor')::numeric,
        (item->>'unit_cost_ingredient')::numeric,
        (item->>'unit_cost_utilities')::numeric,
		(item->>'unit_cost_packaging')::numeric
    FROM jsonb_array_elements(p_items) AS item;


    /*
     * ============================================================
     * 5. Decrease stock
     *
     * Aggregate first so that duplicate product entries are
     * treated as one stock movement.
     *
     * The UPDATE condition:
     *
     *     stock_quantity >= requested_quantity
     *
     * makes the stock operation concurrency-safe.
     * ============================================================
     */

    FOR v_item IN
        SELECT
            (item->>'product_id')::bigint AS product_id,
            SUM((item->>'quantity')::integer)::integer AS quantity
        FROM jsonb_array_elements(p_items) AS item
        GROUP BY (item->>'product_id')::bigint
    LOOP

        UPDATE product_stock
        SET
            stock_quantity = stock_quantity - v_item.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = v_item.product_id
          AND stock_quantity >= v_item.quantity;

        GET DIAGNOSTICS v_updated_rows = ROW_COUNT;


        IF v_updated_rows = 0 THEN

            /*
             * Distinguish between:
             * - product stock row does not exist
             * - insufficient stock
             */

            IF NOT EXISTS (
                SELECT 1
                FROM product_stock
                WHERE product_id = v_item.product_id
            ) THEN

                RAISE EXCEPTION
                    'Stock record does not exist for product_id %',
                    v_item.product_id;

            ELSE

                RAISE EXCEPTION
                    'Insufficient stock for product_id %. Requested: %, available: %',
                    v_item.product_id,
                    v_item.quantity,
                    (
                        SELECT stock_quantity
                        FROM product_stock
                        WHERE product_id = v_item.product_id
                    );

            END IF;

        END IF;

    END LOOP;


    /*
     * ============================================================
     * 6. Return transaction ID
     * ============================================================
     */

    RETURN v_transaction_id;

END;

$$;


ALTER FUNCTION "public"."create_transaction"("p_transaction_code" "text", "p_transaction_time" timestamp without time zone, "p_payment_method" "text", "p_transaction_amount" numeric, "p_cashier" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_business_settlement"("p_business_settlement_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_status TEXT;
BEGIN

    SELECT settlement_status
    INTO v_status
    FROM public.business_settlement
    WHERE business_settlement_id = p_business_settlement_id
      AND deleted_at IS NULL
    FOR UPDATE;


    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business settlement not found';
    END IF;


    IF v_status = 'SETTLED' THEN
        RAISE EXCEPTION
            'A SETTLED settlement cannot be deleted';
    END IF;


    -- Release transaction items
    UPDATE public.transaction_items
    SET business_settlement_id = NULL
    WHERE business_settlement_id = p_business_settlement_id;


    -- Soft-delete expense allocations
    UPDATE public.business_settlement_expense
    SET deleted_at = now()
    WHERE business_settlement_id = p_business_settlement_id
      AND deleted_at IS NULL;


    -- Soft-delete settlement
    UPDATE public.business_settlement
    SET deleted_at = now()
    WHERE business_settlement_id = p_business_settlement_id;

END;
$$;


ALTER FUNCTION "public"."delete_business_settlement"("p_business_settlement_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_transaction"("p_transaction_id" bigint) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_item record;
    v_updated_rows integer;
BEGIN

    /*
     * ============================================================
     * 1. Make sure the transaction exists and is still active.
     * ============================================================
     */

    IF NOT EXISTS (
        SELECT 1
        FROM transactions
        WHERE transaction_id = p_transaction_id
          AND deleted_at IS NULL
    ) THEN
        RETURN FALSE;
    END IF;


    /*
     * ============================================================
     * 2. Restore stock from active transaction items.
     *
     * Aggregate by product_id in case a transaction contains
     * multiple rows for the same product.
     * ============================================================
     */

    FOR v_item IN
        SELECT
            product_id,
            SUM(quantity)::integer AS quantity
        FROM transaction_items
        WHERE transaction_id = p_transaction_id
          AND deleted_at IS NULL
        GROUP BY product_id
    LOOP

        UPDATE product_stock
        SET
            stock_quantity = stock_quantity + v_item.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = v_item.product_id;

        GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

        IF v_updated_rows = 0 THEN
            RAISE EXCEPTION
                'Stock record does not exist for product_id %',
                v_item.product_id;
        END IF;

    END LOOP;


    /*
     * ============================================================
     * 3. Soft delete transaction items
     * ============================================================
     */

    UPDATE transaction_items
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE transaction_id = p_transaction_id
      AND deleted_at IS NULL;


    /*
     * ============================================================
     * 4. Soft delete transaction
     * ============================================================
     */

    UPDATE transactions
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE transaction_id = p_transaction_id
      AND deleted_at IS NULL;


    /*
     * ============================================================
     * 5. Success
     * ============================================================
     */

    RETURN TRUE;

END;
$$;


ALTER FUNCTION "public"."delete_transaction"("p_transaction_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_business_settlement_lists"() RETURNS TABLE("business_settlement_id" bigint, "settlement_name" "text", "settlement_status" "text", "transaction_item_count" integer, "product_category_count" integer, "transaction_count" integer, "created_at" timestamp without time zone, "updated_at" timestamp without time zone)
    LANGUAGE "sql"
    AS $$
SELECT 
	bs.business_settlement_id,
	bs.settlement_name,
	bs.settlement_status,
	count(ti.transaction_item_id)::integer,
	count(DISTINCT p.product_category)::integer,
	count(DISTINCT ti.transaction_id):: integer,
	bs.created_at,
	bs.updated_at
FROM public.business_settlement bs 
LEFT JOIN public.transaction_items ti 
	ON bs.business_settlement_id = ti.business_settlement_id 
LEFT JOIN public.products p 
	ON ti.product_id = p.product_id 
WHERE bs.deleted_at IS NULL
GROUP BY 1,2,3,7,8
ORDER BY COALESCE(bs.updated_at, bs.created_at) DESC
$$;


ALTER FUNCTION "public"."get_business_settlement_lists"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_email_by_username"("p_username" "text") RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select email
    from public.app_users
    where lower(username) = lower(trim(p_username))
    limit 1;
$$;


ALTER FUNCTION "public"."get_email_by_username"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_flattened_transaction_items"("p_is_readonly" boolean DEFAULT NULL::boolean, "p_settlement_id" bigint DEFAULT NULL::bigint, "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 20, "p_search" "text" DEFAULT NULL::"text", "p_start_date" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_end_date" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_cashier" "text" DEFAULT NULL::"text", "p_product_category" "text"[] DEFAULT NULL::"text"[], "p_product_name" "text"[] DEFAULT NULL::"text"[]) RETURNS TABLE("transaction_item_id" bigint, "business_settlement_id" bigint, "transaction_id" bigint, "transaction_code" "text", "transaction_time" timestamp without time zone, "transaction_amount" numeric, "cashier" "text", "product_id" bigint, "product_name" "text", "product_category" "text", "quantity" numeric, "unit_price" numeric, "subtotal" numeric, "item_created_at" timestamp without time zone, "item_updated_at" timestamp without time zone, "payment_method" "text", "baseline_selected" boolean, "total_count" bigint, "total_selected" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$

WITH filtered_items AS (

    SELECT
        ti.transaction_item_id,
        ti.transaction_id,
        t.transaction_code,
        t.transaction_time,
        t.transaction_amount,
        t.cashier,
        ti.product_id,
        p.product_name,
        p.product_category,
        ti.quantity,
        ti.unit_price,
        ti.subtotal,
        ti.created_at AS item_created_at,
        ti.updated_at AS item_updated_at,
		t.payment_method,
		ti.business_settlement_id,
		business_settlement_id IS NOT NULL as baseline_selected

    FROM transaction_items ti

    INNER JOIN transactions t
        ON t.transaction_id = ti.transaction_id

    LEFT JOIN products p
        ON p.product_id = ti.product_id

    WHERE ti.deleted_at IS NULL
      AND t.deleted_at IS NULL

    -- ==========================================
    -- SEARCH
    -- ==========================================

      AND (
          p_search IS NULL
          OR p_search = ''
          OR t.transaction_code ILIKE '%' || p_search || '%'
          OR t.cashier ILIKE '%' || p_search || '%'
          OR p.product_name ILIKE '%' || p_search || '%'
      )

    -- ==========================================
    -- DATE RANGE
    -- ==========================================

      AND (
          p_start_date IS NULL
          OR t.transaction_time >= p_start_date
      )

      AND (
          p_end_date IS NULL
          OR t.transaction_time < p_end_date
      )

    -- ==========================================
    -- CASHIER
    -- ==========================================

      AND (
          p_cashier IS NULL
          OR p_cashier = ''
          OR t.cashier = p_cashier
      )

    -- ==========================================
    -- PRODUCT CATEGORY
    -- ==========================================

      AND (
          p_product_category IS NULL
          OR p.product_category = ANY(p_product_category)
      )

    -- ==========================================
    -- PRODUCT CATEGORY
    -- ==========================================

      AND (
          p_product_name IS NULL
          OR p.product_name = ANY(p_product_name)
      )
    -- ==========================================
    -- SETTLEMENT ID
    -- ==========================================	  
	AND (
	    p_is_readonly IS NULL
	    OR (
	        p_is_readonly = FALSE 
	        AND (
	            ti.business_settlement_id = p_settlement_id 
	            OR ti.business_settlement_id IS NULL
	        )
	    )
	    OR (
	        p_is_readonly = TRUE 
	        AND ti.business_settlement_id = p_settlement_id
	    )
	)
),

paginated_items AS (

    SELECT
        fi.*,
        COUNT(*) OVER() AS total_count,
		COUNT(fi.business_settlement_id) OVER () AS total_selected

    FROM filtered_items fi

    ORDER BY
        fi.transaction_time DESC,
        fi.transaction_id DESC,
        fi.transaction_item_id DESC

    LIMIT GREATEST(1, p_page_size)

    OFFSET GREATEST(
        0,
        (p_page - 1) * p_page_size
    )
)

SELECT
    pi.transaction_item_id,
	pi.business_settlement_id,
    pi.transaction_id,
    pi.transaction_code,
    pi.transaction_time,
    pi.transaction_amount,
    pi.cashier,
    pi.product_id,
    pi.product_name,
    pi.product_category,
    pi.quantity,
    pi.unit_price,
    pi.subtotal,
    pi.item_created_at,
    pi.item_updated_at,
	pi.payment_method,
	pi.baseline_selected,
    pi.total_count,
	pi.total_selected

FROM paginated_items pi

ORDER BY
    pi.transaction_time DESC,
    pi.transaction_id DESC,
    pi.transaction_item_id DESC;

$$;


ALTER FUNCTION "public"."get_flattened_transaction_items"("p_is_readonly" boolean, "p_settlement_id" bigint, "p_page" integer, "p_page_size" integer, "p_search" "text", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_cashier" "text", "p_product_category" "text"[], "p_product_name" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_order_detail"("p_order_id" bigint) RETURNS TABLE("order_item_id" bigint, "product_id" bigint, "product_name" "text", "quantity_ordered" integer, "stock_quantity" integer, "is_ready_override" boolean, "computed_is_ready" boolean, "is_ready" boolean, "unit_price" numeric)
    LANGUAGE "sql"
    AS $$
    SELECT
        oi.order_item_id,
        oi.product_id,
        p.product_name,
        oi.quantity_ordered,
        r.stock_quantity,
        oi.is_ready_override,
        r.computed_is_ready,
        r.is_ready,
        oi.unit_price

    FROM public.order_items oi

    INNER JOIN public.products p
        ON p.product_id = oi.product_id

    INNER JOIN public.order_item_readiness r
        ON r.order_item_id = oi.order_item_id

    WHERE oi.order_id = p_order_id

    ORDER BY oi.order_item_id;
$$;


ALTER FUNCTION "public"."get_order_detail"("p_order_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_orders_overview"("p_statuses" "text"[] DEFAULT ARRAY['pending'::"text"], "p_page" integer DEFAULT 1, "p_items_per_page" integer DEFAULT 20) RETURNS TABLE("order_id" bigint, "customer_name" "text", "customer_address" "text", "due_date" "date", "status" "text", "notes" "text", "created_at" timestamp with time zone, "item_count" bigint, "ready_count" bigint, "total_count" bigint, "order_detail" "jsonb", "total_pages" bigint, "total_orders" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_total_orders bigint;
BEGIN
    IF p_page < 1 THEN
        RAISE EXCEPTION 'Page must be greater than zero';
    END IF;

    IF p_items_per_page < 1 THEN
        RAISE EXCEPTION 'Items per page must be greater than zero';
    END IF;

    SELECT COUNT(*)
    INTO v_total_orders
    FROM public.orders o
    WHERE o.status = ANY(p_statuses);

    RETURN QUERY
    SELECT
        o.order_id,
        o.customer_name,
        o.customer_address,
        o.due_date,
        o.status,
        o.notes,
        o.created_at,

        COUNT(oi.order_item_id) AS item_count,

        COUNT(*) FILTER (
            WHERE r.is_ready = TRUE
        ) AS ready_count,

        COUNT(oi.order_item_id) AS total_count,

        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'order_item_id', oi.order_item_id,
                    'product_id', oi.product_id,
                    'product_name', p.product_name,
                    'quantity_ordered', oi.quantity_ordered,
                    'unit_price', oi.unit_price,
                    'unit_cost_labor', oi.unit_cost_labor,
                    'unit_cost_ingredient', oi.unit_cost_ingredient,
                    'unit_cost_utilities', oi.unit_cost_utilities,
                    'unit_cost_packaging', oi.unit_cost_packaging,
                    'is_ready_override', oi.is_ready_override,
                    'computed_is_ready', r.computed_is_ready,
                    'is_ready', r.is_ready
                )
                ORDER BY
                    oi.order_item_id
            ) FILTER (
                WHERE oi.order_item_id IS NOT NULL
            ),
            '[]'::jsonb
        ) AS order_detail,

        CEIL(
            v_total_orders::numeric / p_items_per_page
        )::bigint AS total_pages,

        v_total_orders AS total_orders

    FROM public.orders o

    LEFT JOIN public.order_items oi
        ON oi.order_id = o.order_id

    LEFT JOIN public.products p
        ON p.product_id = oi.product_id

    LEFT JOIN public.order_item_readiness r
        ON r.order_item_id = oi.order_item_id

    WHERE o.status = ANY(p_statuses)

    GROUP BY
        o.order_id,
        o.customer_name,
        o.customer_address,
        o.due_date,
        o.status,
        o.notes,
        o.created_at

    ORDER BY
        o.due_date ASC,
        o.created_at ASC,
        o.order_id ASC

    LIMIT p_items_per_page
    OFFSET (p_page - 1) * p_items_per_page;
END;
$$;


ALTER FUNCTION "public"."get_orders_overview"("p_statuses" "text"[], "p_page" integer, "p_items_per_page" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_categories"("p_is_active" boolean DEFAULT NULL::boolean) RETURNS TABLE("product_category" "text")
    LANGUAGE "sql"
    AS $$
    SELECT DISTINCT p.product_category
    FROM public.products p
    WHERE (p_is_active IS NULL OR p.is_active = p_is_active)
      AND p.product_category IS NOT NULL;
$$;


ALTER FUNCTION "public"."get_product_categories"("p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_categories_by_time_range"("p_start_time" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_end_time" timestamp without time zone DEFAULT NULL::timestamp without time zone) RETURNS TABLE("product_category" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
	v_start_time timestamp WITHOUT time zone;
	v_end_time timestamp WITHOUT time zone;
BEGIN
	IF p_start_time IS NULL 
		THEN v_start_time := '2026-01-01 00:00:00';
	ELSE
		v_start_time := p_start_time;
	END IF;

	IF p_end_time IS NULL 
		THEN v_end_time := '9999-12-31 23:59:59';
	ELSE 
		v_end_time := p_end_time;
	END IF;

	RETURN QUERY
    SELECT DISTINCT p.product_category 
		FROM public.transaction_items ti 
	LEFT JOIN public.products p 
		ON ti.product_id = p.product_id
	WHERE ti.deleted_at IS NULL
		AND ti.created_at >= v_start_time
		AND ti.created_at <= v_end_time;
END;
$$;


ALTER FUNCTION "public"."get_product_categories_by_time_range"("p_start_time" timestamp without time zone, "p_end_time" timestamp without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_demand_overview"() RETURNS TABLE("product_id" bigint, "product_name" "text", "stock_quantity" integer, "total_demand" bigint, "nearest_due_date" "date", "shortfall" bigint)
    LANGUAGE "sql"
    AS $$
    SELECT
        oi.product_id,
        p.product_name,
        ps.stock_quantity,

        SUM(oi.quantity_ordered)::bigint AS total_demand,

        MIN(o.due_date) AS nearest_due_date,

        GREATEST(
            SUM(oi.quantity_ordered)::bigint
                - ps.stock_quantity,
            0
        )::bigint AS shortfall

    FROM public.order_items oi

    INNER JOIN public.orders o
        ON o.order_id = oi.order_id

    INNER JOIN public.products p
        ON p.product_id = oi.product_id

    INNER JOIN public.product_stock ps
        ON ps.product_id = oi.product_id

    WHERE o.status IN ('pending', 'delivered')

    GROUP BY
        oi.product_id,
        p.product_name,
        ps.stock_quantity

    ORDER BY
        nearest_due_date ASC,
        p.product_name ASC;
$$;


ALTER FUNCTION "public"."get_product_demand_overview"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_products_from_transaction_item"("p_start_time" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_end_time" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_product_category" "text"[] DEFAULT NULL::"text"[]) RETURNS TABLE("product_name" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
	v_start_time timestamp WITHOUT time zone;
	v_end_time timestamp WITHOUT time zone;
BEGIN
	IF p_start_time IS NULL 
		THEN v_start_time := '2026-01-01 00:00:00';
	ELSE
		v_start_time := p_start_time;
	END IF;

	IF p_end_time IS NULL 
		THEN v_end_time := '9999-12-31 23:59:59';
	ELSE 
		v_end_time := p_end_time;
	END IF;

	RETURN QUERY
    SELECT DISTINCT p.product_name 
		FROM public.transaction_items ti 
	LEFT JOIN public.products p 
		ON ti.product_id = p.product_id
	WHERE ti.deleted_at IS NULL
		AND ti.created_at >= v_start_time
		AND ti.created_at <= v_end_time
		AND (p_product_category IS NULL OR p.product_category = any(p_product_category))
	;
END;
$$;


ALTER FUNCTION "public"."get_products_from_transaction_item"("p_start_time" timestamp without time zone, "p_end_time" timestamp without time zone, "p_product_category" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sales_summary"("report_date" "date") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
with
/* ============================================================
   Date boundaries

   Your transaction_time is timestamp WITHOUT time zone,
   so we use a simple [start, next day) range.
============================================================ */

date_range as (
    select
        report_date::timestamp as start_time,
        (report_date + 1)::timestamp as end_time
),

/* ============================================================
   Transactions for the selected date
============================================================ */

day_transactions as (
    select
        t.transaction_id,
        t.payment_method,
        t.transaction_amount
    from public.transactions t
    cross join date_range d
    where t.transaction_time >= d.start_time
      and t.transaction_time < d.end_time
      and t.deleted_at is null
),

/* ============================================================
   Transaction Items

   Only items belonging to today's transactions.
============================================================ */

day_items as (
    select
        ti.product_id,
        ti.quantity
    from public.transaction_items ti
    inner join day_transactions dt
        on dt.transaction_id = ti.transaction_id
    where ti.deleted_at is null
),

/* ============================================================
   Product sales
============================================================ */

product_sales as (
    select
        di.product_id,
        sum(di.quantity)::integer as sold
    from day_items di
    group by di.product_id
),

/* ============================================================
   Damaged products

   IMPORTANT:
   Change adjustment_type / quantity below if your actual
   stock_adjustment column names are different.
============================================================ */

product_damage as (
    select
        sa.product_id,
        sum(sa.quantity)::integer as damaged
    from public.stock_adjustments sa
    cross join date_range d
    where sa.created_at >= d.start_time
      and sa.created_at < d.end_time
      and sa.adjustment_type = 'DAMAGE'
    group by sa.product_id
),

/* ============================================================
   All products

   We include every active product, not just products sold today.
   This means the stock report can show products that sold 0.
============================================================ */

product_summary as (
    select
        p.product_id,
        p.product_name,

        coalesce(ps.sold, 0)::integer as sold,

        coalesce(pd.damaged, 0)::integer as damaged,

        coalesce(
            pstock.stock_quantity,
            0
        )::integer as remaining

    from public.products p

    left join product_sales ps
        on ps.product_id = p.product_id

    left join product_damage pd
        on pd.product_id = p.product_id

    left join public.product_stock pstock
        on pstock.product_id = p.product_id

    where p.is_active = true
      and p.deleted_at is null
),

/* ============================================================
   Payment summary
============================================================ */

payment_summary as (
    select
        dt.payment_method,
        sum(dt.transaction_amount) as amount
    from day_transactions dt
    group by dt.payment_method
),

/* ============================================================
   Main summary
============================================================ */

summary as (
    select
        coalesce(
            (
                select sum(transaction_amount)
                from day_transactions
            ),
            0
        ) as total_sales,

        (
            select count(*)
            from day_transactions
        ) as total_transactions,

        coalesce(
            (
                select sum(quantity)
                from day_items
            ),
            0
        ) as total_items_sold,

        coalesce(
            (
                select sum(damaged)
                from product_summary
            ),
            0
        ) as total_damaged
)

select jsonb_build_object(

    /* ========================================================
       Basic information
    ======================================================== */

    'date',
    report_date,

    /* ========================================================
       Sales
    ======================================================== */

    'total_sales',
    summary.total_sales,

    'total_transactions',
    summary.total_transactions,

    'total_items_sold',
    summary.total_items_sold,

    'total_damaged',
    summary.total_damaged,

    /* ========================================================
       Payment breakdown
    ======================================================== */

    'payments',
    coalesce(
        (
            select jsonb_agg(
                jsonb_build_object(
                    'payment_method',
                    ps.payment_method,

                    'amount',
                    ps.amount
                )
                order by ps.amount desc
            )
            from payment_summary ps
        ),
        '[]'::jsonb
    ),

    /* ========================================================
       Products

       Sorted by sold quantity DESC so the first three are
       automatically the top sellers in React.
    ======================================================== */

    'products',
    coalesce(
        (
            select jsonb_agg(
                jsonb_build_object(
                    'product_id',
                    p.product_id,

                    'product_name',
                    p.product_name,

                    'sold',
                    p.sold,

                    'damaged',
                    p.damaged,

                    'remaining',
                    p.remaining
                )
                order by
                    p.sold desc,
                    p.product_name
            )
            from product_summary p
        ),
        '[]'::jsonb
    )

)
from summary;
$$;


ALTER FUNCTION "public"."get_sales_summary"("report_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_transaction_items_settlement_breakdown"("p_business_settlement_id" bigint DEFAULT NULL::bigint, "p_selection_mode" "text" DEFAULT 'MANUAL'::"text", "p_add_ids" bigint[] DEFAULT '{}'::bigint[], "p_remove_ids" bigint[] DEFAULT '{}'::bigint[], "p_settlement_name" "text" DEFAULT NULL::"text", "p_settlement_start" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_settlement_end" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_product_category" "text"[] DEFAULT NULL::"text"[], "p_product_name" "text"[] DEFAULT NULL::"text"[], "p_settlement_additional_selector" "jsonb" DEFAULT NULL::"jsonb", "p_group_by" "text" DEFAULT 'PRODUCT'::"text") RETURNS TABLE("product_id" bigint, "product_name" "text", "product_category" "text", "quantity" numeric, "revenue" numeric, "labor_cost" numeric, "packaging_cost" numeric, "utility_cost" numeric, "ingredient_cost" numeric, "total_cogs" numeric, "margin" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$

DECLARE
    v_transaction_item_ids BIGINT[];
BEGIN
    IF p_group_by NOT IN ('PRODUCT', 'CATEGORY') THEN
        RAISE EXCEPTION 'Invalid group_by. Expected PRODUCT or CATEGORY';
    END IF;

    -- ==========================================
    -- SELECTION DEFINITION
    -- ==========================================
    IF p_selection_mode = 'ALL' THEN
        SELECT array_agg(transaction_item_id) INTO v_transaction_item_ids
        FROM public.resolve_settlement_candidate_ids(
            p_business_settlement_id,
            p_settlement_start,
            p_settlement_end,
            p_product_category,
            p_product_name
        )
        WHERE transaction_item_id <> ALL(p_remove_ids);

    ELSIF p_selection_mode = 'CLEAR' THEN
        SELECT array_agg(transaction_item_id) INTO v_transaction_item_ids
        FROM public.transaction_items
        WHERE transaction_item_id = ANY(p_add_ids);

    ELSE -- MANUAL (and the default when only ids are supplied)
        SELECT array_agg(transaction_item_id) INTO v_transaction_item_ids
        FROM public.transaction_items ti
        WHERE (
            ti.transaction_item_id = ANY(p_add_ids)
            OR (
                p_business_settlement_id IS NOT NULL
                AND ti.business_settlement_id = p_business_settlement_id
                AND ti.transaction_item_id <> ALL(p_remove_ids)
            )
        );
    END IF;

    -- ==========================================
    -- PRODUCT BREAKDOWN (unchanged)
    -- ==========================================
    IF p_group_by = 'PRODUCT' THEN
        RETURN QUERY
        SELECT
            ti.product_id,
            p.product_name,
            p.product_category,
            SUM(ti.quantity)::NUMERIC AS quantity,
            SUM(ti.subtotal)::NUMERIC AS revenue,
            SUM(ti.unit_cost_labor * ti.quantity)::NUMERIC AS labor_cost,
            SUM(ti.unit_cost_packaging * ti.quantity)::NUMERIC AS packaging_cost,
            SUM(ti.unit_cost_utilities * ti.quantity)::NUMERIC AS utility_cost,
            SUM(ti.unit_cost_ingredient * ti.quantity)::NUMERIC AS ingredient_cost,
            SUM(ti.total_cogs)::NUMERIC AS total_cogs,
            SUM(ti.subtotal - ti.total_cogs)::NUMERIC AS margin
        FROM transaction_items ti
        LEFT JOIN products p ON p.product_id = ti.product_id
        WHERE ti.transaction_item_id = ANY(v_transaction_item_ids)
          AND ti.deleted_at IS NULL
        GROUP BY ti.product_id, p.product_name, p.product_category
        ORDER BY revenue DESC;

        RETURN;
    END IF;

    -- ==========================================
    -- CATEGORY BREAKDOWN (unchanged)
    -- ==========================================
    RETURN QUERY
    SELECT
        NULL::BIGINT AS product_id,
        NULL::TEXT AS product_name,
        p.product_category,
        SUM(ti.quantity)::NUMERIC AS quantity,
        SUM(ti.subtotal)::NUMERIC AS revenue,
        SUM(ti.unit_cost_labor * ti.quantity)::NUMERIC AS labor_cost,
        SUM(ti.unit_cost_packaging * ti.quantity)::NUMERIC AS packaging_cost,
        SUM(ti.unit_cost_utilities * ti.quantity)::NUMERIC AS utility_cost,
        SUM(ti.unit_cost_ingredient * ti.quantity)::NUMERIC AS ingredient_cost,
        SUM(ti.total_cogs)::NUMERIC AS total_cogs,
        SUM(ti.subtotal - ti.total_cogs)::NUMERIC AS margin
    FROM transaction_items ti
    LEFT JOIN products p ON p.product_id = ti.product_id
    WHERE ti.transaction_item_id = ANY(v_transaction_item_ids)
      AND ti.deleted_at IS NULL
    GROUP BY p.product_category
    ORDER BY revenue DESC;

END;
$$;


ALTER FUNCTION "public"."get_transaction_items_settlement_breakdown"("p_business_settlement_id" bigint, "p_selection_mode" "text", "p_add_ids" bigint[], "p_remove_ids" bigint[], "p_settlement_name" "text", "p_settlement_start" timestamp without time zone, "p_settlement_end" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[], "p_settlement_additional_selector" "jsonb", "p_group_by" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_transaction_items_settlement_summary"("p_business_settlement_id" bigint DEFAULT NULL::bigint, "p_selection_mode" "text" DEFAULT 'MANUAL'::"text", "p_add_ids" bigint[] DEFAULT '{}'::bigint[], "p_remove_ids" bigint[] DEFAULT '{}'::bigint[], "p_settlement_name" "text" DEFAULT NULL::"text", "p_settlement_start" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_settlement_end" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_product_category" "text"[] DEFAULT NULL::"text"[], "p_product_name" "text"[] DEFAULT NULL::"text"[]) RETURNS TABLE("sales_revenue" numeric, "sales_labor_cost" numeric, "sales_packaging_cost" numeric, "sales_utility_cost" numeric, "sales_ingredient_cost" numeric, "sales_margin" numeric, "selected_item_count" bigint, "sales_transaction_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_transaction_item_ids BIGINT[];
BEGIN
    -- ==========================================
    -- SELECTION DEFINITION
    -- ==========================================
    IF p_selection_mode = 'ALL' THEN
        SELECT array_agg(transaction_item_id) INTO v_transaction_item_ids
        FROM public.resolve_settlement_candidate_ids(
            p_business_settlement_id,
            p_settlement_start,
            p_settlement_end,
            p_product_category,
            p_product_name
        )
        WHERE transaction_item_id <> ALL(p_remove_ids);

    ELSIF p_selection_mode = 'CLEAR' THEN
        SELECT array_agg(transaction_item_id) INTO v_transaction_item_ids
        FROM public.transaction_items
        WHERE transaction_item_id = ANY(p_add_ids);

    ELSE -- MANUAL (and the default when only ids are supplied)
        SELECT array_agg(transaction_item_id) INTO v_transaction_item_ids
        FROM public.transaction_items ti
        WHERE (
            ti.transaction_item_id = ANY(p_add_ids)
            OR (
                p_business_settlement_id IS NOT NULL
                AND ti.business_settlement_id = p_business_settlement_id
                AND ti.transaction_item_id <> ALL(p_remove_ids)
            )
        );
    END IF;



    RETURN QUERY

SELECT
    COALESCE(SUM(ti.subtotal), 0) AS sales_revenue,
    COALESCE(SUM(ti.unit_cost_labor * ti.quantity), 0) AS sales_labor_cost,
    COALESCE(SUM(ti.unit_cost_packaging * ti.quantity), 0) AS sales_packaging_cost,
    COALESCE(SUM(ti.unit_cost_utilities * ti.quantity), 0) AS sales_utility_cost,
    COALESCE(SUM(ti.unit_cost_ingredient * ti.quantity), 0) AS sales_ingredient_cost,
    COALESCE(SUM(ti.subtotal - ti.total_cogs), 0) AS sales_margin,
    COUNT(*) AS selected_item_count,
	COUNT(DISTINCT ti.transaction_id)AS sales_transaction_count
FROM transaction_items ti
WHERE ti.transaction_item_id = ANY(v_transaction_item_ids)
  AND ti.deleted_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."get_transaction_items_settlement_summary"("p_business_settlement_id" bigint, "p_selection_mode" "text", "p_add_ids" bigint[], "p_remove_ids" bigint[], "p_settlement_name" "text", "p_settlement_start" timestamp without time zone, "p_settlement_end" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_transactions"("p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 20, "p_search" "text" DEFAULT NULL::"text", "p_start_date" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_end_date" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_cashier" "text" DEFAULT NULL::"text", "p_min_amount" numeric DEFAULT NULL::numeric, "p_max_amount" numeric DEFAULT NULL::numeric, "p_payment_method" "text" DEFAULT NULL::"text") RETURNS TABLE("transaction_id" bigint, "transaction_code" "text", "transaction_time" timestamp without time zone, "payment_method" "text", "transaction_amount" numeric, "created_at" timestamp without time zone, "updated_at" timestamp without time zone, "cashier" "text", "items" "jsonb", "total_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
    WITH filtered_transactions AS (
        SELECT
            t.*
        FROM transactions t
        WHERE t.deleted_at IS NULL

        -- ==========================================
        -- SEARCH
        -- ==========================================
        AND (
            p_search IS NULL
            OR p_search = ''
            OR t.transaction_code ILIKE '%' || p_search || '%'
            OR t.cashier ILIKE '%' || p_search || '%'
            OR t.payment_method ILIKE '%' || p_search || '%'

            -- Search product name
            OR EXISTS (
                SELECT 1
                FROM transaction_items ti
                JOIN products p
                    ON p.product_id = ti.product_id
                WHERE ti.transaction_id = t.transaction_id
                  AND ti.deleted_at IS NULL
                  AND p.product_name ILIKE '%' || p_search || '%'
            )
        )

        -- ==========================================
        -- DATE RANGE
        -- ==========================================
        AND (
            p_start_date IS NULL
            OR t.transaction_time >= p_start_date
        )

        AND (
            p_end_date IS NULL
            OR t.transaction_time < p_end_date
        )

        -- ==========================================
        -- CASHIER
        -- ==========================================
        AND (
            p_cashier IS NULL
            OR p_cashier = ''
            OR t.cashier = p_cashier
        )

        -- ==========================================
        -- PAYMENT METHOD
        -- ==========================================
        AND (
            p_payment_method IS NULL
            OR p_payment_method = ''
            OR t.payment_method = p_payment_method
        )

        -- ==========================================
        -- AMOUNT
        -- ==========================================
        AND (
            p_min_amount IS NULL
            OR t.transaction_amount >= p_min_amount
        )

        AND (
            p_max_amount IS NULL
            OR t.transaction_amount <= p_max_amount
        )
    ),

    paginated_transactions AS (
        SELECT
            ft.*,
            COUNT(*) OVER() AS total_count
        FROM filtered_transactions ft
        ORDER BY
            ft.transaction_time DESC,
            ft.transaction_id DESC
        LIMIT p_page_size
        OFFSET (p_page - 1) * p_page_size
    )

    SELECT
        pt.transaction_id,
        pt.transaction_code,
        pt.transaction_time,
        pt.payment_method,
        pt.transaction_amount,
        pt.created_at,
        pt.updated_at,
        pt.cashier,

        -- ==========================================
        -- TRANSACTION ITEMS
        -- ==========================================
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'transaction_item_id', ti.transaction_item_id,
                        'transaction_id', ti.transaction_id,
                        'product_id', ti.product_id,
                        'product_name', p.product_name,
                        'quantity', ti.quantity,
                        'unit_price', ti.unit_price,
                        'subtotal', ti.subtotal,
                        'created_at', ti.created_at,
                        'updated_at', ti.updated_at
                    )
                    ORDER BY ti.transaction_item_id
                )
                FROM transaction_items ti
                LEFT JOIN products p
                    ON p.product_id = ti.product_id
                WHERE ti.transaction_id = pt.transaction_id
                  AND ti.deleted_at IS NULL
            ),
            '[]'::jsonb
        ) AS items,

        pt.total_count

    FROM paginated_transactions pt
    ORDER BY
        pt.transaction_time DESC,
        pt.transaction_id DESC;
$$;


ALTER FUNCTION "public"."get_transactions"("p_page" integer, "p_page_size" integer, "p_search" "text", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_cashier" "text", "p_min_amount" numeric, "p_max_amount" numeric, "p_payment_method" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    insert into public.app_users (
        user_id,
        email,
        username
    )
    values (
        new.id,
        new.email,
        new.raw_user_meta_data ->> 'username'
    );

    return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_username_available"("p_username" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select not exists (
        select 1
        from public.app_users
        where lower(username) = lower(trim(p_username))
    );
$$;


ALTER FUNCTION "public"."is_username_available"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_settlement_candidate_ids"("p_business_settlement_id" bigint DEFAULT NULL::bigint, "p_start_date" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_end_date" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_product_category" "text"[] DEFAULT NULL::"text"[], "p_product_name" "text"[] DEFAULT NULL::"text"[]) RETURNS TABLE("transaction_item_id" bigint)
    LANGUAGE "sql" STABLE
    AS $$
    SELECT ti.transaction_item_id
    FROM public.transaction_items ti
    JOIN public.transactions t 
		ON t.transaction_id = ti.transaction_id
    LEFT JOIN public.products p 
		ON p.product_id = ti.product_id
    WHERE (
		ti.business_settlement_id IS NULL 
		OR ti.business_settlement_id = p_business_settlement_id)
      AND (p_start_date IS NULL 
		OR t.transaction_time >= p_start_date)
      AND (p_end_date IS NULL 
		OR t.transaction_time < p_end_date)
      AND (p_product_name IS NULL 
		OR p.product_name = ANY(p_product_name))
      AND (p_product_category IS NULL 
		OR p.product_category = ANY(p_product_category))
$$;


ALTER FUNCTION "public"."resolve_settlement_candidate_ids"("p_business_settlement_id" bigint, "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_order_item_ready_override"("p_order_item_id" bigint, "p_value" boolean) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_product_id bigint;
    v_order_id bigint;
    v_quantity integer;
    v_status text;

    v_stock integer;
    v_reserved_priority bigint;
BEGIN
    SELECT
        oi.product_id,
        oi.order_id,
        oi.quantity_ordered,
        o.status
    INTO
        v_product_id,
        v_order_id,
        v_quantity,
        v_status

    FROM public.order_items oi

    INNER JOIN public.orders o
        ON o.order_id = oi.order_id

    WHERE oi.order_item_id = p_order_item_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Order item % does not exist',
            p_order_item_id;
    END IF;

    IF v_status NOT IN ('pending', 'delivered') THEN
        RAISE EXCEPTION
            'Cannot change readiness of an order item belonging to a % order',
            v_status;
    END IF;

    -- Clearing the override.
    IF p_value IS NULL THEN

        UPDATE public.order_items
        SET is_ready_override = NULL
        WHERE order_item_id = p_order_item_id;

        RETURN TRUE;
    END IF;

    -- Explicitly marking as not ready.
    IF p_value = FALSE THEN

        UPDATE public.order_items
        SET is_ready_override = FALSE
        WHERE order_item_id = p_order_item_id;

        RETURN TRUE;
    END IF;

    /*
     * TRUE override:
     *
     * Lock the stock row so that another stock-changing operation
     * cannot modify the available stock while we validate this.
     */
    SELECT ps.stock_quantity
    INTO v_stock
    FROM public.product_stock ps
    WHERE ps.product_id = v_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Stock record does not exist for product %',
            v_product_id;
    END IF;

    /*
     * Every other TRUE override has priority before normal FIFO.
     * The requested item itself is excluded from this sum.
     */
    SELECT COALESCE(SUM(oi.quantity_ordered), 0)
    INTO v_reserved_priority

    FROM public.order_items oi

    INNER JOIN public.orders o
        ON o.order_id = oi.order_id

    WHERE oi.product_id = v_product_id
      AND oi.order_item_id <> p_order_item_id
      AND oi.is_ready_override = TRUE
      AND o.status IN ('pending', 'delivered');

    IF v_reserved_priority + v_quantity > v_stock THEN
        RAISE EXCEPTION
            'Order item % cannot be marked ready: required quantity % exceeds available stock after existing priority allocations (%)',
            p_order_item_id,
            v_quantity,
            v_stock - v_reserved_priority;
    END IF;

    UPDATE public.order_items
    SET is_ready_override = TRUE
    WHERE order_item_id = p_order_item_id;

    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."set_order_item_ready_override"("p_order_item_id" bigint, "p_value" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_products"() RETURNS TABLE("action" "text", "product_id" bigint, "product_code" "text", "product_name" "text", "product_category" "text", "product_price" numeric, "product_image" "text", "is_active" boolean, "description" "text", "created_at" timestamp without time zone, "updated_at" timestamp without time zone, "deleted_at" timestamp without time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
	IF NOT EXISTS (
	    SELECT 1
	    FROM staging.product_sync
	) THEN
	    RETURN;
	END IF;

    CREATE TEMP TABLE sync_changes (
        action text,
        product_id bigint,
        product_code text,
        product_name text,
        product_category text,
        product_price numeric,
        product_image text,
        is_active boolean,
        description text,
        created_at timestamp without time zone,
        updated_at timestamp without time zone,
        deleted_at timestamp without time zone
    ) ON COMMIT DROP;


    /*
     * DELETE
     */
    WITH deleted AS (
        UPDATE public.products p
        SET deleted_at = now()
        WHERE p.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM staging.product_sync s
              WHERE s.product_id = p.product_id
          )
        RETURNING
            p.product_id,
            p.product_code,
            p.product_name,
            p.product_category,
            p.product_price,
            p.product_image,
            p.is_active,
            p.description,
            p.created_at,
            p.updated_at,
            p.deleted_at
    )
    INSERT INTO sync_changes
    SELECT
        'DELETE',
        d.product_id,
        d.product_code,
        d.product_name,
        d.product_category,
        d.product_price,
        d.product_image,
        d.is_active,
        d.description,
        d.created_at,
        d.updated_at,
        d.deleted_at
    FROM deleted d;


    /*
     * UPDATE
     */
    WITH updated AS (
        UPDATE public.products p
        SET
            product_code = s.product_code,
            product_name = s.product_name,
            product_category = s.product_category,
            product_price = s.product_price,
            product_image = s.product_image,
            is_active = s.is_active,
            description = s.description,
            deleted_at = NULL
        FROM staging.product_sync s
        WHERE s.product_id = p.product_id
          AND (
              p.product_code IS DISTINCT FROM s.product_code
              OR p.product_name IS DISTINCT FROM s.product_name
              OR p.product_category IS DISTINCT FROM s.product_category
              OR p.product_price IS DISTINCT FROM s.product_price
              OR p.product_image IS DISTINCT FROM s.product_image
              OR p.is_active IS DISTINCT FROM s.is_active
              OR p.description IS DISTINCT FROM s.description
              OR p.deleted_at IS NOT NULL
          )
        RETURNING
            p.product_id,
            p.product_code,
            p.product_name,
            p.product_category,
            p.product_price,
            p.product_image,
            p.is_active,
            p.description,
            p.created_at,
            p.updated_at,
            p.deleted_at
    )
    INSERT INTO sync_changes
    SELECT
        'UPDATE',
        u.product_id,
        u.product_code,
        u.product_name,
        u.product_category,
        u.product_price,
        u.product_image,
        u.is_active,
        u.description,
        u.created_at,
        u.updated_at,
        u.deleted_at
    FROM updated u;


    /*
     * INSERT
     */
    /*
     * INSERT
     */
    WITH inserted AS (
        INSERT INTO public.products as p (
            product_code,
            product_name,
            product_category,
            product_price,
            product_image,
            is_active,
            description
        )
        SELECT
            s.product_code,
            s.product_name,
            s.product_category,
            s.product_price,
            s.product_image,
            s.is_active,
            s.description
        FROM staging.product_sync s
        WHERE s.product_id IS NULL
        RETURNING
            p.product_id,
            p.product_code,
            p.product_name,
            p.product_category,
            p.product_price,
            p.product_image,
            p.is_active,
            p.description,
            p.created_at,
            p.updated_at,
            p.deleted_at
    )
    INSERT INTO sync_changes
    SELECT
        'INSERT',
        i.product_id,
        i.product_code,
        i.product_name,
        i.product_category,
        i.product_price,
        i.product_image,
        i.is_active,
        i.description,
        i.created_at,
        i.updated_at,
        i.deleted_at
    FROM inserted i;

	TRUNCATE TABLE staging.product_sync;
    /*
     * Return only records that changed.
     */
    RETURN QUERY
    SELECT
        c.action,
        c.product_id,
        c.product_code,
        c.product_name,
        c.product_category,
        c.product_price,
        c.product_image,
        c.is_active,
        c.description,
        c.created_at,
        c.updated_at,
        c.deleted_at
    FROM sync_changes c
    ORDER BY
        CASE c.action
            WHEN 'DELETE' THEN 1
            WHEN 'UPDATE' THEN 2
            WHEN 'INSERT' THEN 3
        END,
        c.product_id;
END;
$$;


ALTER FUNCTION "public"."sync_products"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_app_users_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


ALTER FUNCTION "public"."update_app_users_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_settlement_expense" (
    "business_settlement_expense_id" bigint NOT NULL,
    "business_settlement_id" bigint NOT NULL,
    "business_expense_id" bigint NOT NULL,
    "allocated_amount" numeric NOT NULL,
    "allocation_note" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone,
    "updated_by" "uuid",
    "deleted_at" timestamp without time zone,
    "deleted_by" "uuid",
    CONSTRAINT "business_settlement_expense_allocated_amount_check" CHECK (("allocated_amount" >= (0)::numeric))
);


ALTER TABLE "public"."business_settlement_expense" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_business_settlement_expenses"("p_business_settlement_id" bigint, "p_expenses" "jsonb") RETURNS SETOF "public"."business_settlement_expense"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_status TEXT;
    v_expense RECORD;
    v_total_allocated NUMERIC;
BEGIN

    -- Validate settlement
    SELECT settlement_status
    INTO v_status
    FROM public.business_settlement
    WHERE business_settlement_id = p_business_settlement_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business settlement not found';
    END IF;

    IF v_status <> 'DRAFT' THEN
        RAISE EXCEPTION
            'Only DRAFT settlements can have expenses changed';
    END IF;


    -- Validate each requested allocation
    FOR v_expense IN
        SELECT
            (x->>'business_expense_id')::BIGINT AS business_expense_id,
            (x->>'allocated_amount')::NUMERIC AS allocated_amount
        FROM jsonb_array_elements(
            COALESCE(p_expenses, '[]'::JSONB)
        ) AS x
    LOOP

        IF v_expense.allocated_amount < 0 THEN
            RAISE EXCEPTION
                'Allocated amount cannot be negative';
        END IF;


        -- Check expense exists
        IF NOT EXISTS (
            SELECT 1
            FROM public.business_expense
            WHERE business_expense_id =
                    v_expense.business_expense_id
              AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION
                'Business expense % not found',
                v_expense.business_expense_id;
        END IF;


        -- Check allocation does not exceed total expense
        SELECT COALESCE(SUM(bse.allocated_amount), 0)
        INTO v_total_allocated
        FROM public.business_settlement_expense bse
        WHERE bse.business_expense_id =
                v_expense.business_expense_id
          AND bse.business_settlement_id <>
                p_business_settlement_id
          AND bse.deleted_at IS NULL;


        IF v_total_allocated + v_expense.allocated_amount >
           (
               SELECT expense_amount
               FROM public.business_expense
               WHERE business_expense_id =
                       v_expense.business_expense_id
           )
        THEN
            RAISE EXCEPTION
                'Allocation for expense % exceeds available amount',
                v_expense.business_expense_id;
        END IF;

    END LOOP;


    -- Remove current allocations
    UPDATE public.business_settlement_expense
    SET
        deleted_at = now()
    WHERE business_settlement_id = p_business_settlement_id
      AND deleted_at IS NULL;


    -- Insert new allocations
    INSERT INTO public.business_settlement_expense (
        business_settlement_id,
        business_expense_id,
        allocated_amount
    )
    SELECT
        p_business_settlement_id,
        (x->>'business_expense_id')::BIGINT,
        (x->>'allocated_amount')::NUMERIC
    FROM jsonb_array_elements(
        COALESCE(p_expenses, '[]'::JSONB)
    ) AS x
    WHERE (x->>'allocated_amount')::NUMERIC > 0;


    -- Return the new allocations
    RETURN QUERY
    SELECT *
    FROM public.business_settlement_expense
    WHERE business_settlement_id = p_business_settlement_id
      AND deleted_at IS NULL;

END;
$$;


ALTER FUNCTION "public"."update_business_settlement_expenses"("p_business_settlement_id" bigint, "p_expenses" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_business_settlement_result"("p_business_settlement_id" bigint, "p_settled_labor_cost" numeric, "p_settled_packaging_cost" numeric, "p_settled_utility_cost" numeric, "p_settled_ingredient_cost" numeric, "p_profit_retained" numeric, "p_profit_distributed" numeric, "p_deficit_covered" numeric) RETURNS "public"."business_settlement"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_settlement public.business_settlement;
    v_other_expenses NUMERIC;
    v_total_settlement NUMERIC;
BEGIN

    SELECT *
    INTO v_settlement
    FROM public.business_settlement
    WHERE business_settlement_id = p_business_settlement_id
      AND deleted_at IS NULL
    FOR UPDATE;


    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business settlement not found';
    END IF;


    IF v_settlement.settlement_status <> 'DRAFT' THEN
        RAISE EXCEPTION
            'Only DRAFT settlements can be edited';
    END IF;


    -- Validate negative values
    IF p_settled_labor_cost < 0
       OR p_settled_packaging_cost < 0
       OR p_settled_utility_cost < 0
       OR p_settled_ingredient_cost < 0
       OR p_profit_retained < 0
       OR p_profit_distributed < 0
       OR p_deficit_covered < 0 THEN

        RAISE EXCEPTION
            'Settlement amounts cannot be negative';

    END IF;


    /*
     * TEAM + OTHER expenses are treated as
     * additional expenses.
     */
    SELECT COALESCE(SUM(bse.allocated_amount), 0)
    INTO v_other_expenses
    FROM public.business_settlement_expense bse
    JOIN public.business_expense be
        ON be.business_expense_id = bse.business_expense_id
    WHERE bse.business_settlement_id = p_business_settlement_id
      AND bse.deleted_at IS NULL
      AND be.deleted_at IS NULL
      AND be.expense_category IN ('TEAM', 'OTHER');


    /*
     * Final reconciliation.
     */
    v_total_settlement :=
        p_settled_labor_cost
        + p_settled_packaging_cost
        + p_settled_utility_cost
        + p_settled_ingredient_cost
        + v_other_expenses
        + p_profit_retained
        + p_profit_distributed;


    IF v_settlement.sales_revenue + p_deficit_covered
       <> v_total_settlement THEN

        RAISE EXCEPTION
            'Settlement does not balance. Revenue + deficit = %, settlement total = %',
            v_settlement.sales_revenue + p_deficit_covered,
            v_total_settlement;

    END IF;


    UPDATE public.business_settlement
    SET
        settled_labor_cost = p_settled_labor_cost,
        settled_packaging_cost = p_settled_packaging_cost,
        settled_utility_cost = p_settled_utility_cost,
        settled_ingredient_cost = p_settled_ingredient_cost,

        total_other_expenses = v_other_expenses,

        profit_retained = p_profit_retained,
        profit_distributed = p_profit_distributed,
        deficit_covered = p_deficit_covered,

        updated_at = now()

    WHERE business_settlement_id = p_business_settlement_id

    RETURNING * INTO v_settlement;


    RETURN v_settlement;

END;
$$;


ALTER FUNCTION "public"."update_business_settlement_result"("p_business_settlement_id" bigint, "p_settled_labor_cost" numeric, "p_settled_packaging_cost" numeric, "p_settled_utility_cost" numeric, "p_settled_ingredient_cost" numeric, "p_profit_retained" numeric, "p_profit_distributed" numeric, "p_deficit_covered" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_business_settlement_selection"("p_business_settlement_id" bigint, "p_selection_mode" "text", "p_add_ids" bigint[] DEFAULT '{}'::bigint[], "p_remove_ids" bigint[] DEFAULT '{}'::bigint[], "p_settlement_name" "text" DEFAULT NULL::"text", "p_settlement_start" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_settlement_end" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_product_category" "text"[] DEFAULT NULL::"text"[], "p_product_name" "text"[] DEFAULT NULL::"text"[], "p_settlement_additional_selector" "jsonb" DEFAULT NULL::"jsonb") RETURNS "public"."business_settlement"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_settlement_status TEXT;
    v_settlement public.business_settlement;
BEGIN
    SELECT settlement_status 
	INTO v_settlement_status
    FROM public.business_settlement
    WHERE business_settlement_id = p_business_settlement_id 
	AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND 
		THEN RAISE EXCEPTION 'Business settlement not found'; END IF;
    IF v_settlement_status <> 'DRAFT' 
		THEN RAISE EXCEPTION 'Only DRAFT settlements can have their selection changed';
    END IF;

    IF p_selection_mode = 'MANUAL' THEN
        UPDATE public.transaction_items 
			SET business_settlement_id = NULL
        WHERE business_settlement_id = p_business_settlement_id
			AND transaction_item_id = ANY(p_remove_ids);

        IF EXISTS (
            SELECT 1 FROM public.transaction_items
            WHERE transaction_item_id = ANY(p_add_ids)
				AND business_settlement_id IS NOT NULL
				AND business_settlement_id <> p_business_settlement_id
        ) THEN
			RAISE EXCEPTION 'One or more transaction items already belong to another settlement';
        END IF;

		UPDATE public.transaction_items 
			SET business_settlement_id = p_business_settlement_id
		WHERE transaction_item_id = ANY(p_add_ids);

	ELSIF p_selection_mode = 'ALL' THEN
        UPDATE public.transaction_items 
			SET business_settlement_id = NULL
        WHERE business_settlement_id = p_business_settlement_id
			AND transaction_item_id NOT IN (
			SELECT transaction_item_id 
			FROM public.resolve_settlement_candidate_ids(
				p_business_settlement_id,
                p_settlement_start, 
				p_settlement_end,
                p_product_category, 
				p_product_name
              ) WHERE transaction_item_id <> ALL(p_remove_ids)
          );

        UPDATE public.transaction_items SET business_settlement_id = p_business_settlement_id
        WHERE transaction_item_id IN (
            SELECT transaction_item_id FROM public.resolve_settlement_candidate_ids(
                p_business_settlement_id,
                p_settlement_start, 
				p_settlement_end,
                p_product_category, 
				p_product_name
            ) WHERE transaction_item_id <> ALL(p_remove_ids)
        );
	
	ELSIF p_selection_mode = 'CLEAR' THEN
		UPDATE public.transaction_items 
			SET business_settlement_id = NULL
        WHERE business_settlement_id = p_business_settlement_id
			AND transaction_item_id <> ALL(p_add_ids);

        IF EXISTS (
            SELECT 1 FROM public.transaction_items
            WHERE transaction_item_id = ANY(p_add_ids)
				AND business_settlement_id IS NOT NULL
				AND business_settlement_id <> p_business_settlement_id
        ) THEN
            RAISE EXCEPTION 'One or more transaction items already belong to another settlement';
        END IF;

        UPDATE public.transaction_items 
			SET business_settlement_id = p_business_settlement_id
        WHERE transaction_item_id = ANY(p_add_ids);
    END IF;

    -- snapshot recalculation: unchanged from your existing function
	UPDATE public.business_settlement bs
	SET
	    settlement_name = COALESCE(p_settlement_name, bs.settlement_name),
	    sales_revenue = COALESCE((SELECT SUM(ti.subtotal) FROM public.transaction_items ti WHERE ti.business_settlement_id = bs.business_settlement_id), 0),
	    sales_labor_cost = COALESCE((SELECT SUM(ti.unit_cost_labor * ti.quantity) FROM public.transaction_items ti WHERE ti.business_settlement_id = bs.business_settlement_id), 0),
	    sales_packaging_cost = COALESCE((SELECT SUM(ti.unit_cost_packaging * ti.quantity) FROM public.transaction_items ti WHERE ti.business_settlement_id = bs.business_settlement_id), 0),
	    sales_utility_cost = COALESCE((SELECT SUM(ti.unit_cost_utilities * ti.quantity) FROM public.transaction_items ti WHERE ti.business_settlement_id = bs.business_settlement_id), 0),
	    sales_ingredient_cost = COALESCE((SELECT SUM(ti.unit_cost_ingredient * ti.quantity) FROM public.transaction_items ti WHERE ti.business_settlement_id = bs.business_settlement_id), 0),
	    sales_margin = COALESCE((SELECT SUM(ti.subtotal - ti.total_cogs) FROM public.transaction_items ti WHERE ti.business_settlement_id = bs.business_settlement_id), 0),
	    settlement_start = COALESCE(p_settlement_start, bs.settlement_start),
	    settlement_end = COALESCE(p_settlement_end, bs.settlement_end),
	    settlement_additional_selector = COALESCE(p_settlement_additional_selector, bs.settlement_additional_selector),
	    updated_at = now()
	WHERE bs.business_settlement_id = p_business_settlement_id
	RETURNING * INTO v_settlement;

    RETURN v_settlement;
END;
$$;


ALTER FUNCTION "public"."update_business_settlement_selection"("p_business_settlement_id" bigint, "p_selection_mode" "text", "p_add_ids" bigint[], "p_remove_ids" bigint[], "p_settlement_name" "text", "p_settlement_start" timestamp without time zone, "p_settlement_end" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[], "p_settlement_additional_selector" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_business_settlement_status"("p_business_settlement_id" bigint, "p_settlement_status" "text") RETURNS "public"."business_settlement"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_settlement public.business_settlement;
BEGIN

    SELECT *
    INTO v_settlement
    FROM public.business_settlement
    WHERE business_settlement_id = p_business_settlement_id
      AND deleted_at IS NULL
    FOR UPDATE;


    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business settlement not found';
    END IF;


    IF p_settlement_status NOT IN (
        'DRAFT',
        'CONFIRMED',
        'SETTLED'
    ) THEN
        RAISE EXCEPTION
            'Invalid settlement status';
    END IF;


    /*
     * SETTLED is final.
     */
    IF v_settlement.settlement_status = 'SETTLED' THEN
        RAISE EXCEPTION
            'A SETTLED settlement cannot be changed';
    END IF;


    /*
     * Confirmation requires a complete balanced result.
     */
    IF p_settlement_status = 'CONFIRMED' THEN

        IF v_settlement.settled_labor_cost IS NULL
           OR v_settlement.settled_packaging_cost IS NULL
           OR v_settlement.settled_utility_cost IS NULL
           OR v_settlement.settled_ingredient_cost IS NULL THEN

            RAISE EXCEPTION
                'Settlement result is incomplete';
        END IF;


        IF v_settlement.sales_revenue
           + COALESCE(v_settlement.deficit_covered, 0)
           <>
           v_settlement.settled_labor_cost
           + v_settlement.settled_packaging_cost
           + v_settlement.settled_utility_cost
           + v_settlement.settled_ingredient_cost
           + COALESCE(v_settlement.total_other_expenses, 0)
           + COALESCE(v_settlement.profit_retained, 0)
           + COALESCE(v_settlement.profit_distributed, 0)
        THEN
            RAISE EXCEPTION
                'Settlement does not balance';
        END IF;

    END IF;


    /*
     * SETTLED can only happen after CONFIRMED.
     */
    IF p_settlement_status = 'SETTLED'
       AND v_settlement.settlement_status <> 'CONFIRMED' THEN

        RAISE EXCEPTION
            'Only CONFIRMED settlements can become SETTLED';
    END IF;


    UPDATE public.business_settlement
    SET
        settlement_status = p_settlement_status,
        updated_at = now()

    WHERE business_settlement_id = p_business_settlement_id

    RETURNING * INTO v_settlement;


    RETURN v_settlement;

END;
$$;


ALTER FUNCTION "public"."update_business_settlement_status"("p_business_settlement_id" bigint, "p_settlement_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_order_status"("p_order_id" bigint, "p_status" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_current_status text;
BEGIN
    IF p_status NOT IN ('delivered', 'cancelled') THEN
        RAISE EXCEPTION
            'Invalid target status: %. Only delivered or cancelled are allowed',
            p_status;
    END IF;

    SELECT status
    INTO v_current_status
    FROM public.orders
    WHERE order_id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Order % does not exist',
            p_order_id;
    END IF;

    IF v_current_status NOT IN ('pending', 'delivered') THEN
        RAISE EXCEPTION
            'Cannot change status of a % order',
            v_current_status;
    END IF;

    IF v_current_status = 'delivered'
       AND p_status = 'delivered' THEN
        RETURN TRUE;
    END IF;

    UPDATE public.orders
    SET status = p_status
    WHERE order_id = p_order_id;

    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."update_order_status"("p_order_id" bigint, "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_transaction_item_costs"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.transaction_items ti
  SET 
    unit_cost_ingredient = p.cost_ingredient,
    unit_cost_labor = p.cost_labor,
    unit_cost_utilities = p.cost_utilities,
    unit_cost_packaging = p.cost_packaging
  FROM public.products p 
  WHERE p.product_id = ti.product_id
  AND (
    ti.unit_cost_ingredient <> p.cost_ingredient 
    OR ti.unit_cost_labor <> p.cost_labor
    OR ti.unit_cost_utilities <> p.cost_utilities
    OR ti.unit_cost_packaging <> p.cost_packaging
  );
END;
$$;


ALTER FUNCTION "public"."update_transaction_item_costs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_users" (
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "username" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."app_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_expense" (
    "business_expense_id" bigint NOT NULL,
    "expense_type" "text" NOT NULL,
    "expense_category" "text" NOT NULL,
    "expense_amount" numeric NOT NULL,
    "expense_description" "text",
    "expense_time" timestamp without time zone DEFAULT "now"() NOT NULL,
    "expense_reference" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone,
    "updated_by" "uuid",
    "deleted_at" timestamp without time zone,
    "deleted_by" "uuid",
    CONSTRAINT "business_expense_expense_amount_check" CHECK (("expense_amount" >= (0)::numeric)),
    CONSTRAINT "business_expense_expense_category_check" CHECK (("expense_category" = ANY (ARRAY['INGREDIENT'::"text", 'PACKAGING'::"text", 'UTILITY'::"text", 'LABOR'::"text", 'TEAM'::"text", 'OTHER'::"text"]))),
    CONSTRAINT "business_expense_expense_type_check" CHECK (("expense_type" = ANY (ARRAY['PURCHASE'::"text", 'DIRECT_EXPENSE'::"text"])))
);


ALTER TABLE "public"."business_expense" OWNER TO "postgres";


ALTER TABLE "public"."business_expense" ALTER COLUMN "business_expense_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."business_expense_business_expense_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."business_expense_summary" AS
 SELECT "be"."business_expense_id",
    "be"."expense_type",
    "be"."expense_category",
    "be"."expense_amount",
    "be"."expense_description",
    "be"."expense_time",
    "be"."expense_reference",
    "be"."created_at",
    "be"."updated_at",
    COALESCE("sum"("bse"."allocated_amount"), (0)::numeric) AS "allocated_amount",
    ("be"."expense_amount" - COALESCE("sum"("bse"."allocated_amount"), (0)::numeric)) AS "remaining_amount",
        CASE
            WHEN (COALESCE("sum"("bse"."allocated_amount"), (0)::numeric) = (0)::numeric) THEN 'UNSETTLED'::"text"
            WHEN (COALESCE("sum"("bse"."allocated_amount"), (0)::numeric) < "be"."expense_amount") THEN 'PARTIALLY_SETTLED'::"text"
            ELSE 'SETTLED'::"text"
        END AS "settlement_status"
   FROM ("public"."business_expense" "be"
     LEFT JOIN "public"."business_settlement_expense" "bse" ON ((("bse"."business_expense_id" = "be"."business_expense_id") AND ("bse"."deleted_at" IS NULL))))
  WHERE ("be"."deleted_at" IS NULL)
  GROUP BY "be"."business_expense_id", "be"."expense_type", "be"."expense_category", "be"."expense_amount", "be"."expense_description", "be"."expense_time", "be"."expense_reference", "be"."created_at", "be"."updated_at";


ALTER VIEW "public"."business_expense_summary" OWNER TO "postgres";


ALTER TABLE "public"."business_settlement" ALTER COLUMN "business_settlement_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."business_settlement_business_settlement_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "order_item_id" bigint NOT NULL,
    "order_id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "quantity_ordered" integer NOT NULL,
    "unit_price" numeric NOT NULL,
    "unit_cost_labor" numeric DEFAULT 0 NOT NULL,
    "unit_cost_ingredient" numeric DEFAULT 0 NOT NULL,
    "unit_cost_utilities" numeric DEFAULT 0 NOT NULL,
    "unit_cost_packaging" numeric DEFAULT 0 NOT NULL,
    "is_ready_override" boolean,
    CONSTRAINT "order_items_quantity_positive" CHECK (("quantity_ordered" > 0)),
    CONSTRAINT "order_items_unit_cost_ingredient_non_negative" CHECK (("unit_cost_ingredient" >= (0)::numeric)),
    CONSTRAINT "order_items_unit_cost_labor_non_negative" CHECK (("unit_cost_labor" >= (0)::numeric)),
    CONSTRAINT "order_items_unit_cost_packaging_non_negative" CHECK (("unit_cost_packaging" >= (0)::numeric)),
    CONSTRAINT "order_items_unit_cost_utilities_non_negative" CHECK (("unit_cost_utilities" >= (0)::numeric)),
    CONSTRAINT "order_items_unit_price_non_negative" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "order_id" bigint NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_address" "text",
    "due_date" "date" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'delivered'::"text", 'paid'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_stock" (
    "product_id" bigint NOT NULL,
    "stock_quantity" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_stock_quantity_non_negative" CHECK (("stock_quantity" >= 0))
);


ALTER TABLE "public"."product_stock" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."order_item_readiness" AS
 WITH "open_items" AS (
         SELECT "oi"."order_item_id",
            "oi"."order_id",
            "oi"."product_id",
            "oi"."quantity_ordered",
            "oi"."is_ready_override",
            "o"."due_date",
            "o"."created_at",
            "ps"."stock_quantity",
                CASE
                    WHEN ("oi"."is_ready_override" = true) THEN 0
                    ELSE 1
                END AS "priority_group"
           FROM (("public"."order_items" "oi"
             JOIN "public"."orders" "o" ON (("o"."order_id" = "oi"."order_id")))
             JOIN "public"."product_stock" "ps" ON (("ps"."product_id" = "oi"."product_id")))
          WHERE ("o"."status" = ANY (ARRAY['pending'::"text", 'delivered'::"text"]))
        ), "allocated" AS (
         SELECT "oi"."order_item_id",
            "oi"."order_id",
            "oi"."product_id",
            "oi"."quantity_ordered",
            "oi"."is_ready_override",
            "oi"."due_date",
            "oi"."created_at",
            "oi"."stock_quantity",
            "oi"."priority_group",
            "sum"("oi"."quantity_ordered") OVER (PARTITION BY "oi"."product_id" ORDER BY "oi"."priority_group", "oi"."due_date", "oi"."created_at", "oi"."order_id", "oi"."order_item_id" ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS "running_quantity"
           FROM "open_items" "oi"
        )
 SELECT "order_item_id",
    "order_id",
    "product_id",
    "quantity_ordered",
    "is_ready_override",
    "stock_quantity",
    ("running_quantity" <= "stock_quantity") AS "computed_is_ready",
    COALESCE("is_ready_override", ("running_quantity" <= "stock_quantity")) AS "is_ready",
    "running_quantity"
   FROM "allocated";


ALTER VIEW "public"."order_item_readiness" OWNER TO "postgres";


ALTER TABLE "public"."order_items" ALTER COLUMN "order_item_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."order_items_order_item_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."orders" ALTER COLUMN "order_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."orders_order_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."products" (
    "product_id" bigint NOT NULL,
    "product_code" "text" NOT NULL,
    "product_price" numeric NOT NULL,
    "product_category" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp without time zone,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "product_name" "text" NOT NULL,
    "cost_ingredient" numeric DEFAULT 0 NOT NULL,
    "cost_labor" numeric DEFAULT 0 NOT NULL,
    "cost_utilities" numeric DEFAULT 0 NOT NULL,
    "cost_packaging" numeric DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."products" OWNER TO "postgres";


ALTER TABLE "public"."products" ALTER COLUMN "product_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."products_product_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."stock_adjustments" (
    "stock_adjustment_id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "quantity" integer NOT NULL,
    "adjustment_type" "text" NOT NULL,
    "note" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stock_adjustments_quantity_not_zero" CHECK (("quantity" <> 0)),
    CONSTRAINT "stock_adjustments_type_check" CHECK (("adjustment_type" = ANY (ARRAY['RESTOCK'::"text", 'DAMAGE'::"text", 'STOCK_COUNT'::"text", 'CORRECTION'::"text"])))
);


ALTER TABLE "public"."stock_adjustments" OWNER TO "postgres";


ALTER TABLE "public"."stock_adjustments" ALTER COLUMN "stock_adjustment_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."stock_adjustments_stock_adjustment_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."transaction_items" (
    "transaction_item_id" bigint NOT NULL,
    "transaction_id" bigint NOT NULL,
    "product_id" bigint NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp without time zone,
    "unit_cost_labor" numeric DEFAULT 0 NOT NULL,
    "unit_cost_ingredient" numeric DEFAULT 0 NOT NULL,
    "unit_cost_utilities" numeric DEFAULT 0 NOT NULL,
    "unit_cost_packaging" numeric DEFAULT 0 NOT NULL,
    "subtotal" numeric GENERATED ALWAYS AS ((("quantity")::numeric * "unit_price")) STORED,
    "total_cogs" numeric GENERATED ALWAYS AS ((("quantity")::numeric * ((("unit_cost_labor" + "unit_cost_ingredient") + "unit_cost_utilities") + "unit_cost_packaging"))) STORED,
    "business_settlement_id" bigint
);


ALTER TABLE "public"."transaction_items" OWNER TO "postgres";


ALTER TABLE "public"."transaction_items" ALTER COLUMN "transaction_item_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."transaction_items_transaction_item_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "transaction_id" bigint NOT NULL,
    "transaction_code" "text" NOT NULL,
    "transaction_time" timestamp without time zone DEFAULT "now"() NOT NULL,
    "payment_method" "text" NOT NULL,
    "transaction_amount" numeric NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp without time zone,
    "cashier" "text",
    "order_id" bigint
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


ALTER TABLE "public"."transactions" ALTER COLUMN "transaction_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."transactions_transaction_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."business_expense"
    ADD CONSTRAINT "business_expense_pkey" PRIMARY KEY ("business_expense_id");



ALTER TABLE ONLY "public"."business_settlement_expense"
    ADD CONSTRAINT "business_settlement_expense_pkey" PRIMARY KEY ("business_settlement_expense_id");



ALTER TABLE ONLY "public"."business_settlement_expense"
    ADD CONSTRAINT "business_settlement_expense_unique" UNIQUE ("business_settlement_id", "business_expense_id");



ALTER TABLE ONLY "public"."business_settlement"
    ADD CONSTRAINT "business_settlement_pkey" PRIMARY KEY ("business_settlement_id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("order_item_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id");



ALTER TABLE ONLY "public"."product_stock"
    ADD CONSTRAINT "product_stock_pkey" PRIMARY KEY ("product_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("product_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_product_code_key" UNIQUE ("product_code");



ALTER TABLE ONLY "public"."stock_adjustments"
    ADD CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("stock_adjustment_id");



ALTER TABLE ONLY "public"."transaction_items"
    ADD CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("transaction_item_id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("transaction_id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_transaction_code_key" UNIQUE ("transaction_code");



CREATE UNIQUE INDEX "app_users_username_lower_key" ON "public"."app_users" USING "btree" ("lower"("username"));



CREATE INDEX "idx_transaction_items_product_id" ON "public"."transaction_items" USING "btree" ("product_id");



CREATE INDEX "idx_transaction_items_transaction_id" ON "public"."transaction_items" USING "btree" ("transaction_id");



CREATE OR REPLACE TRIGGER "app_users_updated_at" BEFORE UPDATE ON "public"."app_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_app_users_updated_at"();



CREATE OR REPLACE TRIGGER "products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "transaction_items_updated_at" BEFORE UPDATE ON "public"."transaction_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "transactions_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_create_product_stock" AFTER INSERT ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."create_product_stock"();



ALTER TABLE ONLY "public"."app_users"
    ADD CONSTRAINT "app_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_expense"
    ADD CONSTRAINT "business_expense_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."app_users"("user_id");



ALTER TABLE ONLY "public"."business_expense"
    ADD CONSTRAINT "business_expense_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."app_users"("user_id");



ALTER TABLE ONLY "public"."business_settlement"
    ADD CONSTRAINT "business_settlement_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."app_users"("user_id");



ALTER TABLE ONLY "public"."business_settlement_expense"
    ADD CONSTRAINT "business_settlement_expense_business_expense_id_fkey" FOREIGN KEY ("business_expense_id") REFERENCES "public"."business_expense"("business_expense_id");



ALTER TABLE ONLY "public"."business_settlement_expense"
    ADD CONSTRAINT "business_settlement_expense_business_settlement_id_fkey" FOREIGN KEY ("business_settlement_id") REFERENCES "public"."business_settlement"("business_settlement_id");



ALTER TABLE ONLY "public"."business_settlement_expense"
    ADD CONSTRAINT "business_settlement_expense_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."app_users"("user_id");



ALTER TABLE ONLY "public"."business_settlement_expense"
    ADD CONSTRAINT "business_settlement_expense_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."app_users"("user_id");



ALTER TABLE ONLY "public"."business_settlement"
    ADD CONSTRAINT "business_settlement_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."app_users"("user_id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("product_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."product_stock"
    ADD CONSTRAINT "product_stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("product_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_adjustments"
    ADD CONSTRAINT "stock_adjustments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("product_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_items"
    ADD CONSTRAINT "transaction_items_business_settlement_id_fkey" FOREIGN KEY ("business_settlement_id") REFERENCES "public"."business_settlement"("business_settlement_id");



ALTER TABLE ONLY "public"."transaction_items"
    ADD CONSTRAINT "transaction_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("product_id");



ALTER TABLE ONLY "public"."transaction_items"
    ADD CONSTRAINT "transaction_items_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("transaction_id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id") ON DELETE SET NULL;



CREATE POLICY "Authenticated users can create business expenses" ON "public"."business_expense" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can create business settlements" ON "public"."business_settlement" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can create settlement expenses" ON "public"."business_settlement_expense" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can create stock adjustments" ON "public"."stock_adjustments" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can delete business expenses" ON "public"."business_expense" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete business settlements" ON "public"."business_settlement" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete settlement expenses" ON "public"."business_settlement_expense" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can insert product stock" ON "public"."product_stock" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can update business expenses" ON "public"."business_expense" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can update business settlements" ON "public"."business_settlement" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can update product stock" ON "public"."product_stock" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can update settlement expenses" ON "public"."business_settlement_expense" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can view business expenses" ON "public"."business_expense" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view business settlements" ON "public"."business_settlement" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view product stock" ON "public"."product_stock" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view settlement expenses" ON "public"."business_settlement_expense" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view stock adjustments" ON "public"."stock_adjustments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users full access to products" ON "public"."products" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users full access to transaction items" ON "public"."transaction_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users full access to transactions" ON "public"."transactions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Users can update their own profile" ON "public"."app_users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."app_users" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."app_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated_full_access_order_items" ON "public"."order_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_full_access_orders" ON "public"."orders" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_full_access_product_stock" ON "public"."product_stock" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_full_access_transaction_items" ON "public"."transaction_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated_full_access_transactions" ON "public"."transactions" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."business_expense" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_settlement" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_settlement_expense" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_stock" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_adjustments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transaction_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."adjust_product_qty"("p_product_id" bigint, "p_adjustment_quantity" integer, "p_adjustment_type" "text", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_product_qty"("p_product_id" bigint, "p_adjustment_quantity" integer, "p_adjustment_type" "text", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_product_qty"("p_product_id" bigint, "p_adjustment_quantity" integer, "p_adjustment_type" "text", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."convert_order_to_transaction"("p_order_id" bigint, "p_transaction_code" "text", "p_transaction_time" timestamp without time zone, "p_payment_method" "text", "p_cashier" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."convert_order_to_transaction"("p_order_id" bigint, "p_transaction_code" "text", "p_transaction_time" timestamp without time zone, "p_payment_method" "text", "p_cashier" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."convert_order_to_transaction"("p_order_id" bigint, "p_transaction_code" "text", "p_transaction_time" timestamp without time zone, "p_payment_method" "text", "p_cashier" "text") TO "service_role";



GRANT ALL ON TABLE "public"."business_settlement" TO "anon";
GRANT ALL ON TABLE "public"."business_settlement" TO "authenticated";
GRANT ALL ON TABLE "public"."business_settlement" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_business_settlement"("p_settlement_name" "text", "p_selection_mode" "text", "p_add_ids" bigint[], "p_exclude_ids" bigint[], "p_settlement_start" timestamp without time zone, "p_settlement_end" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[], "p_settlement_additional_selector" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_business_settlement"("p_settlement_name" "text", "p_selection_mode" "text", "p_add_ids" bigint[], "p_exclude_ids" bigint[], "p_settlement_start" timestamp without time zone, "p_settlement_end" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[], "p_settlement_additional_selector" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_business_settlement"("p_settlement_name" "text", "p_selection_mode" "text", "p_add_ids" bigint[], "p_exclude_ids" bigint[], "p_settlement_start" timestamp without time zone, "p_settlement_end" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[], "p_settlement_additional_selector" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_order_with_items"("p_customer_name" "text", "p_customer_address" "text", "p_due_date" "date", "p_notes" "text", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order_with_items"("p_customer_name" "text", "p_customer_address" "text", "p_due_date" "date", "p_notes" "text", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order_with_items"("p_customer_name" "text", "p_customer_address" "text", "p_due_date" "date", "p_notes" "text", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_product_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_product_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_product_stock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_transaction"("p_transaction_code" "text", "p_transaction_time" timestamp without time zone, "p_payment_method" "text", "p_transaction_amount" numeric, "p_cashier" "text", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_transaction"("p_transaction_code" "text", "p_transaction_time" timestamp without time zone, "p_payment_method" "text", "p_transaction_amount" numeric, "p_cashier" "text", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_transaction"("p_transaction_code" "text", "p_transaction_time" timestamp without time zone, "p_payment_method" "text", "p_transaction_amount" numeric, "p_cashier" "text", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_business_settlement"("p_business_settlement_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_business_settlement"("p_business_settlement_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_business_settlement"("p_business_settlement_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_transaction"("p_transaction_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_transaction"("p_transaction_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_transaction"("p_transaction_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_business_settlement_lists"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_business_settlement_lists"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_business_settlement_lists"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_email_by_username"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_flattened_transaction_items"("p_is_readonly" boolean, "p_settlement_id" bigint, "p_page" integer, "p_page_size" integer, "p_search" "text", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_cashier" "text", "p_product_category" "text"[], "p_product_name" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_flattened_transaction_items"("p_is_readonly" boolean, "p_settlement_id" bigint, "p_page" integer, "p_page_size" integer, "p_search" "text", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_cashier" "text", "p_product_category" "text"[], "p_product_name" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_flattened_transaction_items"("p_is_readonly" boolean, "p_settlement_id" bigint, "p_page" integer, "p_page_size" integer, "p_search" "text", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_cashier" "text", "p_product_category" "text"[], "p_product_name" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_order_detail"("p_order_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_order_detail"("p_order_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_order_detail"("p_order_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_orders_overview"("p_statuses" "text"[], "p_page" integer, "p_items_per_page" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_orders_overview"("p_statuses" "text"[], "p_page" integer, "p_items_per_page" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_orders_overview"("p_statuses" "text"[], "p_page" integer, "p_items_per_page" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_categories"("p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_categories"("p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_categories"("p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_categories_by_time_range"("p_start_time" timestamp without time zone, "p_end_time" timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_categories_by_time_range"("p_start_time" timestamp without time zone, "p_end_time" timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_categories_by_time_range"("p_start_time" timestamp without time zone, "p_end_time" timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_demand_overview"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_demand_overview"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_demand_overview"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_products_from_transaction_item"("p_start_time" timestamp without time zone, "p_end_time" timestamp without time zone, "p_product_category" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_products_from_transaction_item"("p_start_time" timestamp without time zone, "p_end_time" timestamp without time zone, "p_product_category" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_products_from_transaction_item"("p_start_time" timestamp without time zone, "p_end_time" timestamp without time zone, "p_product_category" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sales_summary"("report_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_sales_summary"("report_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sales_summary"("report_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transaction_items_settlement_breakdown"("p_business_settlement_id" bigint, "p_selection_mode" "text", "p_add_ids" bigint[], "p_remove_ids" bigint[], "p_settlement_name" "text", "p_settlement_start" timestamp without time zone, "p_settlement_end" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[], "p_settlement_additional_selector" "jsonb", "p_group_by" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_transaction_items_settlement_breakdown"("p_business_settlement_id" bigint, "p_selection_mode" "text", "p_add_ids" bigint[], "p_remove_ids" bigint[], "p_settlement_name" "text", "p_settlement_start" timestamp without time zone, "p_settlement_end" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[], "p_settlement_additional_selector" "jsonb", "p_group_by" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transaction_items_settlement_breakdown"("p_business_settlement_id" bigint, "p_selection_mode" "text", "p_add_ids" bigint[], "p_remove_ids" bigint[], "p_settlement_name" "text", "p_settlement_start" timestamp without time zone, "p_settlement_end" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[], "p_settlement_additional_selector" "jsonb", "p_group_by" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transaction_items_settlement_summary"("p_business_settlement_id" bigint, "p_selection_mode" "text", "p_add_ids" bigint[], "p_remove_ids" bigint[], "p_settlement_name" "text", "p_settlement_start" timestamp without time zone, "p_settlement_end" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_transaction_items_settlement_summary"("p_business_settlement_id" bigint, "p_selection_mode" "text", "p_add_ids" bigint[], "p_remove_ids" bigint[], "p_settlement_name" "text", "p_settlement_start" timestamp without time zone, "p_settlement_end" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transaction_items_settlement_summary"("p_business_settlement_id" bigint, "p_selection_mode" "text", "p_add_ids" bigint[], "p_remove_ids" bigint[], "p_settlement_name" "text", "p_settlement_start" timestamp without time zone, "p_settlement_end" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transactions"("p_page" integer, "p_page_size" integer, "p_search" "text", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_cashier" "text", "p_min_amount" numeric, "p_max_amount" numeric, "p_payment_method" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_transactions"("p_page" integer, "p_page_size" integer, "p_search" "text", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_cashier" "text", "p_min_amount" numeric, "p_max_amount" numeric, "p_payment_method" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transactions"("p_page" integer, "p_page_size" integer, "p_search" "text", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_cashier" "text", "p_min_amount" numeric, "p_max_amount" numeric, "p_payment_method" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_username_available"("p_username" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_username_available"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_username_available"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_username_available"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_settlement_candidate_ids"("p_business_settlement_id" bigint, "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_settlement_candidate_ids"("p_business_settlement_id" bigint, "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_settlement_candidate_ids"("p_business_settlement_id" bigint, "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_order_item_ready_override"("p_order_item_id" bigint, "p_value" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."set_order_item_ready_override"("p_order_item_id" bigint, "p_value" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_order_item_ready_override"("p_order_item_id" bigint, "p_value" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_products"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_products"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_products"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_app_users_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_app_users_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_app_users_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."business_settlement_expense" TO "anon";
GRANT ALL ON TABLE "public"."business_settlement_expense" TO "authenticated";
GRANT ALL ON TABLE "public"."business_settlement_expense" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_business_settlement_expenses"("p_business_settlement_id" bigint, "p_expenses" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_business_settlement_expenses"("p_business_settlement_id" bigint, "p_expenses" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_business_settlement_expenses"("p_business_settlement_id" bigint, "p_expenses" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_business_settlement_result"("p_business_settlement_id" bigint, "p_settled_labor_cost" numeric, "p_settled_packaging_cost" numeric, "p_settled_utility_cost" numeric, "p_settled_ingredient_cost" numeric, "p_profit_retained" numeric, "p_profit_distributed" numeric, "p_deficit_covered" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_business_settlement_result"("p_business_settlement_id" bigint, "p_settled_labor_cost" numeric, "p_settled_packaging_cost" numeric, "p_settled_utility_cost" numeric, "p_settled_ingredient_cost" numeric, "p_profit_retained" numeric, "p_profit_distributed" numeric, "p_deficit_covered" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_business_settlement_result"("p_business_settlement_id" bigint, "p_settled_labor_cost" numeric, "p_settled_packaging_cost" numeric, "p_settled_utility_cost" numeric, "p_settled_ingredient_cost" numeric, "p_profit_retained" numeric, "p_profit_distributed" numeric, "p_deficit_covered" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_business_settlement_selection"("p_business_settlement_id" bigint, "p_selection_mode" "text", "p_add_ids" bigint[], "p_remove_ids" bigint[], "p_settlement_name" "text", "p_settlement_start" timestamp without time zone, "p_settlement_end" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[], "p_settlement_additional_selector" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_business_settlement_selection"("p_business_settlement_id" bigint, "p_selection_mode" "text", "p_add_ids" bigint[], "p_remove_ids" bigint[], "p_settlement_name" "text", "p_settlement_start" timestamp without time zone, "p_settlement_end" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[], "p_settlement_additional_selector" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_business_settlement_selection"("p_business_settlement_id" bigint, "p_selection_mode" "text", "p_add_ids" bigint[], "p_remove_ids" bigint[], "p_settlement_name" "text", "p_settlement_start" timestamp without time zone, "p_settlement_end" timestamp without time zone, "p_product_category" "text"[], "p_product_name" "text"[], "p_settlement_additional_selector" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_business_settlement_status"("p_business_settlement_id" bigint, "p_settlement_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_business_settlement_status"("p_business_settlement_id" bigint, "p_settlement_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_business_settlement_status"("p_business_settlement_id" bigint, "p_settlement_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_order_status"("p_order_id" bigint, "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_order_status"("p_order_id" bigint, "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_order_status"("p_order_id" bigint, "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_transaction_item_costs"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_transaction_item_costs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_transaction_item_costs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."app_users" TO "anon";
GRANT ALL ON TABLE "public"."app_users" TO "authenticated";
GRANT ALL ON TABLE "public"."app_users" TO "service_role";



GRANT ALL ON TABLE "public"."business_expense" TO "anon";
GRANT ALL ON TABLE "public"."business_expense" TO "authenticated";
GRANT ALL ON TABLE "public"."business_expense" TO "service_role";



GRANT ALL ON SEQUENCE "public"."business_expense_business_expense_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."business_expense_business_expense_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."business_expense_business_expense_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."business_expense_summary" TO "anon";
GRANT ALL ON TABLE "public"."business_expense_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."business_expense_summary" TO "service_role";



GRANT ALL ON SEQUENCE "public"."business_settlement_business_settlement_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."business_settlement_business_settlement_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."business_settlement_business_settlement_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."product_stock" TO "anon";
GRANT ALL ON TABLE "public"."product_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."product_stock" TO "service_role";



GRANT ALL ON TABLE "public"."order_item_readiness" TO "anon";
GRANT ALL ON TABLE "public"."order_item_readiness" TO "authenticated";
GRANT ALL ON TABLE "public"."order_item_readiness" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_items_order_item_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_items_order_item_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_items_order_item_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."orders_order_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."orders_order_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."orders_order_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON SEQUENCE "public"."products_product_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_product_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_product_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."stock_adjustments" TO "anon";
GRANT ALL ON TABLE "public"."stock_adjustments" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_adjustments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."stock_adjustments_stock_adjustment_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."stock_adjustments_stock_adjustment_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."stock_adjustments_stock_adjustment_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_items" TO "anon";
GRANT ALL ON TABLE "public"."transaction_items" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."transaction_items_transaction_item_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."transaction_items_transaction_item_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."transaction_items_transaction_item_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."transactions_transaction_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."transactions_transaction_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."transactions_transaction_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







