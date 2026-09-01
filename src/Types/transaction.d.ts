import type { Database } from "./database";

/* =========================================================
   COMMON / ENUM TYPES
   ========================================================= */

export type TPaymentMethod = "CASH" | "QRIS";

/* =========================================================
   ITEM TYPES
   ========================================================= */

/**
 * Base representation of line item calculations.
 * Used to avoid re-declaring quantity, unitPrice, subtotal.
 */
export type TTransactionItemBase = {
	quantity: number;
	unitPrice: number;
	unitCostLabor: number;
	unitCostIngredient: number;
	unitCostUtilities: number;
	unitCostPackaging: number;
	subtotal?: number;
	totalCOGS?: number;
};

/** UI Domain Model for an item */
export type TTransactionItem = TTransactionItemBase & {
	id: string;
	productName: string;
};

/** Input payload for creating a transaction item */
export type TTransactionItemInput = TTransactionItemBase & {
	productId: string;
};

/** Raw JSON shape returned inside Database RPC */
export type TRawTransactionItem = {
	transaction_item_id: number | string;
	product_name: string | null;
	product_id: number | string;
	quantity: number;
	unit_price: number;
	unit_cost_labor: number;
	unit_cost_ingredient: number;
	unit_cost_utilities: number;
	unit_cost_packaging: number;
	subtotal: number;
};

/* =========================================================
   TRANSACTION TYPES
   ========================================================= */

/** Base fields shared across UI transaction models & inputs */
export type TTransactionBase = {
	transactionCode: string;
	cashier: string;
	transactionAmount: number;
};

/** UI Domain Model */
export type TTransaction = TTransactionBase & {
	transactionId: number;
	transactionDate: Date;
	paymentMethod: TPaymentMethod;
	transactionItems: TTransactionItem[];
};

/** Payload for creating a new transaction */
export type TCreateTransactionInput = TTransactionBase & {
	transactionTime: string;
	paymentMethod: string;
	items: TTransactionItemInput[];
};

export type TTransactionPerItem = {
	cashier: string;
	paymentMethod: string;
	productCategory: string;
	productId: number;
	productName: string;
	quantity: number;
	subtotal: number;
	totalCount: number;
	transactionAmount: number;
	transactionCode: string;
	transactionId: number;
	transactionItemId: number;
	transactionTime: string;
	unitPrice: number;
};

export type TTransactionSalesSummary = {
	ingredientCost: number;
	laborCost: number;
	salesMargin: number;
	packagingCost: number;
	revenue: number;
	utilityCost: number;
	soldItem: number;
};

export type TTrasnasctionSalesBreakdown = {
	ingredientCost: number;
	laborCost: number;
	salesMargin: number;
	packagingCost: number;
	productCategory: string;
	productId: number;
	productName: string;
	quantity: number;
	revenue: number;
	totalCogs: number;
	utilityCost: number;
};

/* =========================================================
   FILTER & API RESULT TYPES
   ========================================================= */

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

export type TTransactionResult = {
	data: Database["public"]["Functions"]["get_transactions"]["Returns"];
	totalCount: number;
	totalPages: number;
	page: number;
	pageSize: number;
};
