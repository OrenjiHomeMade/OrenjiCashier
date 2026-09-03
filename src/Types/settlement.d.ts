export type TSettlementStatus = "DRAFT" | "CONFIRMED" | "SETTLED";
export type TSettlementStep = "SALES" | "SETTLEMENT" | "SUMMARY";

export type TBusinessSettlementEssential = {
	settlementName: string;
	settlementStart: string | null;
	settlementEnd: string | null;
	settlementFilter: Json | null;
	settlementStatus: TSettlementStatus;
};

export type TBusinessSettlementLists = {
	settlementId: number | null;
	settlementName: string;
	settlementStatus: TSettlementStatus;
	settlementLastUpdatedAt: string | null;
	settlementCreatedAt: string | null;
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
