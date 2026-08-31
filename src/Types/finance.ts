/* =========================================================
   FINANCE — TYPES
   Types for the Financial Allocation workflow (Sales →
   Adjustments → Summary). Built on top of the existing
   TTransaction / TProductProfile types where possible.
   ========================================================= */

export type TAllocationStatus = "DRAFT" | "CONFIRMED" | "DISTRIBUTED";

export type TFinanceStep = "SALES" | "ADJUSTMENTS" | "SUMMARY";

/* =========================================================
   ADJUSTMENTS
   ========================================================= */

export type TAdjustmentCategory =
	| "Utilities"
	| "Team Meal"
	| "Transportation"
	| "Event Expense"
	| "Bonus"
	| "Other Expense";

export const ADJUSTMENT_CATEGORIES: TAdjustmentCategory[] = [
	"Utilities",
	"Team Meal",
	"Transportation",
	"Event Expense",
	"Bonus",
	"Other Expense"
];

export type TAdjustment = {
	id: string;
	description: string;
	category: TAdjustmentCategory;
	amount: number;
};

/* =========================================================
   DISTRIBUTION
   ========================================================= */

export type TDistributionMode = "PERCENTAGE" | "FIXED";

/**
 * value is either a percentage point (0-100) when the parent
 * allocation's distributionMode is "PERCENTAGE", or a Rupiah
 * amount when it is "FIXED".
 */
export type TDistributionEntry = {
	id: string;
	label: string;
	value: number;
};

export const DEFAULT_DISTRIBUTION_LABELS = ["Salary", "Reserve", "Family", "Business"];

/* =========================================================
   ALLOCATION
   ========================================================= */

export type TFinanceAllocation = {
	id: string;
	name: string;
	status: TAllocationStatus;
	createdAt: string;
	updatedAt: string;
	transactionIds: number[];
	adjustments: TAdjustment[];
	distributionMode: TDistributionMode;
	distribution: TDistributionEntry[];
};

/* =========================================================
   FILTERS & DERIVED RESULTS
   ========================================================= */

export type TSalesFilter = {
	startDate?: string;
	endDate?: string;
	category?: string;
	productName?: string;
};

export type TSalesSummary = {
	transactionCount: number;
	revenue: number;
	cogs: number;
	labor: number;
	otherCosts: number;
	margin: number;
};
