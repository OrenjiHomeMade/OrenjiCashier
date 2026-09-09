export type TExpenseSection = "UTILITIES" | "ADDITIONAL";
export type TExpenseStatus = "UNSETTLED" | "PARTIAL" | "SETTLED";

export type TBusinessExpense = {
	id: string;
	section: TExpenseSection;
	description: string;
	category: BusinessExpenseCategory;
	originalAmount: number;
	settledAmount: number;
};

export type SettlementExpenseInput = {
	business_expense_id: number;
	allocated_amount: number;
};
