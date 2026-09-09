import { useMemo } from "react";
import type { ReactNode } from "react";
import type { EChartsOption } from "echarts";
import styles from "./SummaryStep.module.css";
import CurrencyStat from "./CurrencyStat";
import EChart from "../../../Component/Echart/Echart";
import RupiahInput from "../../../Component/RupiahInput/RupiahInput";
import { formatRupiah } from "../../../Utilities/NumberFormater";
import type { TSettlementReconciliation } from "../../../Utilities/resolveSettlementReconciliation";

const COLOR = {
	retained: "#79a354",
	distributed: "#b25e34"
};

function buildDistributionOption(retained: number, distributed: number): EChartsOption {
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
				radius: ["45%", "72%"],
				center: ["50%", "42%"],
				avoidLabelOverlap: true,
				itemStyle: { borderColor: "#fefcfa", borderWidth: 2 },
				label: { formatter: "{b}\n{d}%", color: "#583f16", fontSize: 11 },
				data: [
					{ name: "Retained", value: retained, itemStyle: { color: COLOR.retained } },
					{ name: "Distributed", value: distributed, itemStyle: { color: COLOR.distributed } }
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
	const { revenue, settledLaborCost, settledUtilityCost, otherExpenses, totalSettledCost, balance, isDeficit } =
		reconciliation;

	const deficitCovered = isDeficit ? Math.abs(balance) : 0;
	const availableProfit = Math.max(balance, 0);

	const distributionOption = useMemo(
		() => buildDistributionOption(profitRetained, profitDistributed),
		[profitRetained, profitDistributed]
	);

	return (
		<div className={styles.layout}>
			<section className={`${styles.heroCard} card`}>
				<CurrencyStat
					label={isDeficit ? "Deficit" : "Profit"}
					value={Math.abs(balance)}
					tone={isDeficit ? "negative" : "positive"}
					size="lg"
				/>
				<span className={styles.heroSub}>
					{formatRupiah(revenue)} revenue − {formatRupiah(totalSettledCost)} settled costs
				</span>
			</section>

			<section className={`${styles.metricsCard} card`}>
				<h3 className={styles.cardTitle}>Settled costs</h3>
				<div className={styles.statGrid}>
					<CurrencyStat label="Revenue" value={revenue} tone="accent" />
					<CurrencyStat label="Labor" value={settledLaborCost} tone="muted" />
					<CurrencyStat label="Utilities" value={settledUtilityCost} tone="muted" />
					<CurrencyStat label="Additional" value={otherExpenses} tone="muted" />
					<CurrencyStat label="Total settled" value={totalSettledCost} tone="muted" />
				</div>
			</section>

			{breakdown}

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

						<div className={styles.chartWrap}>
							<EChart option={distributionOption} height={220} />
						</div>

						<div className={styles.statGrid}>
							<CurrencyStat label="Retained" value={profitRetained} tone="positive" />
							<CurrencyStat label="Distributed" value={profitDistributed} tone="accent" />
						</div>

						<label className={styles.field}>
							<span>Amount to distribute</span>
							<RupiahInput
								value={String(profitDistributed)}
								onChange={(event) => onProfitDistributedChange(Number(event.currentTarget.value) || 0)}
								placeholder="0"
								disabled={readOnly}
							/>
						</label>
						<p className={styles.fieldHint}>
							Retained updates automatically — the split always sums to {formatRupiah(availableProfit)}.
						</p>
					</>
				)}
			</section>
		</div>
	);
}
