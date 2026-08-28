import { supabase } from "./client";

type PaymentSummary = {
	payment_method: string;
	amount: number;
};

export type ProductSummary = {
	product_id: number;
	product_name: string;
	sold: number;
	damaged: number;
	remaining: number;
};

export type SalesSummary = {
	date: string;
	total_sales: number;
	total_transactions: number;
	total_items_sold: number;
	total_damaged: number;
	payments: PaymentSummary[];
	products: ProductSummary[];
};

export const getSalesSummary = async (date: string): Promise<SalesSummary> => {
	const { data, error } = await supabase.rpc("get_sales_summary", {
		report_date: date
	});

	if (error) {
		throw error;
	}

	return data as unknown as SalesSummary;
};
