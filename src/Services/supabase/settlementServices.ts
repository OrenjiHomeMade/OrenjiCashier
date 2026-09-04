import { toast } from "react-toastify";
import type { Database, Json } from "../../Types/database";
import { supabase } from "./client";
import type { TBusinessSettlementEssential } from "../../Types/settlement";
import { getLocalTimestamp } from "../../Utilities/NumberFormater";

/**
 * Get business settlement lists.
 * USED IN: FinanceResult.tsx
 */
export async function getBusinessSettlementLists() {
	const { data, error } = await supabase.rpc("get_business_settlement_lists");
	if (error) {
		toast.error("Failed to fetch business settlement lists");
		throw error;
	}
	return data;
}

/**
 * Get a business settlement by ID.
 * USED IN: FinanceResult.tsx
 */
export async function getBusinessSettlementById(businessSettlementId: number) {
	const { data, error } = await supabase
		.from("business_settlement")
		.select("*")
		.eq("business_settlement_id", businessSettlementId)
		.is("deleted_at", null)
		.single();

	if (error) {
		toast.error("Failed to fetch business settlement");
		throw error;
	}

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

	if (error) {
		toast.error("Failed to fetch business settlements");
		throw error;
	}

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

	if (error) {
		toast.error("Failed to fetch settlement transaction items");
		throw error;
	}

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

	if (error) {
		toast.error("Failed to fetch settlement expenses");
		throw error;
	}

	return data;
}

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

type BusinessSettlement = Database["public"]["Tables"]["business_settlement"]["Row"];
// type BusinessSettlementUpdate = Database["public"]["Tables"]["business_settlement"]["Update"];
type BusinessSettlementExpense = Database["public"]["Tables"]["business_settlement_expense"]["Row"];

type SettlementExpenseInput = {
	business_expense_id: number;
	allocated_amount: number;
};

type SettlementStatus = "DRAFT" | "CONFIRMED" | "SETTLED";

type createBusinessSettlementParam = Omit<TBusinessSettlementEssential, "settlementStatus"> & {
	transactionItemIds: number[];
};

/**
 * Create a new business settlement.
 * USED IN: FinanceResult.tsx
 */
export async function createBusinessSettlement({
	settlementName,
	transactionItemIds,
	settlementStart,
	settlementEnd,
	settlementFilter
}: createBusinessSettlementParam): Promise<BusinessSettlement> {
	const { data, error } = await supabase.rpc("create_business_settlement", {
		p_settlement_name: settlementName,
		p_transaction_item_ids: transactionItemIds,
		p_settlement_start: getLocalTimestamp(settlementStart!),
		p_settlement_end: getLocalTimestamp(settlementEnd!),
		p_settlement_additional_selector: settlementFilter
	});

	if (error) {
		throw error;
	}

	return data;
}

type updateBussinesSettlementParam = {
	settlementId: number;
	changes: Partial<TBusinessSettlementEssential>;
};

export const updateBusinessSettlement = async ({ settlementId, changes }: updateBussinesSettlementParam) => {
	const { data, error } = await supabase
		.from("business_settlement")
		.update({
			...(changes.settlementName !== undefined && {
				settlement_name: changes.settlementName
			}),
			...(changes.settlementStart !== undefined && {
				settlement_start: getLocalTimestamp(changes.settlementStart!)
			}),
			...(changes.settlementEnd !== undefined && {
				settlement_end: getLocalTimestamp(changes.settlementEnd!)
			}),
			...(changes.settlementFilter !== undefined && {
				settlement_additional_selector: changes.settlementFilter
			}),
			...(changes.settlementStatus !== undefined && {
				settlement_status: changes.settlementStatus
			}),
			updated_at: getLocalTimestamp(new Date())
		})
		.eq("business_settlement_id", settlementId)
		.select()
		.single();

	if (error) throw error;

	return data;
};

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
