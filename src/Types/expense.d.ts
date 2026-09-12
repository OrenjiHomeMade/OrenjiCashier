import type { Database } from "../../Types/database";
import type { BusinessExpenseCategory } from "../Services/supabase/businessExpensesServices";

export type TExpenseSection = "UTILITIES" | "ADDITIONAL";
export type TExpenseStatus = "UNSETTLED" | "PARTIAL" | "SETTLED";

export type BusinessExpenseInsert = Database["public"]["Tables"]["business_expense"]["Insert"];

export type BusinessExpenseUpdate = Database["public"]["Tables"]["business_expense"]["Update"];

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

export type TBusinessExpenseRow = {
	business_expense_id: number;
	expense_category: BusinessExpenseCategory;
	expense_description: string | null;
	expense_amount: number;
};
