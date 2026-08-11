DROP FUNCTION IF EXISTS get_transactions(
    INTEGER,
    INTEGER,
    TEXT,
    TIMESTAMP,
    TIMESTAMP,
    TEXT,
    NUMERIC,
    NUMERIC,
    TEXT
);

CREATE OR REPLACE FUNCTION get_transactions(
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20,
    p_search TEXT DEFAULT NULL,
    p_start_date TIMESTAMP DEFAULT NULL,
    p_end_date TIMESTAMP DEFAULT NULL,
    p_cashier TEXT DEFAULT NULL,
    p_min_amount NUMERIC DEFAULT NULL,
    p_max_amount NUMERIC DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL
)
RETURNS TABLE (
    transaction_id BIGINT,
    transaction_code TEXT,
    transaction_time TIMESTAMP,
    payment_method TEXT,
    transaction_amount NUMERIC,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    cashier TEXT,
    items JSONB,
    total_count BIGINT
)
LANGUAGE sql
STABLE
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