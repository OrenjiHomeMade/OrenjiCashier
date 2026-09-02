export type TSettlementStatus = "DRAFT" | "CONFIRMED" | "SETTLED";
export type TFinanceStep = "SALES" | "SETTLEMENT" | "SUMMARY";

export type TBusinessSettlementLists = {
	settlementId: number;
	settlementName: string;
	settlementStatus: TSettlementStatus;
	settlementLastUpdatedAt: string | null;
	settlementCreatedAt: string;
	soldItems?: number;
	soldCategories?: number;
};

export type TBusinessSettlement = TBusinessSettlementLists & {
	settlementStart: string | null;
	settlementEnd: string | null;
	settlementFilter: Json | null;

	salesRevenue: number;
	salesIngredientCost: number;
	salesLaborCost: number;
	salesPackagingCost: number;
	salesUtilityCost: number;
	salesMargin: number;

	settledIngredientCost: number | null;
	settledLaborCost: number | null;
	settledPackagingCost: number | null;
	settledUtilityCost: number | null;
	totalAdditionalExpenses: number | null;

	profitDistributed: number | null;
	profitRetained: number | null;
	deficitCovered: number | null;
};
