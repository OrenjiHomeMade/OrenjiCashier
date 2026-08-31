import type { TTransaction, TTransactionItem } from "../Types/transaction";
import type {
	TAdjustment,
	TAdjustmentCategory,
	TDistributionEntry,
	TDistributionMode,
	TSalesSummary
} from "../Types/finance";

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

export function calcItemsSoldCount(transactions: TTransaction[]): number {
	return transactions.reduce(
		(sum, transaction) => sum + transaction.transactionItems.reduce((itemSum, item) => itemSum + item.quantity, 0),
		0
	);
}

export type TProductBreakdown = {
	productName: string;
	quantity: number;
	revenue: number;
	ingredient: number;
	labor: number;
	utility: number;
	packaging: number;
	margin: number;
};

/** Per-product decomposition of revenue into cost components + margin — "product bound". */
export function aggregateSalesByProduct(transactions: TTransaction[]): TProductBreakdown[] {
	const map = new Map<string, TProductBreakdown>();

	for (const transaction of transactions) {
		for (const item of transaction.transactionItems) {
			const revenue = item.subtotal ?? item.unitPrice * item.quantity;
			const costs = calcItemCosts(item);
			const margin = revenue - costs.ingredient - costs.labor - costs.utilities - costs.packaging;

			const existing = map.get(item.productName) ?? {
				productName: item.productName,
				quantity: 0,
				revenue: 0,
				ingredient: 0,
				labor: 0,
				utility: 0,
				packaging: 0,
				margin: 0
			};

			existing.quantity += item.quantity;
			existing.revenue += revenue;
			existing.ingredient += costs.ingredient;
			existing.labor += costs.labor;
			existing.utility += costs.utilities;
			existing.packaging += costs.packaging;
			existing.margin += margin;

			map.set(item.productName, existing);
		}
	}

	return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export type TAdjustmentBreakdown = {
	category: TAdjustmentCategory;
	amount: number;
};

/** Adjustment total broken down by category — cost that's unbound from any product. */
export function aggregateAdjustmentsByCategory(adjustments: TAdjustment[]): TAdjustmentBreakdown[] {
	const map = new Map<TAdjustmentCategory, number>();

	for (const adjustment of adjustments) {
		map.set(adjustment.category, (map.get(adjustment.category) ?? 0) + adjustment.amount);
	}

	return Array.from(map.entries())
		.map(([category, amount]) => ({ category, amount }))
		.sort((a, b) => b.amount - a.amount);
}
