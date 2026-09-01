import type { Database, Json } from "../../Types/database";
import { supabase } from "./client";

/**
 * Get a business settlement by ID.
 */
export async function getBusinessSettlement(businessSettlementId: number) {
	const { data, error } = await supabase
		.from("business_settlement")
		.select("*")
		.eq("business_settlement_id", businessSettlementId)
		.is("deleted_at", null)
		.single();

	if (error) throw error;

	return data;
}

/**
 * Get business settlements.
 */
export async function getBusinessSettlements() {
	const { data, error } = await supabase
		.from("business_settlement")
		.select("*")
		.is("deleted_at", null)
		.order("created_at", { ascending: false });

	if (error) throw error;

	return data;
}

/**
 * Get transaction items belonging to a settlement.
 */
export async function getSettlementTransactionItems(businessSettlementId: number) {
	const { data, error } = await supabase
		.from("transaction_items")
		.select("*")
		.eq("business_settlement_id", businessSettlementId);

	if (error) throw error;

	return data;
}

/**
 * Get expenses assigned to a settlement.
 */
export async function getSettlementExpenses(businessSettlementId: number) {
	const { data, error } = await supabase
		.from("business_settlement_expense")
		.select(
			`
      *,
      business_expense (*)
    `
		)
		.eq("business_settlement_id", businessSettlementId)
		.is("deleted_at", null);

	if (error) throw error;

	return data;
}

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

type BusinessSettlement = Database["public"]["Tables"]["business_settlement"]["Row"];

type BusinessSettlementExpense = Database["public"]["Tables"]["business_settlement_expense"]["Row"];

type SettlementExpenseInput = {
	business_expense_id: number;
	allocated_amount: number;
};

type SettlementStatus = "DRAFT" | "CONFIRMED" | "SETTLED";

// -----------------------------------------------------------------------------
// CREATE
// -----------------------------------------------------------------------------

export async function createBusinessSettlement(
	transactionItemIds: number[],
	settlementStart: string,
	settlementEnd: string,
	settlementAdditionalSelector?: Json | undefined
): Promise<BusinessSettlement> {
	const { data, error } = await supabase.rpc("create_business_settlement", {
		p_transaction_item_ids: transactionItemIds,
		p_settlement_start: settlementStart,
		p_settlement_end: settlementEnd,
		p_settlement_additional_selector: settlementAdditionalSelector
	});

	if (error) {
		throw error;
	}

	return data;
}

// -----------------------------------------------------------------------------
// UPDATE SALES SELECTION
// -----------------------------------------------------------------------------

export async function updateBusinessSettlementSelection(
	businessSettlementId: number,
	transactionItemIds: number[],
	settlementStart: string,
	settlementEnd: string,
	settlementAdditionalSelector?: Json | undefined
): Promise<BusinessSettlement> {
	const { data, error } = await supabase.rpc("update_business_settlement_selection", {
		p_business_settlement_id: businessSettlementId,
		p_transaction_item_ids: transactionItemIds,
		p_settlement_start: settlementStart,
		p_settlement_end: settlementEnd,
		p_settlement_additional_selector: settlementAdditionalSelector ?? null
	});

	if (error) {
		throw error;
	}

	return data;
}

// -----------------------------------------------------------------------------
// UPDATE EXPENSES
// -----------------------------------------------------------------------------

export async function updateBusinessSettlementExpenses(
	businessSettlementId: number,
	expenses: SettlementExpenseInput[]
): Promise<BusinessSettlementExpense[]> {
	const { data, error } = await supabase.rpc("update_business_settlement_expenses", {
		p_business_settlement_id: businessSettlementId,
		p_expenses: expenses
	});

	if (error) {
		throw error;
	}

	return data;
}

// -----------------------------------------------------------------------------
// UPDATE SETTLEMENT RESULT
// -----------------------------------------------------------------------------

export async function updateBusinessSettlementResult(params: {
	businessSettlementId: number;

	settledLaborCost: number;
	settledPackagingCost: number;
	settledUtilityCost: number;
	settledIngredientCost: number;

	profitRetained: number;
	profitDistributed: number;
	deficitCovered: number;
}): Promise<BusinessSettlement> {
	const { data, error } = await supabase.rpc("update_business_settlement_result", {
		p_business_settlement_id: params.businessSettlementId,

		p_settled_labor_cost: params.settledLaborCost,
		p_settled_packaging_cost: params.settledPackagingCost,
		p_settled_utility_cost: params.settledUtilityCost,
		p_settled_ingredient_cost: params.settledIngredientCost,

		p_profit_retained: params.profitRetained,
		p_profit_distributed: params.profitDistributed,
		p_deficit_covered: params.deficitCovered
	});

	if (error) {
		throw error;
	}

	return data;
}

// -----------------------------------------------------------------------------
// UPDATE STATUS
// -----------------------------------------------------------------------------

export async function updateBusinessSettlementStatus(
	businessSettlementId: number,
	settlementStatus: SettlementStatus
): Promise<BusinessSettlement> {
	const { data, error } = await supabase.rpc("update_business_settlement_status", {
		p_business_settlement_id: businessSettlementId,
		p_settlement_status: settlementStatus
	});

	if (error) {
		throw error;
	}

	return data;
}

// -----------------------------------------------------------------------------
// DELETE
// -----------------------------------------------------------------------------

export async function deleteBusinessSettlement(businessSettlementId: number): Promise<void> {
	const { error } = await supabase.rpc("delete_business_settlement", {
		p_business_settlement_id: businessSettlementId
	});

	if (error) {
		throw error;
	}
}
