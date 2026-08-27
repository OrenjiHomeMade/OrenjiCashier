export type DTProduct = {
	product_id: string;
	product_code: string;
	product_name: string;
	product_image: string | null;
	product_price: number;
	product_category: string;
	description: string | null;
	is_active: boolean;
};

export type DTProductWithQty = DTProduct & {
	stock_quantity: number;
};

type DTProductQuery = DTProduct & {
	product_stock: {
		stock_quantity: number;
	} | null;
};

/** TRANSACTION QUERY ***/
export type DTTransactionItem = {
	transaction_item_id: number;
	transaction_id: number;
	product_id: number;
	product_name: string | null;
	quantity: number;
	unit_price: number;
	subtotal: number;
	created_at: string;
	updated_at: string;
};

export type DTTransaction = {
	transaction_id: number;
	transaction_code: string;
	transaction_time: string;
	payment_method: string;
	transaction_amount: number;
	created_at: string;
	updated_at: string;
	cashier: string;
	items: DTTransactionItem[];
};
