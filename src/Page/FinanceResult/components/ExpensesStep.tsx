import { useMemo, useState } from "react";
import type { ReactNode, SubmitEvent } from "react";
import styles from "./ExpensesStep.module.css";
import Button from "../../../Component/Button/Button";
import Drawer from "../../../Component/Drawer/Drawer";
import RupiahInput from "../../../Component/RupiahInput/RupiahInput";
import { formatRupiah } from "../../../Utilities/NumberFormater";
import type { TTransaction } from "../../../Types/transaction";

/* =========================================================
   WIRING NOTES for useFinanceAllocation.ts
   -------------------------------------------------------
   This file assumes the hook grows to expose:
     - laborActual: number              (persisted on the allocation)
     - onLaborActualChange(value)
     - expenses: TBusinessExpense[]     (new pool, same idea as `adjustments`
                                          today but with settledAmount tracking)
     - selectedUtilityIds / selectedAdditionalIds: string[]
     - onToggleExpense(section, id)
     - onAddExpense(section, data) -> inserts + auto-selects, mirrors
                                       addAdjustment()
   Everything below is fully controlled — no data assumptions are baked in
   beyond the shapes declared here. Swap the mock defaults at the bottom
   for real hook state whenever you're ready; the UI won't need to change.
   ========================================================= */

/* =========================================================
   TYPES — candidates to promote into Types/finance.ts later
   ========================================================= */

export type TExpenseSection = "UTILITIES" | "ADDITIONAL";
export type TExpenseStatus = "UNSETTLED" | "PARTIAL" | "SETTLED";

export type TBusinessExpense = {
	id: string;
	section: TExpenseSection;
	description: string;
	category: string;
	originalAmount: number;
	/** Already recognized in OTHER settlements — drives the remaining/available amount. */
	settledAmount: number;
};

function getExpenseRemaining(expense: TBusinessExpense) {
	return Math.max(expense.originalAmount - expense.settledAmount, 0);
}

function getExpenseStatus(expense: TBusinessExpense): TExpenseStatus {
	if (getExpenseRemaining(expense) <= 0) return "SETTLED";
	if (expense.settledAmount > 0) return "PARTIAL";
	return "UNSETTLED";
}

type TCostField = "unitCostLabor" | "unitCostIngredient" | "unitCostUtilities" | "unitCostPackaging";

/** Sums a per-unit cost field across every item in the selected sales transactions. */
function sumUnitCost(transactions: TTransaction[], field: TCostField) {
	return transactions.reduce(
		(sum, transaction) =>
			sum + transaction.transactionItems.reduce((itemSum, item) => itemSum + item[field] * item.quantity, 0),
		0
	);
}

/* =========================================================
   MAIN STEP — five settlement-basis sections. No Drawer here;
   it only asks the parent (FinanceResult) to open one, same
   convention as AllocationSelector / AdjustmentsStep.
   ========================================================= */

export type ExpensesStepProps = {
	transactions: TTransaction[];
	readOnly: boolean;
	/** Built once in FinanceResult and shared across all 3 steps — see SalesBreakdown. */
	breakdown: ReactNode;

	laborActual: number;
	onLaborActualChange: (value: number) => void;

	expenses: TBusinessExpense[];
	selectedUtilityIds: string[];
	selectedAdditionalIds: string[];
	onToggleExpense: (section: TExpenseSection, id: string) => void;

	activeDrawer: TExpenseSection | null;
	setActiveDrawer: (section: TExpenseSection | null) => void;
};

