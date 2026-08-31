import { useState } from "react";
import type { FormEvent } from "react";
import styles from "./AdjustmentsStep.module.css";
import Button from "../../../Component/Button/Button";
import CurrencyStat from "./CurrencyStat";
import Drawer from "../../../Component/Drawer/Drawer";
import RupiahInput from "../../../Component/RupiahInput/RupiahInput";
import { formatRupiah } from "../../../Utilities/NumberFormater";
import { ADJUSTMENT_CATEGORIES } from "../../../Types/finance";
import type { TAdjustment, TAdjustmentCategory } from "../../../Types/finance";

export type AdjustmentsStepProps = {
	adjustments: TAdjustment[];
	onAddAdjustment: (adjustment: Omit<TAdjustment, "id">) => void;
	onRemoveAdjustment: (id: string) => void;
	salesMargin: number;
	readOnly: boolean;
};

const emptyForm = { description: "", category: "Utilities" as TAdjustmentCategory, amount: "" };

export default function AdjustmentsStep({
	adjustments,
	onAddAdjustment,
	onRemoveAdjustment,
	salesMargin,
	readOnly
}: AdjustmentsStepProps) {
	const [isDrawerOpen, setDrawerOpen] = useState(false);
	const [form, setForm] = useState(emptyForm);

	const adjustmentsTotal = adjustments.reduce((sum, adjustment) => sum + adjustment.amount, 0);
	const adjustedResult = salesMargin - adjustmentsTotal;

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const amount = Number(form.amount);
		if (!form.description.trim() || !amount) {
			return;
		}

		onAddAdjustment({ description: form.description.trim(), category: form.category, amount });
		setForm(emptyForm);
		setDrawerOpen(false);
	}

	return (
		<div className={styles.layout}>
			<section className={`${styles.listCard} card`}>
				<div className={styles.listHeader}>
					<h3 className={styles.cardTitle}>Adjustments</h3>
					{!readOnly && (
						<Button size="sm" type="button" onClick={() => setDrawerOpen(true)}>
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

			<aside className={`${styles.compareCard} card`}>
				<h3 className={styles.cardTitle}>Result comparison</h3>
				<CurrencyStat label="Sales margin" value={salesMargin} />
				<div className={styles.operator}>−</div>
				<CurrencyStat label="Adjustments" value={adjustmentsTotal} tone="negative" />
				<div className={styles.divider} />
				<CurrencyStat label="Adjusted result" value={adjustedResult} tone="accent" size="lg" />
			</aside>

			{isDrawerOpen && (
				<Drawer
					title="Add adjustment"
					eyebrow="Adjustments"
					onClose={() => setDrawerOpen(false)}
					onSubmit={handleSubmit}
					footer={
						<>
							<Button type="button" variant="ghost" onClick={() => setDrawerOpen(false)}>
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
							onChange={(event) =>
								setForm({ ...form, category: event.target.value as TAdjustmentCategory })
							}
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
			)}
		</div>
	);
}
