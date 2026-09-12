// IMPORT STYLES
import styles from "./SalesBreakdown.module.css";
// IMPORT TYPES
import type {
	TBusinessSettlement,
	TProductBreakdown,
	TQSalesSummary,
	TSettlementStep
} from "../../../Types/settlement";
import type { EChartsOption } from "echarts";
// IMPORT HOOKS
import { useMemo } from "react";
// IMPORT COMPONENTS
import CurrencyStat from "./CurrencyStat";
import EChart from "../../../Component/Echart/Echart";
// IMPORT UTILITIES
import { formatRupiah } from "../../../Utilities/NumberFormater";
import type { TSettlementReconciliation } from "../../../Utilities/resolveSettlementReconciliation";
import { resolveSalesEstimate } from "../../../Utilities/resolveSalesEstimate";

const COLOR = {
	ingredient: "#b25e34",
	labor: "#8e97ca",
	packing: "#de9155",
	utility: "#cfff0e",
	adjustment: "#d14957",
	margin: "#efac32",
	profitNegative: "#ec2c5c",
	qty: "#ff9e01"
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
				rotate: labels.length > 5 ? 35 : 0
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
					color: COLOR.qty
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
	settlement: TBusinessSettlement;
	productBreakdown: TProductBreakdown[];
	settlementSummary: TQSalesSummary;
	reconciliation: TSettlementReconciliation | null;
	breakdownGroupBy: TBreakdownGroupBy;
	onBreakdownGroupByChange: (groupBy: TBreakdownGroupBy) => void;
	isExpenseEdit: boolean;
	// adjustments: TAdjustment[];
	// adjustmentsTotal: number;
	// finalResult: number;
};

