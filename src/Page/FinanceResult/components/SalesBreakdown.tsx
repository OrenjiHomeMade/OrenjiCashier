import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import styles from "./SalesBreakdown.module.css";
import CurrencyStat from "./CurrencyStat";
import EChart from "../../../Component/Echart/Echart";
import { formatRupiah } from "../../../Utilities/NumberFormater";
import type {
	TBusinessSettlement,
	TProductBreakdown,
	TQSalesSummary,
	// TQSalesSummary,
	TSalesSummary,
	TSettlementStep
} from "../../../Types/settlement";

/* =========================================================
   COLORS
   ========================================================= */

const COLOR = {
	ingredient: "#b25e34",
	labor: "#8e97ca",
	packing: "#de9155",
	utility: "#cfff0e",
	adjustment: "#d14957",
	margin: "#efac32",
	profitNegative: "#ec2c5c",
	qty: "#583f16"
};

// const ADJUSTMENT_COLORS: Record<string, string> = {
// 	Utilities: "#8e97ca",
// 	"Team Meal": "#79a354",
// 	Transportation: "#de9155",
// 	"Event Expense": "#b25e34",
// 	Bonus: "#efac32",
// 	"Other Expense": "#d14957"
// };

function compactRupiah(value: number): string {
	const abs = Math.abs(value);

	if (abs >= 1_000_000) {
		return `${(value / 1_000_000).toFixed(1)}jt`;
	}

	if (abs >= 1_000) {
		return `${Math.round(value / 1_000)}rb`;
	}

	return `${value}`;
}

/* =========================================================
   CHART OPTION BUILDERS
   ========================================================= */

type TBreakdownGroupBy = "PRODUCT" | "CATEGORY";

function getGroupLabel(row: TProductBreakdown, groupBy: TBreakdownGroupBy): string {
	if (groupBy === "CATEGORY") return row.productCategory || row.productName;
	return row.productName || row.productCategory;
}

function buildProductBreakdownOption(data: TProductBreakdown[], groupBy: TBreakdownGroupBy): EChartsOption {
	const labels = data.map((row) => getGroupLabel(row, groupBy));
	const hasZoom = labels.length > 20;

	return {
		grid: {
			left: 8,
			right: 48,
			top: 8,
			bottom: hasZoom ? 56 : 42,
			containLabel: true
		},

		tooltip: {
			trigger: "axis",
			axisPointer: { type: "shadow" },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			formatter: (params: any) => {
				const items = Array.isArray(params) ? params : [params];
				const label = items[0]?.name ?? "";
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const lines = items.map((item: any) => {
					const value = item.seriesName === "Qty" ? `${item.value}` : formatRupiah(Number(item.value));
					return `${item.marker} ${item.seriesName}: ${value}`;
				});
				return [label, ...lines].join("<br/>");
			}
		},

		legend: {
			bottom: hasZoom ? 28 : 8,
			textStyle: {
				color: "#756d67",
				fontSize: 11
			},
			itemWidth: 10,
			itemHeight: 10
		},

		xAxis: {
			type: "category",
			data: labels,
			axisLabel: {
				color: "#583f16",
				fontSize: 11,
				interval: 0,
				rotate: labels.length > 8 ? 35 : 0
			}
		},

		yAxis: [
			{
				type: "value",
				name: "Amount",
				nameTextStyle: { color: "#756d67", fontSize: 10 },
				axisLabel: {
					formatter: (value: number) => compactRupiah(value),
					color: "#756d67"
				},
				splitLine: {
					lineStyle: {
						color: "#efd8b5"
					}
				}
			},
			{
				type: "value",
				name: "Qty",
				position: "right",
				nameTextStyle: { color: "#756d67", fontSize: 10 },
				axisLabel: { color: "#756d67" },
				splitLine: { show: false }
			}
		],

		dataZoom: hasZoom
			? [
					{
						type: "slider",
						xAxisIndex: 0,
						startValue: 0,
						endValue: 19,
						height: 12,
						left: 8,
						right: 28,
						bottom: 8,
						showDetail: false,
						zoomLock: true
					},
					{
						type: "inside",
						xAxisIndex: 0,
						startValue: 0,
						endValue: 19,
						zoomLock: true
					}
				]
			: undefined,

		series: [
			{
				name: "Labor",
				type: "bar",
				stack: "total",
				yAxisIndex: 0,
				itemStyle: {
					color: COLOR.labor
				},
				data: data.map((p) => p.laborCost)
			},
			{
				name: "Ingredient",
				type: "bar",
				stack: "total",
				yAxisIndex: 0,
				itemStyle: {
					color: COLOR.ingredient
				},
				data: data.map((p) => p.ingredientCost)
			},
			{
				name: "Packing Cost",
				type: "bar",
				stack: "total",
				yAxisIndex: 0,
				itemStyle: {
					color: COLOR.packing
				},
				data: data.map((p) => p.packagingCost)
			},
			{
				name: "Utility Cost",
				type: "bar",
				stack: "total",
				yAxisIndex: 0,
				itemStyle: {
					color: COLOR.utility
				},
				data: data.map((p) => p.utilityCost)
			},
			{
				name: "Margin",
				type: "bar",
				stack: "total",
				yAxisIndex: 0,
				itemStyle: {
					color: COLOR.margin
				},
				data: data.map((p) => p.margin)
			},
			{
				name: "Qty",
				type: "bar",
				stack: "quantity",
				yAxisIndex: 1,
				symbolSize: 6,
				itemStyle: {
					color: COLOR.margin
				},
				data: data.map((p) => p.quantity)
			}
		] as EChartsOption["series"]
	};
}

