import { useState } from "react";
import styles from "./SummaryStep.module.css";
import Button from "../../../Component/Button/Button";
import CurrencyStat from "./CurrencyStat";
import StatusBadge from "./StatusBadge";
import RupiahInput from "../../../Component/RupiahInput/RupiahInput";
import { formatRupiah } from "../../../Utilities/NumberFormater";
import { resolveDistributionAmount } from "../../../Utilities/financeCalculations";
import type { TDistributionMode, TFinanceAllocation, TSalesSummary } from "../../../Types/finance";

export type SummaryStepProps = {
	allocation: TFinanceAllocation;
	salesSummary: TSalesSummary;
	adjustmentsTotal: number;
	finalResult: number;
	onDistributionModeChange: (mode: TDistributionMode) => void;
	onUpdateDistributionEntry: (id: string, value: number) => void;
	onAddDistributionEntry: (label: string) => void;
	onRemoveDistributionEntry: (id: string) => void;
	distributionTotalAmount: number;
	distributionTotalPercent: number;
	isReconciled: boolean;
	canEditDistribution: boolean;
	statusActions: {
		canConfirm: boolean;
		canEnableEdit: boolean;
		canDistribute: boolean;
	};
	onConfirm: () => void;
	onEnableEdit: () => void;
	onDistribute: () => void;
};

export default function SummaryStep({
	allocation,
	salesSummary,
	adjustmentsTotal,
	finalResult,
	onDistributionModeChange,
	onUpdateDistributionEntry,
	onAddDistributionEntry,
	onRemoveDistributionEntry,
	distributionTotalAmount,
	distributionTotalPercent,
	isReconciled,
	canEditDistribution,
	statusActions,
	onConfirm,
	onEnableEdit,
	onDistribute
}: SummaryStepProps) {
	const [newLabel, setNewLabel] = useState("");

	return (
		<div className={styles.layout}>
			<section className={`${styles.headerCard} card`}>
				<div>
					<p className={styles.eyebrow}>Allocation</p>
					<h2 className={styles.name}>{allocation.name || "Untitled allocation"}</h2>
				</div>
				<StatusBadge status={allocation.status} />
			</section>

			<section className={`${styles.resultCard} card`}>
				<h3 className={styles.cardTitle}>Selected sales</h3>
				<div className={styles.grid}>
					<CurrencyStat
						label="Transactions"
						value={salesSummary.transactionCount}
						format="number"
						tone="muted"
					/>
					<CurrencyStat label="Revenue" value={salesSummary.revenue} />
					<CurrencyStat label="COGS" value={salesSummary.cogs} tone="muted" />
					<CurrencyStat label="Labor" value={salesSummary.labor} tone="muted" />
					<CurrencyStat label="Other costs" value={salesSummary.otherCosts} tone="muted" />
					<CurrencyStat label="Margin" value={salesSummary.margin} tone="accent" />
				</div>

				<div className={styles.divider} />

				<div className={styles.resultRow}>
					<span>Adjustments</span>
					<span className={styles.negativeValue}>-{formatRupiah(adjustmentsTotal)}</span>
				</div>
				<div className={`${styles.resultRow} ${styles.finalRow}`}>
					<span>Final result</span>
					<span>{formatRupiah(finalResult)}</span>
				</div>
			</section>

			<section className={`${styles.distributionCard} card`}>
				<div className={styles.distributionHeader}>
					<h3 className={styles.cardTitle}>Distribution breakdown</h3>

					{canEditDistribution && (
						<div className={styles.modeToggle}>
							<button
								type="button"
								className={
									allocation.distributionMode === "PERCENTAGE" ? styles.modeActive : styles.mode
								}
								onClick={() => onDistributionModeChange("PERCENTAGE")}
							>
								Percentage
							</button>
							<button
								type="button"
								className={allocation.distributionMode === "FIXED" ? styles.modeActive : styles.mode}
								onClick={() => onDistributionModeChange("FIXED")}
							>
								Fixed amount
							</button>
						</div>
					)}
				</div>

				<div className={styles.distributionList}>
					{allocation.distribution.map((entry) => (
						<div className={styles.distributionRow} key={entry.id}>
							<span className={styles.distributionLabel}>{entry.label}</span>

							{canEditDistribution ? (
								allocation.distributionMode === "PERCENTAGE" ? (
									<div className={styles.percentInputWrap}>
										<input
											type="number"
											min={0}
											max={100}
											value={entry.value}
											onChange={(event) =>
												onUpdateDistributionEntry(entry.id, Number(event.target.value))
											}
											className={styles.percentInput}
										/>
										<span>%</span>
									</div>
								) : (
									<RupiahInput
										value={String(entry.value)}
										onChange={(event) =>
											onUpdateDistributionEntry(entry.id, Number(event.currentTarget.value || 0))
										}
										className={styles.fixedInput}
									/>
								)
							) : (
								<span className={styles.distributionStatic}>
									{allocation.distributionMode === "PERCENTAGE"
										? `${entry.value}%`
										: formatRupiah(entry.value)}
								</span>
							)}

							<span className={styles.distributionAmount}>
								{formatRupiah(
									resolveDistributionAmount(entry, allocation.distributionMode, finalResult)
								)}
							</span>

							{canEditDistribution && (
								<button
									type="button"
									className={styles.removeButton}
									onClick={() => onRemoveDistributionEntry(entry.id)}
									aria-label="Remove distribution category"
								>
									×
								</button>
							)}
						</div>
					))}
				</div>

				{canEditDistribution && (
					<div className={styles.addRow}>
						<input
							type="text"
							value={newLabel}
							onChange={(event) => setNewLabel(event.target.value)}
							placeholder="Add category, e.g. Equipment"
							className={styles.addInput}
						/>
						<Button
							size="sm"
							variant="secondary"
							type="button"
							onClick={() => {
								if (!newLabel.trim()) return;
								onAddDistributionEntry(newLabel.trim());
								setNewLabel("");
							}}
						>
							Add
						</Button>
					</div>
				)}

				<div className={`${styles.reconcileBar} ${isReconciled ? styles.reconciled : styles.unreconciled}`}>
					<span>
						{allocation.distributionMode === "PERCENTAGE"
							? `${distributionTotalPercent}% allocated`
							: `${formatRupiah(distributionTotalAmount)} allocated`}
					</span>
					<span>{isReconciled ? "Reconciles with final result" : `Target ${formatRupiah(finalResult)}`}</span>
				</div>
			</section>

			<div className={styles.actions}>
				{statusActions.canConfirm && <Button onClick={onConfirm}>Confirm allocation</Button>}
				{statusActions.canEnableEdit && (
					<Button variant="secondary" onClick={onEnableEdit}>
						Edit
					</Button>
				)}
				{statusActions.canDistribute && (
					<Button onClick={onDistribute} disabled={!isReconciled}>
						Distribute
					</Button>
				)}
			</div>
		</div>
	);
}
