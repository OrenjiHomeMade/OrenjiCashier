import type { Database } from "../../Types/database";
import type {
	TCreateTransactionInput,
	TPaymentMethod,
	TTransaction,
	TTransactionFilter,
	TTransactionItemResult,
	TTransactionResult,
	TTransactionSalesSummary,
	TTrasnasctionSalesBreakdown
} from "../../Types/transaction";
import { supabase } from "./client";
import { toast } from "react-toastify";

export const createTransaction = async (transaction: TCreateTransactionInput): Promise<number | null> => {
	const transactionEntry = {
		p_transaction_code: transaction.transactionCode,
		p_transaction_time: transaction.transactionTime,
		p_payment_method: transaction.paymentMethod,
		p_transaction_amount: transaction.transactionAmount,
		p_cashier: transaction.cashier,
		p_items: transaction.items.map((item) => ({
			product_id: Number(item.productId),
			quantity: item.quantity,
			unit_price: item.unitPrice,
			unit_cost_labor: item.unitCostLabor,
			unit_cost_ingredient: item.unitCostIngredient,
			unit_cost_utilities: item.unitCostUtilities,
			unit_cost_packaging: item.unitCostPackaging
		}))
	};
	console.log(transactionEntry);
	const { data, error } = await supabase.rpc("create_transaction", transactionEntry);

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
				unit_cost_labor,
				unit_cost_ingredient,
				unit_cost_utilities,
				unit_cost_packaging,
				subtotal,
				total_cogs,
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
			unitCostIngredient: item.unit_cost_ingredient,
			unitCostLabor: item.unit_cost_labor,
			unitCostPackaging: item.unit_cost_packaging,
			unitCostUtilities: item.unit_cost_utilities,
			subtotal: item.subtotal ?? 0,
			totalCOGS: item.total_cogs ?? 0
		}))
	};
};

export type GetTransactionItemParams = Database["public"]["Functions"]["get_flattened_transaction_items"]["Args"];

export const getTransactionsPerItem = async (params: GetTransactionItemParams): Promise<TTransactionItemResult> => {
	const { data, error } = await supabase.rpc("get_flattened_transaction_items", params);
	if (error) {
		console.error("Failed to get transactions per item:", error);
		toast.error(`Failed to load transactions per item: ${error.message}`);
		throw error;
	}

	const rows = data.map((dat) => ({
		cashier: dat.cashier,
		paymentMethod: dat.payment_method,
		productCategory: dat.product_category,
		productId: dat.product_id,
		productName: dat.product_name,
		quantity: dat.quantity,
		subtotal: dat.subtotal,
		totalCount: dat.total_count,
		transactionAmount: dat.transaction_amount,
		transactionCode: dat.transaction_code,
		transactionId: dat.transaction_id,
		transactionItemId: dat.transaction_item_id,
		transactionTime: dat.transaction_time,
		unitPrice: dat.unit_price
	}));

	const totalCount = rows.length > 0 ? Number(rows[0].totalCount) : 0;

	return {
		data: rows,
		totalCount: totalCount,
		page: params.p_page || 1,
		pageSize: params.p_page_size || 20,
		totalPages: Math.max(1, Math.ceil(totalCount / (params.p_page_size || 20)))
	};
};

export const getTransactionItemsBySettlementId = async (bussinesSettlementId: number): Promise<number[]> => {
	const { data, error } = await supabase
		.from("transaction_items")
		.select("transaction_item_id")
		.eq("business_settlement_id", bussinesSettlementId);
	if (error) {
		console.error(`Failed to get selected transactions item by settlement id ${bussinesSettlementId}: `, error);
		toast.error(
			`Failed to get selected transactions item by settlement id ${bussinesSettlementId}: ${error.message}`
		);
		throw error;
	}
	return data.map((tr) => tr.transaction_item_id);
};

type SalesSummaryParams = Database["public"]["Functions"]["get_transaction_items_settlement_summary"]["Args"];

export const getSalesSummaryOnTransactionItems = async (
	params: SalesSummaryParams
): Promise<TTransactionSalesSummary[] | null> => {
	const { data, error } = await supabase.rpc("get_transaction_items_settlement_summary", params);
	if (error) {
		console.error("Failed to get sales summary on transaction items:", error);
		toast.error(`Failed to load sales summary on transaction items: ${error.message}`);
		throw error;
	}
	return data.map((dat) => ({
		ingredientCost: dat.sales_ingredient_cost,
		laborCost: dat.sales_labor_cost,
		salesMargin: dat.sales_margin,
		packagingCost: dat.sales_packaging_cost,
		revenue: dat.sales_revenue,
		utilityCost: dat.sales_utility_cost,
		soldItem: dat.selected_item_count
	}));
};

type SalesBreakdownParams = Database["public"]["Functions"]["get_transaction_items_settlement_breakdown"]["Args"];

export const getSalesBreakdownOnTransactionItems = async (
	params: SalesBreakdownParams
): Promise<TTrasnasctionSalesBreakdown[] | null> => {
	const { data, error } = await supabase.rpc("get_transaction_items_settlement_breakdown", params);
	if (error) {
		console.error("Failed to get sales breakdown on transaction items:", error);
		toast.error(`Failed to load sales breakdown on transaction items: ${error.message}`);
		throw error;
	}
	return data.map((dat) => ({
		ingredientCost: dat.ingredient_cost,
		laborCost: dat.labor_cost,
		salesMargin: dat.margin,
		packagingCost: dat.packaging_cost,
		productCategory: dat.product_category,
		productId: dat.product_id,
		productName: dat.product_name,
		quantity: dat.quantity,
		revenue: dat.revenue,
		totalCogs: dat.total_cogs,
		utilityCost: dat.utility_cost
	}));
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
