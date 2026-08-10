CREATE SCHEMA IF NOT EXISTS staging;

CREATE TABLE IF NOT EXISTS staging.product_sync (
    product_id bigint,
    product_code text,
    product_name text,
    product_category text,
    product_price numeric,
    product_image text,
    is_active boolean,
    description text
);

CREATE INDEX IF NOT EXISTS idx_product_sync_product_id
ON staging.product_sync(product_id);

CREATE INDEX IF NOT EXISTS idx_product_sync_product_code
ON staging.product_sync(product_code);