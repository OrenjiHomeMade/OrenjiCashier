import { supabase } from "./client";
import type { Database } from "../../Types/database";

export const BUSINESS_EXPENSE_CATEGORIES = ["INGREDIENT", "PACKAGING", "UTILITY", "LABOR", "TEAM", "OTHER"] as const;

export type BusinessExpenseCategory = (typeof BUSINESS_EXPENSE_CATEGORIES)[number];

export const BUSINESS_EXPENSE_TYPES = ["PURCHASE", "DIRECT_EXPENSE"] as const;

export type BusinessExpenseType = (typeof BUSINESS_EXPENSE_TYPES)[number];

// type BusinessExpense = Database["public"]["Tables"]["business_expense"]["Row"];

type BusinessExpenseInsert = Database["public"]["Tables"]["business_expense"]["Insert"];

type BusinessExpenseUpdate = Database["public"]["Tables"]["business_expense"]["Update"];

/**
 * Get business expenses.
 *
 * Optional filters can be added later depending on the screen.
 */
export async function getBusinessExpenses() {
	const { data, error } = await supabase
		.from("business_expense")
		.select("*")
		.is("deleted_at", null)
		.order("expense_time", { ascending: false });

	if (error) throw error;

	return data;
}

/**
 * Get a single business expense.
 */
export async function getBusinessExpense(businessExpenseId: number) {
	const { data, error } = await supabase
		.from("business_expense")
		.select("*")
		.eq("business_expense_id", businessExpenseId)
		.is("deleted_at", null)
		.single();

	if (error) throw error;

	return data;
}

/**
 * Create a business expense.
 */
export async function createBusinessExpense(expense: BusinessExpenseInsert) {
	const { data, error } = await supabase.from("business_expense").insert(expense).select().single();

	if (error) throw error;

	return data;
}

/**
 * Update a business expense.
 */
export async function updateBusinessExpense(businessExpenseId: number, expense: BusinessExpenseUpdate) {
	const { data, error } = await supabase
		.from("business_expense")
		.update(expense)
		.eq("business_expense_id", businessExpenseId)
		.is("deleted_at", null)
		.select()
		.single();

	if (error) throw error;

	return data;
}

/**
 * Soft-delete a business expense.
 */
export async function deleteBusinessExpense(businessExpenseId: number) {
	const { data, error } = await supabase
		.from("business_expense")
		.update({
			deleted_at: new Date().toISOString()
		})
		.eq("business_expense_id", businessExpenseId)
		.is("deleted_at", null)
		.select()
		.single();

	if (error) throw error;

	return data;
}
