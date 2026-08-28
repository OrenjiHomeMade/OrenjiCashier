import type {
	TCreateTransactionInput,
	TPaymentMethod,
	TTransaction,
	TTransactionFilter,
	TTransactionResult
} from "../../Types/transaction";
import { supabase } from "./client";
import { toast } from "react-toastify";

export const createTransaction = async (transaction: TCreateTransactionInput): Promise<number | null> => {
	const { data, error } = await supabase.rpc("create_transaction", {
		p_transaction_code: transaction.transactionCode,
		p_transaction_time: transaction.transactionTime,
		p_payment_method: transaction.paymentMethod,
		p_transaction_amount: transaction.transactionAmount,
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

export const getTransactions = async (filter: TTransactionFilter = {}): Promise<TTransactionResult> => {
	const {
		page = 1,
		pageSize = 20,
		search = null,
		startDate = null,
		endDate = null,
		cashier = null,
		paymentMethod = null,
		minAmount = null,
		maxAmount = null
	} = filter;

	/*
	 * Convert date-only values from the UI into timestamps.
	 *
	 * Example:
	 *
	 * startDate = "2026-08-01"
	 * -> 2026-08-01 00:00:00
	 *
	 * endDate = "2026-08-11"
	 * -> 2026-08-12 00:00:00
	 *
	 * The RPC uses:
	 *
	 * transaction_time >= start
	 * transaction_time < end
	 *
	 * Therefore the entire end date is included.
	 */

	const startDateTime = startDate ? `${startDate}T00:00:00` : null;

	const endDateTime = endDate
		? (() => {
				const date = new Date(`${endDate}T00:00:00`);

				date.setDate(date.getDate() + 1);

				return (
					[
						date.getFullYear(),
						String(date.getMonth() + 1).padStart(2, "0"),
						String(date.getDate()).padStart(2, "0")
					].join("-") + "T00:00:00"
				);
			})()
		: null;

	const { data, error } = await supabase.rpc("get_transactions", {
		p_page: page,
		p_page_size: pageSize,
		p_search: search || undefined,
		p_start_date: startDateTime || undefined,
		p_end_date: endDateTime || undefined,
		p_cashier: cashier || undefined,
		p_payment_method: paymentMethod || undefined,
		p_min_amount: minAmount ?? undefined,
		p_max_amount: maxAmount ?? undefined
	});

	if (error) {
		console.error("Failed to get transactions:", error);

		toast.error(`Failed to load transactions: ${error.message}`);

		throw error;
	}

	const rows = data ?? [];

	const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

	return {
		data: rows,
		totalCount,
		totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
		page,
		pageSize
	};
};

export const getTransactionById = async (transactionId: number): Promise<TTransaction | null> => {
	const { data, error } = await supabase
		.from("transactions")
		.select(
			`
			transaction_id,
			transaction_code,
			transaction_time,
			payment_method,
			transaction_amount,
			cashier,
			transaction_items (
				transaction_item_id,
				product_id,
				quantity,
				unit_price,
				subtotal,
				products (
					product_name
				)
			)
		`
		)
		.eq("transaction_id", transactionId)
		.single();

	if (error) {
		console.error("Failed to get transaction:", error);

		throw error;
	}

	if (!data) {
		return null;
	}

	return {
		transactionId: data.transaction_id,
		transactionCode: data.transaction_code,
		transactionDate: new Date(data.transaction_time),
		paymentMethod: data.payment_method as TPaymentMethod,
		transactionAmount: data.transaction_amount,
		cashier: data.cashier ?? "",
		transactionItems: data.transaction_items.map((item) => ({
			id: String(item.transaction_item_id),
			productName: item.products?.product_name ?? "Unknown Product",
			quantity: item.quantity,
			unitPrice: item.unit_price,
			subtotal: item.subtotal
		}))
	};
};

export const deleteTransaction = async (transactionId: number): Promise<boolean> => {
	const { data, error } = await supabase.rpc("delete_transaction", {
		p_transaction_id: transactionId
	});

	if (error) {
		console.error("Failed to delete transaction:", error);

		toast.error(`Failed to delete transaction: ${error.message}`);

		throw error;
	}

	if (!data) {
		toast.error("Transaction could not be deleted.");

		return false;
	}

	toast.success("Transaction successfully deleted");

	return true;
};

export async function getCashierOperators() {
	const { data, error } = await supabase.from("app_users").select("user_id, username").order("username", {
		ascending: true
	});

	if (error) {
		throw error;
	}

	return data;
}
