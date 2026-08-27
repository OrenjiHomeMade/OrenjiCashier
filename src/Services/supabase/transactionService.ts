import type { DTTransaction } from "../../Types/database";
import type { TCreateTransactionInput, TTransactionResult } from "../../Types/transaction";
import { supabase } from "./client";
import { toast } from "react-toastify";

export type TTransactionFilter = {
	page?: number;
	pageSize?: number;

	search?: string;

	startDate?: string;
	endDate?: string;

	cashier?: string;
	paymentMethod?: string;

	minAmount?: number;
	maxAmount?: number;
};

export const createTransaction = async (transaction: TCreateTransactionInput): Promise<string | null> => {
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

		p_search: search || null,

		p_start_date: startDateTime,
		p_end_date: endDateTime,

		p_cashier: cashier || null,
		p_payment_method: paymentMethod || null,

		p_min_amount: minAmount ?? null,
		p_max_amount: maxAmount ?? null
	});

	if (error) {
		console.error("Failed to get transactions:", error);

		toast.error(`Failed to load transactions: ${error.message}`);

		throw error;
	}

	const rows = data ?? [];

	const transactions: DTTransaction[] = rows.map((row: DTTransaction) => ({
		transaction_id: row.transaction_id,
		transaction_code: row.transaction_code,
		transaction_time: row.transaction_time,
		payment_method: row.payment_method,
		transaction_amount: Number(row.transaction_amount),
		created_at: row.created_at,
		updated_at: row.updated_at,
		cashier: row.cashier,
		items: row.items ?? []
	}));

	const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

	return {
		data: transactions,
		totalCount,
		totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
		page,
		pageSize
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
