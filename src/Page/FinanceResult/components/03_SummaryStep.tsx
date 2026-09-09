import { useMemo } from "react";
import type { ReactNode } from "react";
import type { EChartsOption } from "echarts";
import styles from "./03_SummaryStep.module.css";
import CurrencyStat from "./CurrencyStat";
import EChart from "../../../Component/Echart/Echart";
import RupiahInput from "../../../Component/RupiahInput/RupiahInput";
import { formatRupiah } from "../../../Utilities/NumberFormater";
import type { TSettlementReconciliation } from "../../../Utilities/resolveSettlementReconciliation";

const COLOR = {
	profit: "#66d604",
	cogs: "#e2682b",
	other: "#C32230"
};

function buildDistributionOption(profit: number, cogs: number, other: number): EChartsOption {
	return {
		tooltip: {
			trigger: "item",
			valueFormatter: (value) => formatRupiah(Number(value))
		},
		legend: {
			bottom: 0,
			textStyle: { color: "#756d67", fontSize: 11 },
			itemWidth: 10,
			itemHeight: 10
		},
		series: [
			{
				name: "Profit split",
				type: "pie",
				radius: "60%", // ["45%", "60%"],
				center: ["50%", "50%"], // was 50% — leaves room on the right for the label + leader line
				avoidLabelOverlap: true,
				itemStyle: { borderColor: "#fefcfa", borderWidth: 2 },
				label: { formatter: "{b}\n{d}%", color: "#cc7f03", fontSize: 11 },
				data: [
					{ name: "Profit", value: profit, itemStyle: { color: COLOR.profit } },
					{ name: "HPP", value: cogs, itemStyle: { color: COLOR.cogs } },
					...(other > 0
						? [{ name: "Pengeluaran Lain", value: other, itemStyle: { color: COLOR.other } }]
						: [])
				]
			}
		]
	};
}

export type SummaryStepProps = {
	reconciliation: TSettlementReconciliation;
	profitDistributed: number;
	profitRetained: number;
	onProfitDistributedChange: (value: number) => void;
	readOnly: boolean;
	breakdown: ReactNode;
};

export default function SummaryStep({
	reconciliation,
	profitDistributed,
	profitRetained,
	onProfitDistributedChange,
	readOnly,
	breakdown
}: SummaryStepProps) {
	const {
		revenue,
		totalSettledCost,
		balance,
		isDeficit,
		settledIngredientCost,
		settledPackagingCost,
		settledUtilityCost,
		settledLaborCost,
		otherExpenses
	} = reconciliation;

	const deficitCovered = isDeficit ? Math.abs(balance) : 0;
	const availableProfit = Math.max(balance, 0);
	const cogs = settledIngredientCost + settledPackagingCost + settledUtilityCost + settledLaborCost;
	const distributionOption = useMemo(
		() => buildDistributionOption(balance, cogs, otherExpenses),
		[balance, cogs, otherExpenses]
	);

	return (
		<div className={styles.layout}>
			<section className={`${styles.profitSection} card`}>
				<div className={styles.heroCard}>
					<CurrencyStat
						label={isDeficit ? "Deficit" : "Profit"}
						value={Math.abs(balance)}
						tone={isDeficit ? "negative" : "positive"}
						size="lg"
					/>
					<span className={styles.heroSub}>
						{formatRupiah(revenue)} revenue − {formatRupiah(totalSettledCost)} settled costs
					</span>
				</div>
				<div className={styles.chartWrap}>
					<EChart option={distributionOption} height={220} />
				</div>
			</section>

			<section className={`${styles.allocationCard} card`}>
				{isDeficit ? (
					<>
						<h3 className={styles.cardTitle}>Deficit coverage</h3>
						<div className={styles.deficitRow}>
							<span>Deficit covered</span>
							<strong>{formatRupiah(deficitCovered)}</strong>
						</div>
					</>
				) : (
					<>
						<h3 className={styles.cardTitle}>Profit allocation</h3>

						<div className={styles.statGrid}>
							<CurrencyStat label="Retained" value={profitRetained} tone="positive" />
							<CurrencyStat label="Distributed" value={profitDistributed} tone="accent" />
						</div>
						{!readOnly && (
							<>
								<label className={styles.field}>
									<span>Amount to distribute</span>
									<RupiahInput
										value={String(profitDistributed)}
										onChange={(event) =>
											onProfitDistributedChange(Number(event.currentTarget.value) || 0)
										}
										placeholder="0"
										disabled={readOnly}
									/>
								</label>
								<p className={styles.fieldHint}>
									Retained updates automatically — the split always sums to{" "}
									{formatRupiah(availableProfit)}.
								</p>
							</>
						)}
					</>
				)}
			</section>
			{breakdown}
		</div>
	);
}
