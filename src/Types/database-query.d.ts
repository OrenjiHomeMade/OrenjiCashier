/** PRODUCT QUERY **/
export type DTProduct = {
	product_id: string;
	product_code: string;
	product_name: string;
	product_price: number;
	cost_ingredient: number;
	cost_labor: number;
	cost_packaging: number;
	cost_utilities: number;
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
