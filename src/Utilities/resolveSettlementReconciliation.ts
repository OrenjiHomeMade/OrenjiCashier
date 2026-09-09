// Utilities/resolveSettlementReconciliation.ts
import type { TBusinessExpense } from "../Types/expense";

export type TSettlementReconciliation = {
	revenue: number;
	settledLaborCost: number;
	settledPackagingCost: number;
	settledIngredientCost: number;
	settledUtilityCost: number;
	otherExpenses: number;
	totalSettledCost: number;
	balance: number; // revenue - totalSettledCost. >= 0 profit, < 0 deficit
	isDeficit: boolean;
};

function sumSelected(pool: TBusinessExpense[], selectedIds: string[]): number {
	return pool.filter((e) => selectedIds.includes(e.id)).reduce((sum, e) => sum + e.originalAmount, 0);
}

export function resolveSettlementReconciliation(params: {
	revenue: number;
	laborActual: number;
	packagingEstimate: number;
	ingredientEstimate: number;
	expenses: TBusinessExpense[];
	selectedUtilityIds: string[];
	selectedAdditionalIds: string[];
}): TSettlementReconciliation {
	const utilityPool = params.expenses.filter((e) => e.section === "UTILITIES");
	const additionalPool = params.expenses.filter((e) => e.section === "ADDITIONAL");

	const settledLaborCost = params.laborActual;
	const settledPackagingCost = params.packagingEstimate; // hidden, estimate stands in until that flow exists
	const settledIngredientCost = params.ingredientEstimate; // same
	const settledUtilityCost = sumSelected(utilityPool, params.selectedUtilityIds);
	const otherExpenses = sumSelected(additionalPool, params.selectedAdditionalIds);

	const totalSettledCost =
		settledLaborCost + settledPackagingCost + settledIngredientCost + settledUtilityCost + otherExpenses;
	const balance = params.revenue - totalSettledCost;

	return {
		revenue: params.revenue,
		settledLaborCost,
		settledPackagingCost,
		settledIngredientCost,
		settledUtilityCost,
		otherExpenses,
		totalSettledCost,
		balance,
		isDeficit: balance < 0
	};
}
