// IMPORT STYLES
import styles from "./02_ExpensesStep.module.css";
// IMPORT TYPES
import type { ReactNode, SubmitEvent } from "react";
import type { TBusinessExpense, TExpenseSection, TExpenseStatus } from "../../../Types/expense";
import type { TSalesEstimate } from "../../../Utilities/resolveSalesEstimate";
import {
	CATEGORY_OPTIONS_BY_SECTION,
	type BusinessExpenseCategory
} from "../../../Services/supabase/businessExpensesServices";
// IMPORT HOOKS
import { useState } from "react";
// IMPORT COMPONENTS
import Button from "../../../Component/Button/Button";
import Drawer from "../../../Component/Drawer/Drawer";
import RupiahInput from "../../../Component/RupiahInput/RupiahInput";
// IMPORT UTILITIES
import { formatRupiah } from "../../../Utilities/NumberFormater";
import TrashIcon from "../../../Component/MediaComponent/TrashIcon";
import { EditIcon } from "lucide-react";

const SHOW_PACKAGING_INGREDIENT_SECTIONS = false;

export type ExpensesStepProps = {
	salesEstimate: TSalesEstimate;
	readOnly: boolean;

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
	salesEstimate,
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
	const utilityExpenses = expenses.filter((e) => e.section === "UTILITIES");
	const additionalExpenses = expenses.filter((e) => e.section === "ADDITIONAL");

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
						estimate={salesEstimate.labor}
						actual={laborActual}
						onActualChange={onLaborActualChange}
						readOnly={readOnly}
					/>

					<ExpenseBackedSection
						title="Utilities"
						estimateLabel="Sales estimate"
						estimate={salesEstimate.utility}
						expenses={utilityExpenses}
						selectedIds={selectedUtilityIds}
						readOnly={readOnly}
						isDrawerOpen={activeDrawer === "UTILITIES"}
						onOpenDrawer={() => setActiveDrawer("UTILITIES")}
					/>
					{SHOW_PACKAGING_INGREDIENT_SECTIONS && (
						<>
							<DerivedCostSection
								title="Packaging"
								amount={salesEstimate.packing}
								note="Derived from sales COGS. Packaging purchases are tracked separately and aren't recognized directly here."
							/>

							<DerivedCostSection
								title="Ingredient"
								amount={salesEstimate.ingredient}
								note="Derived from the ingredient COGS consumed by the selected sales — not the full ingredient purchase amount."
							/>
						</>
					)}

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

const STATUS_FILTERS: { label: string; value: TExpenseStatus | "ALL" }[] = [
	{ label: "All", value: "ALL" },
	{ label: "Unsettled", value: "UNSETTLED" },
	{ label: "Partial", value: "PARTIAL" },
	{ label: "Settled", value: "SETTLED" }
];

type TExpenseForm = {
	description: string;
	category: BusinessExpenseCategory;
	amount: string;
};

function buildEmptyExpenseForm(section: TExpenseSection): TExpenseForm {
	return {
		description: "",
		category: CATEGORY_OPTIONS_BY_SECTION[section][0],
		amount: ""
	};
}

function getExpenseRemaining(expense: TBusinessExpense) {
	return Math.max(expense.originalAmount - expense.settledAmount, 0);
}

function getExpenseStatus(expense: TBusinessExpense): TExpenseStatus {
	if (getExpenseRemaining(expense) <= 0) return "SETTLED";
	if (expense.settledAmount > 0) return "PARTIAL";
	return "UNSETTLED";
}

type ExpenseSubDrawer = { type: "ADD" | "EDIT"; expenseData?: TBusinessExpense } | null;

export type ExpenseDrawerProps = {
	section: TExpenseSection;
	expenses: TBusinessExpense[];
	selectedIds: string[];
	onToggleExpense: (id: string) => void;
	onAddExpense: (expense: Omit<TBusinessExpense, "id" | "section" | "settledAmount">) => Promise<unknown>;
	onEditExpense: (expense: Omit<TBusinessExpense, "section" | "settledAmount">) => void;
	onDeleteExpense: (id: string) => void;
	onClose: () => void;
};

export function ExpenseDrawer({
	section,
	expenses,
	selectedIds,
	onToggleExpense,
	onAddExpense,
	onEditExpense,
	onDeleteExpense,
	onClose
}: ExpenseDrawerProps) {
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<TExpenseStatus | "ALL">("ALL");
	const [subDrawerState, setSubDrawerState] = useState<ExpenseSubDrawer>(null);
	const [form, setForm] = useState(() => buildEmptyExpenseForm(section));

	const eyebrow = section === "UTILITIES" ? "Biaya Operasional" : "Pengeluaran Lain";

	const visibleExpenses = expenses.filter((expense) => {
		const status = getExpenseStatus(expense);
		const isSelected = selectedIds.includes(expense.id);
		if (!isSelected && status === "SETTLED") return false;
		if (statusFilter !== "ALL" && status !== statusFilter) return false;
		if (search.trim() && !expense.description.toLowerCase().includes(search.trim().toLowerCase())) return false;
		return true;
	});

	async function handleAddOrEditSubmit(event: SubmitEvent<HTMLFormElement>, expenseId?: string) {
		event.preventDefault();
		const amount = Number(form.amount);
		if (!form.description.trim() || !amount) return;

		try {
			if (expenseId) {
				// EDIT
				await onEditExpense({
					id: expenseId,
					description: form.description.trim(),
					category: form.category.trim() || "Other",
					originalAmount: amount
				});
			} else {
				await onAddExpense({
					description: form.description.trim(),
					category: form.category.trim() || "Other",
					originalAmount: amount
				});
				setForm(buildEmptyExpenseForm(section));
			}
			onClose();
		} catch {
			// error already toasted in the mutation's onError — keep the drawer open so the user can retry
		}
	}

	if (subDrawerState !== null) {
		return (
			<AddNewOrEditDrawer
				type={subDrawerState.type}
				eyebrow={eyebrow}
				onCloseSubDrawer={() => setSubDrawerState(null)}
				handleSubmit={handleAddOrEditSubmit}
				setForm={setForm}
				expense={subDrawerState.expenseData}
				form={form}
				section={section}
			/>
		);
	}

	return (
		<Drawer
			title={`Pilih ${eyebrow.toLowerCase()}`}
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
				<Button size="sm" variant="ghost" type="button" onClick={() => setSubDrawerState({ type: "ADD" })}>
					+ Add new expense
				</Button>
			</div>

			<ul className={styles.drawerList}>
				{visibleExpenses.length === 0 && <li className={styles.emptyState}>No matching expenses.</li>}

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
							<div className={styles.expenseEditAction}>
								<Button
									size="sm"
									variant="primary"
									type="button"
									className={styles.expenseEditDelete}
									onClick={() => {
										setForm({
											description: expense.description,
											amount: expense.originalAmount.toString(),
											category: expense.category
										});
										setSubDrawerState({ type: "EDIT", expenseData: expense });
									}}
								>
									<EditIcon />
								</Button>
								<Button
									size="sm"
									variant="danger"
									type="button"
									className={styles.expenseEditDelete}
									onClick={() => onDeleteExpense(expense.id)}
								>
									<TrashIcon />
								</Button>
							</div>
						</li>
					);
				})}
			</ul>
		</Drawer>
	);
}

