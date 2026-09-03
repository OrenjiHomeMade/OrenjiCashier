import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import styles from "./SalesBreakdown.module.css";
import CurrencyStat from "./CurrencyStat";
import EChart from "../../../Component/Echart/Echart";
import { formatRupiah } from "../../../Utilities/NumberFormater";
import {
	aggregateAdjustmentsByCategory,
	aggregateSalesByProduct,
	calcItemsSoldCount
} from "../../../Utilities/financeCalculations";
import type { TAdjustmentBreakdown, TProductBreakdown } from "../../../Utilities/financeCalculations";
import type { TAdjustment, TSalesSummary } from "../../../Types/finance";
import type { TTransaction } from "../../../Types/transaction";
import type { TSettlementStep } from "../../../Types/settlement";

/* =========================================================
   COLORS
   ========================================================= */

const COLOR = {
	ingredient: "#b25e34",
	labor: "#8e97ca",
	other: "#de9155",
	adjustment: "#d14957",
	margin: "#efac32",
	profitNegative: "#ec2c5c"
};

const ADJUSTMENT_COLORS: Record<string, string> = {
	Utilities: "#8e97ca",
	"Team Meal": "#79a354",
	Transportation: "#de9155",
	"Event Expense": "#b25e34",
	Bonus: "#efac32",
	"Other Expense": "#d14957"
};

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

function buildProductBreakdownOption(data: TProductBreakdown[]): EChartsOption {
	const products = data.map((p) => p.productName);
	const hasZoom = products.length > 20;

	return {
		grid: {
			left: 8,
			right: 28,
			top: 8,
			bottom: hasZoom ? 56 : 42,
			containLabel: true
		},

		tooltip: {
			trigger: "axis",
			axisPointer: { type: "shadow" },
			valueFormatter: (value) => formatRupiah(Number(value))
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
			data: products,
			axisLabel: {
				color: "#583f16",
				fontSize: 11,
				interval: 0,
				rotate: products.length > 8 ? 35 : 0
			}
		},

		yAxis: {
			type: "value",
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
				name: "Ingredient (COGS)",
				type: "bar",
				stack: "total",
				itemStyle: {
					color: COLOR.ingredient
				},
				data: data.map((p) => p.ingredient)
			},
			{
				name: "Labor",
				type: "bar",
				stack: "total",
				itemStyle: {
					color: COLOR.labor
				},
				data: data.map((p) => p.labor)
			},
			{
				name: "Other costs",
				type: "bar",
				stack: "total",
				itemStyle: {
					color: COLOR.other
				},
				data: data.map((p) => p.utility + p.packaging)
			},
			{
				name: "Margin",
				type: "bar",
				stack: "total",
				itemStyle: {
					color: COLOR.margin
				},
				data: data.map((p) => p.margin)
			}
		]
	};
}

function buildAdjustmentBreakdownOption(data: TAdjustmentBreakdown[]): EChartsOption {
	return {
		tooltip: {
			trigger: "item",
			valueFormatter: (value) => formatRupiah(Number(value))
		},

		legend: {
			bottom: 0,
			textStyle: {
				color: "#756d67",
				fontSize: 11
			},
			itemWidth: 10,
			itemHeight: 10
		},

		series: [
			{
				type: "pie",
				radius: ["45%", "72%"],
				center: ["50%", "42%"],
				avoidLabelOverlap: true,

				itemStyle: {
					borderColor: "#fefcfa",
					borderWidth: 2
				},

				label: {
					formatter: "{b}\n{d}%",
					color: "#583f16",
					fontSize: 11
				},

				data: data.map((entry) => ({
					name: entry.category,
					value: entry.amount,
					itemStyle: {
						color: ADJUSTMENT_COLORS[entry.category] ?? COLOR.other
					}
				}))
			}
		]
	};
}

/* =========================================================
   SALES BREAKDOWN
   Revenue allocation:
   Revenue = COGS + Labor + Other Costs + Margin
   ========================================================= */

function buildSalesBreakdownOption(summary: TSalesSummary): EChartsOption {
	const data = [
		{
			name: "COGS",
			value: summary.cogs,
			itemStyle: { color: COLOR.ingredient }
		},
		{
			name: "Labor",
			value: summary.labor,
			itemStyle: { color: COLOR.labor }
		},
		{
			name: "Other costs",
			value: summary.otherCosts,
			itemStyle: { color: COLOR.other }
		},
		{
			name: "Margin",
			value: summary.margin,
			itemStyle: { color: COLOR.margin }
		}
	];

	return {
		tooltip: {
			trigger: "item",
			valueFormatter: (value) => formatRupiah(Number(value))
		},

		legend: {
			bottom: 0,
			textStyle: {
				color: "#756d67",
				fontSize: 11
			},
			itemWidth: 10,
			itemHeight: 10
		},

		series: [
			{
				name: "Revenue allocation",
				type: "pie",
				radius: ["45%", "72%"],
				center: ["50%", "42%"],
				avoidLabelOverlap: true,

				itemStyle: {
					borderColor: "#fefcfa",
					borderWidth: 2
				},

				label: {
					formatter: "{b}\n{d}%",
					color: "#583f16",
					fontSize: 11
				},

				data
			}
		]
	};
}

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
	transactions: TTransaction[];
	salesSummary: TSalesSummary;
	adjustments: TAdjustment[];
	adjustmentsTotal: number;
	finalResult: number;
};