// function buildAdjustmentBreakdownOption(data: TAdjustmentBreakdown[]): EChartsOption {
// 	return {
// 		tooltip: {
// 			trigger: "item",
// 			valueFormatter: (value) => formatRupiah(Number(value))
// 		},

// 		legend: {
// 			bottom: 0,
// 			textStyle: {
// 				color: "#756d67",
// 				fontSize: 11
// 			},
// 			itemWidth: 10,
// 			itemHeight: 10
// 		},

// 		series: [
// 			{
// 				type: "pie",
// 				radius: ["45%", "72%"],
// 				center: ["50%", "42%"],
// 				avoidLabelOverlap: true,

// 				itemStyle: {
// 					borderColor: "#fefcfa",
// 					borderWidth: 2
// 				},

// 				label: {
// 					formatter: "{b}\n{d}%",
// 					color: "#583f16",
// 					fontSize: 11
// 				},

// 				data: data.map((entry) => ({
// 					name: entry.category,
// 					value: entry.amount,
// 					itemStyle: {
// 						color: ADJUSTMENT_COLORS[entry.category] ?? COLOR.other
// 					}
// 				}))
// 			}
// 		]
// 	};
// }

/* =========================================================
   SALES BREAKDOWN
   Revenue allocation:
   Revenue = COGS + Labor + Other Costs + Margin
   ========================================================= */

// function buildSalesBreakdownOption(summary: TSalesSummary): EChartsOption {
// 	const data = [
// 		{
// 			name: "COGS",
// 			value: summary.cogs,
// 			itemStyle: { color: COLOR.ingredient }
// 		},
// 		{
// 			name: "Labor",
// 			value: summary.labor,
// 			itemStyle: { color: COLOR.labor }
// 		},
// 		{
// 			name: "Other costs",
// 			value: summary.otherCosts,
// 			itemStyle: { color: COLOR.other }
// 		},
// 		{
// 			name: "Margin",
// 			value: summary.margin,
// 			itemStyle: { color: COLOR.margin }
// 		}
// 	];

// 	return {
// 		tooltip: {
// 			trigger: "item",
// 			valueFormatter: (value) => formatRupiah(Number(value))
// 		},

