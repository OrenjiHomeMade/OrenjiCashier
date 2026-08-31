import type { TTransaction, TTransactionItem } from "../Types/transaction";
import type { TAdjustment, TDistributionEntry, TDistributionMode, TSalesSummary } from "../Types/finance";

/** Per-item cost breakdown, multiplied out by quantity. */
export function calcItemCosts(item: TTransactionItem) {
	return {
		ingredient: item.unitCostIngredient * item.quantity,
		labor: item.unitCostLabor * item.quantity,
		utilities: item.unitCostUtilities * item.quantity,
		packaging: item.unitCostPackaging * item.quantity
	};
}

/**
 * Revenue / COGS / Labor / Other costs / Margin for a set of transactions.
 * COGS = ingredient cost. Other costs = utilities + packaging.
 * Margin = Revenue - COGS - Labor - Other costs (never called "Profit").
 */
export function calcSalesSummary(transactions: TTransaction[]): TSalesSummary {
	let revenue = 0;
	let cogs = 0;
	let labor = 0;
	let otherCosts = 0;

	for (const transaction of transactions) {
		for (const item of transaction.transactionItems) {
			revenue += item.subtotal ?? item.unitPrice * item.quantity;

			const costs = calcItemCosts(item);
			cogs += costs.ingredient;
			labor += costs.labor;
			otherCosts += costs.utilities + costs.packaging;
		}
	}

	return {
		transactionCount: transactions.length,
		revenue,
		cogs,
		labor,
		otherCosts,
		margin: revenue - cogs - labor - otherCosts
	};
}

export function calcAdjustmentsTotal(adjustments: TAdjustment[]): number {
	return adjustments.reduce((sum, adjustment) => sum + adjustment.amount, 0);
}

export function calcAdjustedResult(salesMargin: number, adjustmentsTotal: number): number {
	return salesMargin - adjustmentsTotal;
}

/** Total Rupiah amount actually allocated across all distribution entries. */
export function calcDistributionTotal(
	distribution: TDistributionEntry[],
	mode: TDistributionMode,
	finalResult: number
): number {
	if (mode === "FIXED") {
		return distribution.reduce((sum, entry) => sum + entry.value, 0);
	}

	const totalPercent = distribution.reduce((sum, entry) => sum + entry.value, 0);
	return Math.round((totalPercent / 100) * finalResult);
}

export function calcDistributionPercentTotal(distribution: TDistributionEntry[]): number {
	return distribution.reduce((sum, entry) => sum + entry.value, 0);
}

/** The actual Rupiah amount a single distribution entry resolves to. */
export function resolveDistributionAmount(
	entry: TDistributionEntry,
	mode: TDistributionMode,
	finalResult: number
): number {
	if (mode === "FIXED") {
		return entry.value;
	}
	return Math.round((entry.value / 100) * finalResult);
}