export function ExpensesStep({
	transactions,
	readOnly,
	breakdown,
	laborActual,
	onLaborActualChange,
	expenses,
	selectedUtilityIds,
	selectedAdditionalIds,
	activeDrawer,
	setActiveDrawer
}: ExpensesStepProps) {
	const laborEstimate = useMemo(() => sumUnitCost(transactions, "unitCostLabor"), [transactions]);
	const utilitiesEstimate = useMemo(() => sumUnitCost(transactions, "unitCostUtilities"), [transactions]);
	const packagingRecognized = useMemo(() => sumUnitCost(transactions, "unitCostPackaging"), [transactions]);
	const ingredientRecognized = useMemo(() => sumUnitCost(transactions, "unitCostIngredient"), [transactions]);

	const utilityExpenses = useMemo(() => expenses.filter((e) => e.section === "UTILITIES"), [expenses]);
	const additionalExpenses = useMemo(() => expenses.filter((e) => e.section === "ADDITIONAL"), [expenses]);

	return (
		<div className={styles.layout}>
			<section className={`${styles.listCard} card`}>
				<div className={styles.listHeader}>
					<h3 className={styles.cardTitle}>Expenses</h3>
					<p className={styles.cardSubtitle}>
						How much of each cost should be recognized in this settlement?
					</p>
				</div>

				<div className={styles.sections}>
					<LaborSection
						estimate={laborEstimate}
						actual={laborActual}
						onActualChange={onLaborActualChange}
						readOnly={readOnly}
					/>

					<ExpenseBackedSection
						title="Utilities"
						estimateLabel="Sales estimate"
						estimate={utilitiesEstimate}
						expenses={utilityExpenses}
						selectedIds={selectedUtilityIds}
						readOnly={readOnly}
						isDrawerOpen={activeDrawer === "UTILITIES"}
						onOpenDrawer={() => setActiveDrawer("UTILITIES")}
					/>

					<DerivedCostSection
						title="Packaging"
						amount={packagingRecognized}
						note="Derived from sales COGS. Packaging purchases are tracked separately and aren't recognized directly here."
					/>

					<DerivedCostSection
						title="Ingredient"
						amount={ingredientRecognized}
						note="Derived from the ingredient COGS consumed by the selected sales — not the full ingredient purchase amount."
					/>

					<ExpenseBackedSection
						title="Additional"
						expenses={additionalExpenses}
						selectedIds={selectedAdditionalIds}
						readOnly={readOnly}
						isDrawerOpen={activeDrawer === "ADDITIONAL"}
						onOpenDrawer={() => setActiveDrawer("ADDITIONAL")}
					/>
				</div>
			</section>

			<div className={styles.compareCard}>{breakdown}</div>
		</div>
	);
}

/* ---------------------------------------------------------
   Labor — manual actual amount vs. a sales-derived estimate.
   Never funnelled into the expense pool.
   --------------------------------------------------------- */

function LaborSection({
	estimate,
	actual,
	onActualChange,
	readOnly
}: {
	estimate: number;
	actual: number;
	onActualChange: (value: number) => void;
	readOnly: boolean;
}) {
	const diff = actual - estimate;

	return (
		<div className={styles.section}>
			<div className={styles.sectionHead}>
				<div className={styles.sectionHeading}>
					<h4 className={styles.sectionTitle}>Labor</h4>
					<span className={styles.basisBadge}>Manual entry</span>
				</div>
				<span className={styles.sectionEstimate}>Sales estimate {formatRupiah(estimate)}</span>
			</div>

			<div className={styles.sectionBody}>
				<label className={styles.inlineField}>
					<span>Actual labor recognized</span>
					<RupiahInput
						value={String(actual)}
						onChange={(event) => onActualChange(Number(event.currentTarget.value) || 0)}
						placeholder="0"
						disabled={readOnly}
					/>
				</label>

				{diff !== 0 && (
					<span className={`${styles.diffPill} ${diff > 0 ? styles.diffOver : styles.diffUnder}`}>
						{diff > 0 ? `+${formatRupiah(diff)} over estimate` : `${formatRupiah(diff)} under estimate`}
					</span>
				)}
			</div>
		</div>
	);
}

/* ---------------------------------------------------------
   Packaging / Ingredient — read-only, derived straight from
   sales COGS. No operator input, no expense pool.
   --------------------------------------------------------- */

