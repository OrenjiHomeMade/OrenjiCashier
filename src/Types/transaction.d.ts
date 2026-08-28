import { Database } from "./database";

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
	data: Database["public"]["Functions"]["get_transactions"]["Returns"];
	totalCount: number;
	totalPages: number;
	page: number;
	pageSize: number;
};

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

export type TTransaction = {
	transactionId: number;
	transactionCode: string;
	transactionDate: Date;
	cashier: string;
	transactionAmount: number;
	paymentMethod: "CASH" | "QRIS";
	transactionItems: TTransactionItem[];
};

export type TTransactionItem = {
	id: string;
	productName: string;
	quantity: number;
	unitPrice: number;
	subtotal: number;
};