export default function SalesBreakdown({
	step,
	transactions,
	salesSummary,
	adjustments,
	adjustmentsTotal,
	finalResult
}: SalesBreakdownProps) {
	const visibleSections = SECTION_ORDER[step];
	const focusSection = FOCUS_SECTION[step];

	const itemsSold = useMemo(() => calcItemsSoldCount(transactions), [transactions]);

	const productBreakdown = useMemo(() => aggregateSalesByProduct(transactions), [transactions]);

	const adjustmentBreakdown = useMemo(() => aggregateAdjustmentsByCategory(adjustments), [adjustments]);

	return (
		<aside className={`${styles.panel} card`}>
			{visibleSections.includes("sales") && (
				<SalesSummarySection
					focused={focusSection === "sales"}
					summary={salesSummary}
					itemsSold={itemsSold}
					productBreakdown={productBreakdown}
				/>
			)}

			{visibleSections.includes("settlement") && (
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
			)}
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
	productBreakdown
}: {
	focused: boolean;
	summary: TSalesSummary;
	itemsSold: number;
	productBreakdown: TProductBreakdown[];
}) {
	const [isExpanded, setIsExpanded] = useState(focused);

	const chartOption = useMemo(() => buildProductBreakdownOption(productBreakdown), [productBreakdown]);

	return (
		<section className={`${styles.section} ${focused ? styles.sectionFocused : styles.sectionCompact}`}>
			<div className={styles.sectionHeader}>
				<h3 className={styles.sectionTitle}>
					<span className={`${styles.dot} ${styles.dotSales}`} aria-hidden="true" />
					Sales summary
				</h3>

				{productBreakdown.length > 0 && (
					<button
						type="button"
						className={styles.expandButton}
						onClick={() => setIsExpanded((value) => !value)}
					>
						{isExpanded ? "Hide" : "By product"}

						<span
							className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`}
							aria-hidden="true"
						>
							⌄
						</span>
					</button>
				)}
			</div>

			<div className={focused ? styles.statGrid : styles.statRow}>
				<CurrencyStat
					label="Transactions"
					value={summary.transactionCount}
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
						<CurrencyStat label="COGS" value={summary.cogs} tone="muted" />

						<CurrencyStat label="Labor" value={summary.labor} tone="muted" />

						<CurrencyStat label="Other costs" value={summary.otherCosts} tone="muted" />

						<CurrencyStat label="Margin" value={summary.margin} tone="positive" />
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

function AdjustmentSummarySection({
	focused,
	total,
	breakdown
}: {
	focused: boolean;
	total: number;
	breakdown: TAdjustmentBreakdown[];
}) {
	const [isExpanded, setIsExpanded] = useState(focused);

	const chartOption = useMemo(() => buildAdjustmentBreakdownOption(breakdown), [breakdown]);

	return (
		<section className={`${styles.section} ${focused ? styles.sectionFocused : styles.sectionCompact}`}>
			<div className={styles.sectionHeader}>
				<h3 className={styles.sectionTitle}>
					<span className={`${styles.dot} ${styles.dotAdjustment}`} aria-hidden="true" />
					Adjustment summary
				</h3>

				{breakdown.length > 0 && (
					<button
						type="button"
						className={styles.expandButton}
						onClick={() => setIsExpanded((value) => !value)}
					>
						{isExpanded ? "Hide" : "By category"}

						<span
							className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`}
							aria-hidden="true"
						>
							⌄
						</span>
					</button>
				)}
			</div>

			<div className={focused ? styles.statGrid : styles.statRow}>
				<CurrencyStat label="Total adjustments" value={total} tone="negative" size={focused ? "lg" : "md"} />
			</div>

			{isExpanded && breakdown.length > 0 && (
				<div className={styles.chartWrap}>
					<EChart option={chartOption} height={220} />
				</div>
			)}

			{breakdown.length === 0 && focused && <p className={styles.emptyNote}>No adjustments added yet.</p>}
		</section>
	);
}

/* =========================================================
   SECTION: Sales Breakdown
   Revenue allocation:
   COGS + Labor + Other costs + Margin = Revenue

   Adjustments are intentionally excluded because they are
   applied after the initial revenue allocation.
   ========================================================= */

function FinalBreakdownSection({
	summary,
	adjustmentsTotal,
	finalResult
}: {
	summary: TSalesSummary;
	adjustmentsTotal: number;
	finalResult: number;
}) {
	const chartOption = useMemo(() => buildSalesBreakdownOption(summary), [summary]);

	return (
		<section className={`${styles.section} ${styles.sectionFocused} ${styles.sectionBreakdown}`}>
			<div className={styles.sectionHeader}>
				<h3 className={styles.sectionTitle}>
					<span className={`${styles.dot} ${styles.dotBreakdown}`} aria-hidden="true" />
					Sales breakdown
				</h3>
			</div>

			<div className={styles.chartWrap}>
				<EChart option={chartOption} height={240} />
			</div>

			<div className={styles.finalRow}>
				<div>
					<span>Profit after {formatRupiah(adjustmentsTotal)} adjustment</span>
				</div>

				<span className={finalResult < 0 ? styles.negativeBig : styles.positiveBig}>
					{formatRupiah(finalResult)}
				</span>
			</div>
		</section>
	);
}