export default function SalesBreakdown({
	step,
	settlement,
	productBreakdown,
	settlementSummary,
	reconciliation,
	breakdownGroupBy,
	isExpenseEdit,
	onBreakdownGroupByChange
}: SalesBreakdownProps) {
	const visibleSections = SECTION_ORDER[step];
	const focusSection = FOCUS_SECTION[step];

	const isSettled =
		settlement.settlementStatus !== "DRAFT" ||
		focusSection === "breakdown" ||
		(focusSection === "settlement" && isExpenseEdit);
	const estimate = resolveSalesEstimate(settlement, settlementSummary);

	const revenue = reconciliation?.revenue ?? estimate.revenue;
	const laborCost = reconciliation?.settledLaborCost ?? estimate.labor;
	const ingredientCost = reconciliation?.settledIngredientCost ?? estimate.ingredient;
	const packingCost = reconciliation?.settledPackagingCost ?? estimate.packing;
	const utilityCost = reconciliation?.settledUtilityCost || estimate.utility;

	const otherCosts = reconciliation?.otherExpenses ?? settlement.totalAdditionalExpenses ?? 0;
	const cogs = laborCost + ingredientCost + packingCost + utilityCost;

	const remain = reconciliation?.balance ?? settlementSummary?.salesMargin ?? settlement.salesMargin;
	const remainStatus = remain > 0 ? "Keuntungan" : remain < 0 ? "Defisit" : "Sisa";

	return (
		<aside className={`${styles.panel} card`}>
			{visibleSections.includes("sales") && (
				<SalesSummarySection
					focused={focusSection === "sales"}
					transaction={estimate.transaction}
					itemsSold={estimate.itemSold}
					revenue={revenue}
					cogs={cogs}
					laborCost={laborCost}
					ingredientCost={ingredientCost}
					packingCost={packingCost}
					utilityCost={utilityCost}
					otherCosts={otherCosts}
					remain={remain}
					remainStatus={remainStatus}
					isSettled={isSettled}
					productBreakdown={productBreakdown}
					breakdownGroupBy={breakdownGroupBy}
					onBreakdownGroupByChange={onBreakdownGroupByChange}
				/>
			)}
			{/* // <SalesSummarySection
			// 	focused={true}
			// 	summary={salesSummary}
			// 	itemsSold={salesSummary.itemSold}
			// 	productBreakdown={productBreakdown}
			// 	salesStatus={remainLabel}
			// 	breakdownGroupBy={breakdownGroupBy}
			// 	onBreakdownGroupByChange={onBreakdownGroupByChange}
			// /> */}

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
	transaction,
	itemsSold,
	revenue,
	cogs,
	laborCost,
	ingredientCost,
	packingCost,
	utilityCost,
	otherCosts,
	remain,
	remainStatus,
	isSettled,
	productBreakdown,
	breakdownGroupBy,
	onBreakdownGroupByChange
}: {
	focused: boolean;
	transaction: number;
	itemsSold: number;
	revenue: number;
	cogs: number;
	laborCost: number;
	ingredientCost: number;
	packingCost: number;
	utilityCost: number;
	otherCosts: number;
	remain: number;
	remainStatus: "Keuntungan" | "Defisit" | "Sisa";
	isSettled: boolean;
	productBreakdown: TProductBreakdown[];
	breakdownGroupBy: TBreakdownGroupBy;
	onBreakdownGroupByChange: (groupBy: TBreakdownGroupBy) => void;
}) {
	const chartOption = useMemo(
		() => buildProductBreakdownOption(productBreakdown, breakdownGroupBy),
		[productBreakdown, breakdownGroupBy]
	);

	const costLabel = isSettled ? "HPP Akhir" : "HPP Dasar";
	const laborLabel = isSettled ? "Tenaga Kerja Akhir" : "Tenaga Kerja";
	const ingredientLabel = "Harga Bahan";
	const packingLabel = "Harga Pengemasan";
	const utilityLabel = isSettled ? "Biaya Operasional Akhir" : "Harga Operasional";
	const otherLabel = "Biaya Lainnya";
	const remainLabel = isSettled ? `${remainStatus.toLowerCase()} Akhir` : remainStatus;

	return (
		<section className={`${styles.section} ${styles.sectionFocused}`}>
			<div className={styles.sectionHeader}>
				<h3 className={styles.sectionTitle}>
					{/* <span className={`${styles.dot} ${styles.dotSales}`} aria-hidden="true" /> */}
					Rekapitulasi Penjualan
				</h3>
			</div>

			{productBreakdown.length > 0 && (
				<div className={styles.statTiers}>
					{/* Tier 1: overview */}
					<div className={styles.statOverview}>
						<CurrencyStat
							label="Jumlah Transaksi"
							value={transaction}
							format="number"
							tone="muted"
							size={focused ? "md" : "sm"}
						/>
						<CurrencyStat
							label="Jumlah Barang Terjual"
							value={itemsSold}
							format="number"
							tone="muted"
							size={focused ? "md" : "sm"}
						/>
					</div>

					{/* Tier 2: headline money */}
					<div className={styles.statHeadline}>
						<CurrencyStat label="Pendapatan" value={revenue} tone="accent" size={focused ? "lg" : "md"} />
						<CurrencyStat label={costLabel} value={cogs} tone="muted" size={focused ? "lg" : "md"} />
						<CurrencyStat
							label={remainLabel}
							value={remain}
							tone={remain > 0 ? "positive" : "negative"}
							size={focused ? "lg" : "md"}
						/>
					</div>

					{/* Tier 3: cost detail */}
					<div className={styles.statDetail}>
						<CurrencyStat label={laborLabel} value={laborCost} tone="muted" />
						<CurrencyStat label={ingredientLabel} value={ingredientCost} tone="muted" />
						<CurrencyStat label={packingLabel} value={packingCost} tone="muted" />
						<CurrencyStat label={utilityLabel} value={utilityCost} tone="muted" />
						<CurrencyStat label={otherLabel} value={otherCosts} tone="muted" />
					</div>
				</div>
			)}

			{productBreakdown.length > 0 && (
				<>
					<div className={styles.chartTitleSections}>
						<div className={styles.chartTitle}>Rincian Penjualan</div>
						<div className={styles.sectionHeaderActions}>
							{productBreakdown.length > 0 && (
								<div className={styles.groupToggle} role="group" aria-label="Group breakdown by">
									<button
										type="button"
										className={
											breakdownGroupBy === "PRODUCT" ? styles.groupActive : styles.groupInactive
										}
										onClick={() => onBreakdownGroupByChange("PRODUCT")}
									>
										Produk
									</button>
									<button
										type="button"
										className={
											breakdownGroupBy === "CATEGORY" ? styles.groupActive : styles.groupInactive
										}
										onClick={() => onBreakdownGroupByChange("CATEGORY")}
									>
										Kategori
									</button>
								</div>
							)}
						</div>
					</div>
					<div className={styles.chartWrap}>
						<EChart
							option={chartOption}
							height={Math.max(180, Math.min(productBreakdown.length, 20) * 34)}
						/>
					</div>
				</>
			)}

			{productBreakdown.length === 0 && <p className={styles.emptyNote}>Belum ada penjulanan yang dipilih.</p>}
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
