CREATE OR REPLACE FUNCTION public.sync_products()
RETURNS TABLE (
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
)
LANGUAGE plpgsql
AS $function$
BEGIN

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
        product_id,
        product_code,
        product_name,
        product_category,
        product_price,
        product_image,
        is_active,
        description,
        created_at,
        updated_at,
        deleted_at
    FROM deleted;


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
        product_id,
        product_code,
        product_name,
        product_category,
        product_price,
        product_image,
        is_active,
        description,
        created_at,
        updated_at,
        deleted_at
    FROM updated;


    /*
     * INSERT
     */
    WITH inserted AS (
        INSERT INTO public.products (
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
            product_id,
            product_code,
            product_name,
            product_category,
            product_price,
            product_image,
            is_active,
            description,
            created_at,
            updated_at,
            deleted_at
    )
    INSERT INTO sync_changes
    SELECT
        'INSERT',
        product_id,
        product_code,
        product_name,
        product_category,
        product_price,
        product_image,
        is_active,
        description,
        created_at,
        updated_at,
        deleted_at
    FROM inserted;


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
TRUNCATE TABLE staging.product_sync;
END;
$function$;