function AddNewOrEditDrawer({
	type,
	eyebrow,
	onCloseSubDrawer,
	handleSubmit,
	setForm,
	expense,
	form,
	section
}: {
	type: "ADD" | "EDIT";
	eyebrow?: string;
	onCloseSubDrawer: () => void;
	handleSubmit: (event: SubmitEvent<HTMLFormElement>, expenseId?: string) => void;
	setForm: (formVal: TExpenseForm) => void;
	expense: TBusinessExpense | undefined;
	form: TExpenseForm;
	section: TExpenseSection;
}) {
	return (
		<Drawer
			title={type === "ADD" ? "Tambah Pengeluaran" : "Edit biaya pengeluaran"}
			eyebrow={eyebrow}
			onClose={() => onCloseSubDrawer()}
			onSubmit={(event) => handleSubmit(event, expense?.id)}
			footer={
				<>
					<Button type="button" variant="ghost" onClick={() => onCloseSubDrawer()}>
						Kembali
					</Button>
					<Button type="submit">{type === "ADD" ? "Tambah & Pilih" : "Edit"} </Button>
				</>
			}
		>
			<label className={styles.field}>
				<span>Deskripsi Pengeluaran</span>
				<input
					type="text"
					value={form.description}
					onChange={(event) => setForm({ ...form, description: event.target.value })}
					placeholder="e.g. August electricity bill"
					required
				/>
			</label>

			<label className={styles.field}>
				<span>Kategori Pengeluaran</span>
				<select
					value={form.category}
					onChange={(event) => setForm({ ...form, category: event.target.value as BusinessExpenseCategory })}
				>
					{CATEGORY_OPTIONS_BY_SECTION[section].map((category) => (
						<option key={category} value={category}>
							{category}
						</option>
					))}
				</select>
			</label>

			<label className={styles.field}>
				<span>Jumlah Pengeluaran</span>
				<RupiahInput
					value={form.amount}
					onChange={(event) => setForm({ ...form, amount: event.currentTarget.value })}
					placeholder="0"
				/>
			</label>
		</Drawer>
	);
}