function DerivedCostSection({ title, amount, note }: { title: string; amount: number; note: string }) {
	return (
		<div className={styles.section}>
			<div className={styles.sectionHead}>
				<div className={styles.sectionHeading}>
					<h4 className={styles.sectionTitle}>{title}</h4>
					<span className={styles.basisBadge}>From sales COGS</span>
				</div>
			</div>

			<div className={styles.sectionBody}>
				<div className={styles.derivedAmount}>{formatRupiah(amount)}</div>
				<p className={styles.derivedNote}>{note}</p>
			</div>
		</div>
	);
}

/* ---------------------------------------------------------
   Utilities / Additional — recognized from a pool of business
   expenses, selected via the shared ExpenseDrawer below.
   --------------------------------------------------------- */

function ExpenseBackedSection({
	title,
	estimateLabel,
	estimate,
	expenses,
	selectedIds,
	readOnly,
	isDrawerOpen,
	onOpenDrawer
}: {
	title: string;
	estimateLabel?: string;
	estimate?: number;
	expenses: TBusinessExpense[];
	selectedIds: string[];
	readOnly: boolean;
	isDrawerOpen: boolean;
	onOpenDrawer: () => void;
}) {
	const selectedExpenses = expenses.filter((expense) => selectedIds.includes(expense.id));
	const recognizedTotal = selectedExpenses.reduce((sum, expense) => sum + getExpenseRemaining(expense), 0);

	return (
		<div className={styles.section}>
			<div className={styles.sectionHead}>
				<div className={styles.sectionHeading}>
					<h4 className={styles.sectionTitle}>{title}</h4>
					<span className={styles.basisBadge}>From expenses</span>
				</div>
				{estimateLabel !== undefined && estimate !== undefined && (
					<span className={styles.sectionEstimate}>
						{estimateLabel} {formatRupiah(estimate)}
					</span>
				)}
			</div>

			<div className={styles.sectionBody}>
				{selectedExpenses.length === 0 ? (
					<p className={styles.emptyState}>No expenses recognized yet.</p>
				) : (
					<ul className={styles.expenseList}>
						{selectedExpenses.map((expense) => (
							<li key={expense.id} className={styles.expenseRow}>
								<span className={styles.expenseDescription}>{expense.description}</span>
								<span className={styles.expenseCategory}>{expense.category}</span>
								<span className={styles.expenseAmount}>
									{formatRupiah(getExpenseRemaining(expense))}
								</span>
							</li>
						))}
					</ul>
				)}

				<div className={styles.sectionFooter}>
					<div className={styles.sectionTotal}>
						<span>Recognized total</span>
						<strong>{formatRupiah(recognizedTotal)}</strong>
					</div>
					{!readOnly && (
						<Button
							size="sm"
							variant="ghost"
							type="button"
							onClick={onOpenDrawer}
							aria-expanded={isDrawerOpen}
						>
							Select expenses
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}

/* =========================================================
   DRAWER — shared by Utilities and Additional. One instance
   at a time; FinanceResult renders it in .drawerSection based
   on `activeDrawer`, same as AllocationSelectorDrawer.
   ========================================================= */

export type ExpenseDrawerProps = {
	section: TExpenseSection;
	/** Pool pre-filtered to this section by the parent. */
	expenses: TBusinessExpense[];
	selectedIds: string[];
	onToggleExpense: (id: string) => void;
	onAddExpense: (expense: Omit<TBusinessExpense, "id" | "section" | "settledAmount">) => void;
	onClose: () => void;
};

const STATUS_FILTERS: { label: string; value: TExpenseStatus | "ALL" }[] = [
	{ label: "All", value: "ALL" },
	{ label: "Unsettled", value: "UNSETTLED" },
	{ label: "Partial", value: "PARTIAL" },
	{ label: "Settled", value: "SETTLED" }
];

const emptyExpenseForm = { description: "", category: "", amount: "" };

export function ExpenseDrawer({
	section,
	expenses,
	selectedIds,
	onToggleExpense,
	onAddExpense,
	onClose
}: ExpenseDrawerProps) {
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<TExpenseStatus | "ALL">("ALL");
	const [isAddingNew, setIsAddingNew] = useState(false);
	const [form, setForm] = useState(emptyExpenseForm);

	const eyebrow = section === "UTILITIES" ? "Utilities" : "Additional";

	const visibleExpenses = expenses.filter((expense) => {
		const status = getExpenseStatus(expense);
		const isSelected = selectedIds.includes(expense.id);
		if (!isSelected && status === "SETTLED") return false;
		if (statusFilter !== "ALL" && status !== statusFilter) return false;
		if (search.trim() && !expense.description.toLowerCase().includes(search.trim().toLowerCase())) return false;
		return true;
	});

	function handleAddSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		const amount = Number(form.amount);
		if (!form.description.trim() || !amount) return;

		onAddExpense({
			description: form.description.trim(),
			category: form.category.trim() || "Other",
			originalAmount: amount
		});
		setForm(emptyExpenseForm);
		onClose();
	}

	if (isAddingNew) {
		return (
			<Drawer
				title="Add new expense"
				eyebrow={eyebrow}
				onClose={() => setIsAddingNew(false)}
				onSubmit={handleAddSubmit}
				footer={
					<>
						<Button type="button" variant="ghost" onClick={() => setIsAddingNew(false)}>
							Back
						</Button>
						<Button type="submit">Add &amp; select</Button>
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
					<input
						type="text"
						value={form.category}
						onChange={(event) => setForm({ ...form, category: event.target.value })}
						placeholder="e.g. Electricity"
					/>
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

	return (
		<Drawer
			title={`Select ${eyebrow.toLowerCase()} expenses`}
			eyebrow={eyebrow}
			onClose={onClose}
			footer={
				<Button type="button" onClick={onClose}>
					Done
				</Button>
			}
		>
			<div className={styles.drawerToolbar}>
				<input
					type="text"
					className={styles.searchInput}
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search expenses…"
				/>
				<div className={styles.statusChips}>
					{STATUS_FILTERS.map((filter) => (
						<button
							key={filter.value}
							type="button"
							className={`${styles.chip} ${statusFilter === filter.value ? styles.chipActive : ""}`}
							onClick={() => setStatusFilter(filter.value)}
						>
							{filter.label}
						</button>
					))}
				</div>
			</div>

			<div className={styles.addNewRow}>
				<Button size="sm" variant="ghost" type="button" onClick={() => setIsAddingNew(true)}>
					+ Add new expense
				</Button>
			</div>

			<ul className={styles.drawerList}>
				{visibleExpenses.length === 0 && <p className={styles.emptyState}>No matching expenses.</p>}

				{visibleExpenses.map((expense) => {
					const remaining = getExpenseRemaining(expense);
					const status = getExpenseStatus(expense);
					const isSelected = selectedIds.includes(expense.id);
					const isDisabled = remaining <= 0 && !isSelected;

					return (
						<li
							key={expense.id}
							className={`${styles.drawerRow} ${isSelected ? styles.drawerRowSelected : ""}`}
						>
							<label className={styles.drawerRowLabel}>
								<input
									type="checkbox"
									checked={isSelected}
									disabled={isDisabled}
									onChange={() => onToggleExpense(expense.id)}
								/>
								<div className={styles.drawerRowInfo}>
									<span className={styles.drawerRowDescription}>{expense.description}</span>
									<span className={styles.drawerRowMeta}>
										{expense.category} ·{" "}
										<span className={`${styles.statusPill} ${styles[`status${status}`]}`}>
											{status.toLowerCase()}
										</span>
									</span>
								</div>
							</label>
							<div className={styles.drawerRowAmounts}>
								<span className={styles.drawerRowOriginal}>{formatRupiah(expense.originalAmount)}</span>
								<span className={styles.drawerRowRemaining}>{formatRupiah(remaining)} left</span>
							</div>
						</li>
					);
				})}
			</ul>
		</Drawer>
	);
}
