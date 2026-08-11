import { supabase } from "./client";
import { toast } from "react-toastify";

export type TTransactionItemInput = {
	product_id: string;
	quantity: number;
	unit_price: number;
	subtotal: number;
};

export type TCreateTransactionInput = {
	transaction_code: string;
	transaction_time: string;
	payment_method: string;
	transaction_amount: number;
	cashier: string;
	items: TTransactionItemInput[];
};

export const createTransaction = async (transaction: TCreateTransactionInput): Promise<string | null> => {
	const { data, error } = await supabase.rpc("create_transaction", {
		p_transaction_code: transaction.transaction_code,
		p_transaction_time: transaction.transaction_time,
		p_payment_method: transaction.payment_method,
		p_transaction_amount: transaction.transaction_amount,
		p_cashier: transaction.cashier,
		p_items: transaction.items
	});

	if (error) {
		toast.error(`Failed to create transaction: ${error.message}`);
		console.error("Failed to create transaction:", error);
		return null;
	}

	toast.success("Transaction successfully created");

	return data;
};
