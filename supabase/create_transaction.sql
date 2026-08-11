-- DROP FUNCTION public.create_transaction(text, timestamp, text, numeric, text, jsonb);

CREATE OR REPLACE FUNCTION public.create_transaction(p_transaction_code text, p_transaction_time timestamp without time zone, p_payment_method text, p_transaction_amount numeric, p_cashier text, p_items jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_transaction_id bigint;
BEGIN

  -- Insert transaction
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


  -- Insert transaction items
  INSERT INTO transaction_items (
    transaction_id,
    product_id,
    quantity,
    unit_price,
    subtotal
  )
  SELECT
    v_transaction_id,
    (item->>'product_id')::bigint,
    (item->>'quantity')::integer,
    (item->>'unit_price')::numeric,
    (item->>'subtotal')::numeric
  FROM jsonb_array_elements(p_items) AS item;


  -- Return the newly created transaction ID
  RETURN v_transaction_id;

END;
$function$
;