// 		legend: {
// 			bottom: 0,
// 			textStyle: {
// 				color: "#756d67",
// 				fontSize: 11
// 			},
// 			itemWidth: 10,
// 			itemHeight: 10
// 		},

// 		series: [
// 			{
// 				name: "Revenue allocation",
// 				type: "pie",
// 				radius: ["45%", "72%"],
// 				center: ["50%", "42%"],
// 				avoidLabelOverlap: true,

// 				itemStyle: {
// 					borderColor: "#fefcfa",
// 					borderWidth: 2
// 				},

// 				label: {
// 					formatter: "{b}\n{d}%",
// 					color: "#583f16",
// 					fontSize: 11
// 				},

// 				data
// 			}
// 		]
// 	};
// }

/* =========================================================
   PROGRESSIVE SECTION VISIBILITY
   ========================================================= */

type TSectionKey = "sales" | "settlement" | "breakdown";

const SECTION_ORDER: Record<TSettlementStep, TSectionKey[]> = {
	SALES: ["sales"],
	SETTLEMENT: ["sales", "settlement"],
	SUMMARY: ["sales", "settlement", "breakdown"]
};

const FOCUS_SECTION: Record<TSettlementStep, TSectionKey> = {
	SALES: "sales",
	SETTLEMENT: "settlement",
	SUMMARY: "breakdown"
};

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export type SalesBreakdownProps = {
	step: TSettlementStep;
	// transactions: TTransaction[];
	settlement: TBusinessSettlement;
	productBreakdown: TProductBreakdown[];
	settlementSummary: TQSalesSummary;
	breakdownGroupBy: TBreakdownGroupBy;
	onBreakdownGroupByChange: (groupBy: TBreakdownGroupBy) => void;
	// adjustments: TAdjustment[];
	// adjustmentsTotal: number;
	// finalResult: number;
};

export default function SalesBreakdown({
	step,
	// transactions,
	settlement,
	productBreakdown,
	settlementSummary,
	breakdownGroupBy,
	onBreakdownGroupByChange
	// adjustments,
	// adjustmentsTotal,
	// finalResult
}: SalesBreakdownProps) {
	const visibleSections = SECTION_ORDER[step];
	const focusSection = FOCUS_SECTION[step];

	let remain = 0;
	if (settlement.profitDistributed) remain += settlement.profitDistributed;
	if (settlement.profitRetained) remain += settlement.profitRetained;
	if (settlement.deficitCovered) remain += settlement.deficitCovered;
	if (remain === 0) {
		remain = settlementSummary?.salesMargin ?? settlement.salesMargin;
	}

	const remainLabel = remain > 0 ? "Profit" : remain < 0 ? "Deficit" : "Even";

	const salesSummary: TSalesSummary = {
		itemSold: settlementSummary?.selectedItemCount ?? settlement.soldItems ?? 0,
		revenue: settlementSummary?.salesRevenue ?? settlement.salesRevenue,
		labor: settlement.settledLaborCost ?? settlementSummary?.salesLaborCost ?? settlement.salesLaborCost,
		ingredient:
			settlement.settledIngredientCost ??
			settlementSummary?.salesIngredientCost ??
			settlement.salesIngredientCost,
		packing:
			settlement.settledPackagingCost ?? settlementSummary?.salesPackagingCost ?? settlement.salesPackagingCost,
		utility: settlement.settledUtilityCost ?? settlementSummary?.salesUtilityCost ?? settlement.salesUtilityCost,
		otherCosts: settlement.totalAdditionalExpenses ?? 0,
		remain: remain
	};
	// const itemsSold = useMemo(() => calcItemsSoldCount(transactions), [transactions]);

	// const productBreakdown = useMemo(() => aggregateSalesByProduct(transactions), [transactions]);

	// const adjustmentBreakdown = useMemo(() => aggregateAdjustmentsByCategory(adjustments), [adjustments]);

	return (
		<aside className={`${styles.panel} card`}>
			{visibleSections.includes("sales") && (
				<SalesSummarySection
					focused={focusSection === "sales"}
					summary={salesSummary}
					itemsSold={salesSummary.itemSold}
					productBreakdown={productBreakdown}
					salesStatus={remainLabel}
					breakdownGroupBy={breakdownGroupBy}
					onBreakdownGroupByChange={onBreakdownGroupByChange}
				/>
			)}

			{/* {visibleSections.includes("settlement") && (
				<AdjustmentSummarySection
					focused={focusSection === "settlement"}
					total={adjustmentsTotal}
					breakdown={adjustmentBreakdown}
				/>
			)}

			{visibleSections.includes("breakdown") && (
				<FinalBreakdownSection
					summary={salesSummary}
					adjustmentsTotal={adjustmentsTotal}
					finalResult={finalResult}
				/>
			)} */}
		</aside>
	);
}

