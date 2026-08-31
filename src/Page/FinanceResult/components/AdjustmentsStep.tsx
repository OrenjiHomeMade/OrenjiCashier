import { useState } from "react";
import type { ReactNode, SubmitEvent } from "react";
import styles from "./AdjustmentsStep.module.css";
import Button from "../../../Component/Button/Button";
import Drawer from "../../../Component/Drawer/Drawer";
import RupiahInput from "../../../Component/RupiahInput/RupiahInput";
import { formatRupiah } from "../../../Utilities/NumberFormater";
import { ADJUSTMENT_CATEGORIES } from "../../../Types/finance";
import type { TAdjustment, TAdjustmentCategory } from "../../../Types/finance";

/* =========================================================
   MAIN STEP — adjustments list + shared breakdown. No Drawer
   here; it only asks the parent (FinanceResult) to open one.
   ========================================================= */

export type AdjustmentsStepProps = {
	adjustments: TAdjustment[];
	onRemoveAdjustment: (id: string) => void;
	readOnly: boolean;
	drawerState: boolean;
	setDrawerState: (state: boolean) => void;
	/** Built once in FinanceResult and shared across all 3 steps — see SalesBreakdown. */
	breakdown: ReactNode;
};

export function AdjustmentsStep({
	adjustments,
	onRemoveAdjustment,
	readOnly,
	drawerState,
	setDrawerState,
	breakdown
}: AdjustmentsStepProps) {
	return (
		<div className={styles.layout}>
			<section className={`${styles.listCard} card`}>
				<div className={styles.listHeader}>
					<h3 className={styles.cardTitle}>Adjustments</h3>
					{!readOnly && (
						<Button
							size="sm"
							type="button"
							onClick={() => setDrawerState(true)}
							aria-expanded={drawerState}
						>
							+ Add adjustment
						</Button>
					)}
				</div>

				<div className={styles.list}>
					{adjustments.length === 0 && (
						<p className={styles.emptyState}>
							No adjustments yet. Add utilities, team meals, or other costs here.
						</p>
					)}

					{adjustments.map((adjustment) => (
						<div className={styles.row} key={adjustment.id}>
							<div className={styles.rowMain}>
								<span className={styles.rowDescription}>{adjustment.description}</span>
								<span className={styles.rowCategory}>{adjustment.category}</span>
							</div>
							<span className={styles.rowAmount}>-{formatRupiah(adjustment.amount)}</span>
							{!readOnly && (
								<button
									type="button"
									className={styles.removeButton}
									onClick={() => onRemoveAdjustment(adjustment.id)}
									aria-label="Remove adjustment"
								>
									×
								</button>
							)}
						</div>
					))}
				</div>
			</section>

			<div className={styles.compareCard}>{breakdown}</div>
		</div>
	);
}

/* =========================================================
   DRAWER — the "Add adjustment" form. Rendered by
   FinanceResult inside its drawerSection, same as
   AllocationSelectorDrawer.
   ========================================================= */

export type AdjustmentsStepDrawerProps = {
	setDrawerState: (state: boolean) => void;
	onAddAdjustment: (adjustment: Omit<TAdjustment, "id">) => void;
};

const emptyForm = { description: "", category: "Utilities" as TAdjustmentCategory, amount: "" };

export function AdjustmentsStepDrawer({ setDrawerState, onAddAdjustment }: AdjustmentsStepDrawerProps) {
	const [form, setForm] = useState(emptyForm);

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		const amount = Number(form.amount);
		if (!form.description.trim() || !amount) {
			return;
		}

		onAddAdjustment({ description: form.description.trim(), category: form.category, amount });
		setForm(emptyForm);
		setDrawerState(false);
	}

	return (
		<Drawer
			title="Add adjustment"
			eyebrow="Adjustments"
			onClose={() => setDrawerState(false)}
			onSubmit={handleSubmit}
			footer={
				<>
					<Button type="button" variant="ghost" onClick={() => setDrawerState(false)}>
						Cancel
					</Button>
					<Button type="submit">Add adjustment</Button>
				</>
			}
		>
			<label className={styles.field}>
				<span>Description</span>
				<input
					type="text"
					value={form.description}
					onChange={(event) => setForm({ ...form, description: event.target.value })}
					placeholder="e.g. August electricity bill"
					required
				/>
			</label>

			<label className={styles.field}>
				<span>Category</span>
				<select
					value={form.category}
					onChange={(event) => setForm({ ...form, category: event.target.value as TAdjustmentCategory })}
				>
					{ADJUSTMENT_CATEGORIES.map((category) => (
						<option key={category} value={category}>
							{category}
						</option>
					))}
				</select>
			</label>

			<label className={styles.field}>
				<span>Amount</span>
				<RupiahInput
					value={form.amount}
					onChange={(event) => setForm({ ...form, amount: event.currentTarget.value })}
					placeholder="0"
				/>
			</label>
		</Drawer>
	);
}
