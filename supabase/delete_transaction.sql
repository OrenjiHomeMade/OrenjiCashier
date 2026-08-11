CREATE OR REPLACE FUNCTION delete_transaction(
    p_transaction_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Make sure the transaction exists and is still active
    IF NOT EXISTS (
        SELECT 1
        FROM transactions
        WHERE transaction_id = p_transaction_id
          AND deleted_at IS NULL
    ) THEN
        RETURN FALSE;
    END IF;

    -- Soft delete transaction items
    UPDATE transaction_items
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE transaction_id = p_transaction_id
      AND deleted_at IS NULL;

    -- Soft delete transaction
    UPDATE transactions
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE transaction_id = p_transaction_id
      AND deleted_at IS NULL;

    RETURN TRUE;
END;
$$;