/* =========================================================
   SECTION: Sales Summary
   ========================================================= */

function SalesSummarySection({
	focused,
	summary,
	itemsSold,
	productBreakdown,
	salesStatus,
	breakdownGroupBy,
	onBreakdownGroupByChange
}: {
	focused: boolean;
	summary: TSalesSummary;
	itemsSold: number;
	productBreakdown: TProductBreakdown[];
	salesStatus: string;
	breakdownGroupBy: TBreakdownGroupBy;
	onBreakdownGroupByChange: (groupBy: TBreakdownGroupBy) => void;
}) {
	const [isExpanded, setIsExpanded] = useState(focused);

	const chartOption = useMemo(
		() => buildProductBreakdownOption(productBreakdown, breakdownGroupBy),
		[productBreakdown, breakdownGroupBy]
	);

	return (
		<section className={`${styles.section} ${focused ? styles.sectionFocused : styles.sectionCompact}`}>
			<div className={styles.sectionHeader}>
				<h3 className={styles.sectionTitle}>
					<span className={`${styles.dot} ${styles.dotSales}`} aria-hidden="true" />
					Sales summary
				</h3>

				<div className={styles.sectionHeaderActions}>
					{isExpanded && productBreakdown.length > 0 && (
						<div className={styles.groupToggle} role="group" aria-label="Group breakdown by">
							<button
								type="button"
								className={breakdownGroupBy === "PRODUCT" ? styles.groupActive : styles.groupInactive}
								onClick={() => onBreakdownGroupByChange("PRODUCT")}
							>
								Product
							</button>
							<button
								type="button"
								className={breakdownGroupBy === "CATEGORY" ? styles.groupActive : styles.groupInactive}
								onClick={() => onBreakdownGroupByChange("CATEGORY")}
							>
								Category
							</button>
						</div>
					)}

					{productBreakdown.length > 0 && (
						<button
							type="button"
							className={styles.expandButton}
							onClick={() => setIsExpanded((value) => !value)}
						>
							{isExpanded ? "Hide" : `By ${breakdownGroupBy.toLowerCase()}`}
							<span
								className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`}
								aria-hidden="true"
							>
								⌄
							</span>
						</button>
					)}
				</div>
			</div>

			<div className={focused ? styles.statGrid : styles.statRow}>
				<CurrencyStat
					label="Transactions"
					value={summary.itemSold}
					format="number"
					tone="muted"
					size={focused ? "md" : "sm"}
				/>

				<CurrencyStat
					label="Items sold"
					value={itemsSold}
					format="number"
					tone="muted"
					size={focused ? "md" : "sm"}
				/>

				<CurrencyStat label="Revenue" value={summary.revenue} tone="accent" size={focused ? "lg" : "md"} />

				{focused && (
					<>
						<CurrencyStat
							label="COGS"
							value={summary.labor + summary.ingredient + summary.utility + summary.packing}
							tone="muted"
						/>
						<CurrencyStat label="Labor" value={summary.labor} tone="muted" />
						<CurrencyStat label="Other costs" value={summary.otherCosts} tone="muted" />
						<CurrencyStat label={salesStatus} value={summary.remain} tone="positive" />
					</>
				)}
			</div>

			{isExpanded && productBreakdown.length > 0 && (
				<div className={styles.chartWrap}>
					<EChart option={chartOption} height={Math.max(180, Math.min(productBreakdown.length, 20) * 34)} />
				</div>
			)}

			{productBreakdown.length === 0 && focused && (
				<p className={styles.emptyNote}>No transactions selected yet.</p>
			)}
		</section>
	);
}

/* =========================================================
   SECTION: Adjustment Summary
   ========================================================= */

// function AdjustmentSummarySection({
// 	focused,
// 	total,
// 	breakdown
// }: {
// 	focused: boolean;
// 	total: number;
// 	breakdown: TAdjustmentBreakdown[];
// }) {
// 	const [isExpanded, setIsExpanded] = useState(focused);

// 	const chartOption = useMemo(() => buildAdjustmentBreakdownOption(breakdown), [breakdown]);

// 	return (
// 		<section className={`${styles.section} ${focused ? styles.sectionFocused : styles.sectionCompact}`}>
// 			<div className={styles.sectionHeader}>
// 				<h3 className={styles.sectionTitle}>
// 					<span className={`${styles.dot} ${styles.dotAdjustment}`} aria-hidden="true" />
// 					Adjustment summary
// 				</h3>

// 				{breakdown.length > 0 && (
// 					<button
// 						type="button"
// 						className={styles.expandButton}
// 						onClick={() => setIsExpanded((value) => !value)}
// 					>
// 						{isExpanded ? "Hide" : "By category"}

// 						<span
// 							className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`}
// 							aria-hidden="true"
// 						>
// 							⌄
// 						</span>
// 					</button>
// 				)}
// 			</div>

// 			<div className={focused ? styles.statGrid : styles.statRow}>
// 				<CurrencyStat label="Total adjustments" value={total} tone="negative" size={focused ? "lg" : "md"} />
// 			</div>

// 			{isExpanded && breakdown.length > 0 && (
// 				<div className={styles.chartWrap}>
// 					<EChart option={chartOption} height={220} />
// 				</div>
// 			)}

// 			{breakdown.length === 0 && focused && <p className={styles.emptyNote}>No adjustments added yet.</p>}
// 		</section>
// 	);
// }

/* =========================================================
   SECTION: Sales Breakdown
   Revenue allocation:
   COGS + Labor + Other costs + Margin = Revenue

   Adjustments are intentionally excluded because they are
   applied after the initial revenue allocation.
   ========================================================= */

// function FinalBreakdownSection({
// 	summary,
// 	adjustmentsTotal,
// 	finalResult
// }: {
// 	summary: TSalesSummary;
// 	adjustmentsTotal: number;
// 	finalResult: number;
// }) {
// 	const chartOption = useMemo(() => buildSalesBreakdownOption(summary), [summary]);

// 	return (
// 		<section className={`${styles.section} ${styles.sectionFocused} ${styles.sectionBreakdown}`}>
// 			<div className={styles.sectionHeader}>
// 				<h3 className={styles.sectionTitle}>
// 					<span className={`${styles.dot} ${styles.dotBreakdown}`} aria-hidden="true" />
// 					Sales breakdown
// 				</h3>
// 			</div>

// 			<div className={styles.chartWrap}>
// 				<EChart option={chartOption} height={240} />
// 			</div>

// 			<div className={styles.finalRow}>
// 				<div>
// 					<span>Profit after {formatRupiah(adjustmentsTotal)} adjustment</span>
// 				</div>

// 				<span className={finalResult < 0 ? styles.negativeBig : styles.positiveBig}>
// 					{formatRupiah(finalResult)}
// 				</span>
// 			</div>
// 		</section>
// 	);
// }
