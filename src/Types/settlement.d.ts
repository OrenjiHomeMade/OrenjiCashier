export type TSettlementStatus = "DRAFT" | "CONFIRMED" | "SETTLED";
export type TSettlementStep = "SALES" | "SETTLEMENT" | "SUMMARY";

export type TBusinessSettlementItemFilter = {
	settlementStart: Date | null;
	settlementEnd: Date | null;
	settlementFilter: Json | null;
};

export type TBusinessSettlementEssential = {
	settlementName: string;
	settlementStatus: TSettlementStatus;
} & TBusinessSettlementItemFilter;

export type TBusinessItemsAggregate = {
	soldItems?: number;
	soldCategories?: number;
};

export type TBusinessSettlementLists = {
	settlementId: number | null;
	settlementName: string;
	settlementStatus: TSettlementStatus;
	settlementLastUpdatedAt: Date | null;
	settlementCreatedAt: Date | null;
} & TBusinessItemsAggregate;

export type TBusinessSettlementCosts = {
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

export type TBusinessSettlement = TBusinessSettlementLists &
	TBusinessSettlementItemFilter &
	TBusinessSettlementCosts &
	Partial<TBusinessItemsAggregate>;

export type TSalesSummary = {
	itemSold: number;
	revenue: number;
	labor: number;
	ingredient: number;
	packing: number;
	utility: number;
	otherCosts: number;
	remain: number;
};

export type TSalesFilter = {
	settlementId?: number;
	isReadOnly: boolean;
	startDate?: string;
	endDate?: string;
	category?: Array<string>;
	productName?: Array<string>;
	page: number;
};
