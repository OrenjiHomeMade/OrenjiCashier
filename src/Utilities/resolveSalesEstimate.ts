// Utilities/resolveSalesEstimate.ts
import type { TBusinessSettlement, TQSalesSummary, TSalesSummary } from "../Types/settlement";

export type TSalesEstimate = Omit<TSalesSummary, "otherCosts" | "remain">;

/**
 * Sales-side numbers only — no settled overrides. Prefers the live
 * selection query (settlementSummary) whenever one's been fetched, since
 * that's what reflects "I just toggled a transaction row" before saving.
 * Falls back to the last-persisted settlement record when the live query
 * hasn't run (e.g. viewing a settlement without ever touching the Sales
 * step, or a read-only SETTLED settlement where selection can't change).
 */
export function resolveSalesEstimate(
	settlement: TBusinessSettlement,
	settlementSummary: TQSalesSummary
): TSalesEstimate {
	return {
		itemSold: settlementSummary?.selectedItemCount ?? settlement.soldItems ?? 0,
		revenue: settlementSummary?.salesRevenue ?? settlement.salesRevenue,
		labor: settlementSummary?.salesLaborCost ?? settlement.salesLaborCost,
		ingredient: settlementSummary?.salesIngredientCost ?? settlement.salesIngredientCost,
		packing: settlementSummary?.salesPackagingCost ?? settlement.salesPackagingCost,
		utility: settlementSummary?.salesUtilityCost ?? settlement.salesUtilityCost
	};
}
