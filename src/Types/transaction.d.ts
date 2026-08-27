export type TTransactionItemInput = {
	productId: string;
	quantity: number;
	unitPrice: number;
	subtotal: number;
};

export type TCreateTransactionInput = {
	transactionCode: string;
	transactionTime: string;
	paymentMethod: string;
	transactionAmount: number;
	cashier: string;
	items: TTransactionItemInput[];
};

export type TTransactionResult = {
	data: DTTransaction[];
	totalCount: number;
	totalPages: number;
	page: number;
	pageSize: number;
};
