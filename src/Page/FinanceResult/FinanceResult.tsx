import styles from "./FinanceResult.module.css";
import { useFinanceAllocation } from "../../Hooks/useFinanceAllocation";
import { AllocationSelector, AllocationSelectorDrawer } from "./components/AllocationSelector";
import { ExpensesStep, ExpenseDrawer } from "./components/ExpensesStep";
import type { TExpenseSection, TBusinessExpense } from "./components/ExpensesStep";
import { useState } from "react";
import StepNav from "./components/StepNav";
import SalesStep from "./components/SalesStep";
import SummaryStep from "./components/SummaryStep";
import SalesBreakdown from "./components/SalesBreakdown";
import Button from "../../Component/Button/Button";
import LoadingModal from "../../Component/LoadingModal/LoadingModal";

export default function FinancePage() {
	const {
		allocations,
		selectedAllocation,
		isNewAllocation,
		draftAllocation,
		currentStep,
		setCurrentStep,
		editMode,
		filters,
		setFilters,
		categories,
		productNames,
		filteredTransactions,
		selectedTransactions,
		salesSummary,
		adjustmentsTotal,
		finalResult,
		distributionTotalAmount,
		distributionTotalPercent,
		isDistributionReconciled,
		isReadOnly,
		isSalesAdjustmentsEditable,
		isDistributionEditable,
		isSaving,
		savingMessage,
		loadAllocation,
		startNewAllocation,
		toggleTransaction,
		selectAllFiltered,
		clearSelection,
		setDistributionMode,
		updateDistributionEntry,
		addDistributionEntry,
		removeDistributionEntry,
		confirmAllocation,
		saveDraft,
		enableEdit,
		distributeAllocation,
		setDraftName
	} = useFinanceAllocation();

	const [allocationSelectorDrawerState, setAllocationSelectorDrawerState] = useState(false);
	const [activeExpenseDrawer, setActiveExpenseDrawer] = useState<TExpenseSection | null>(null);

	// --- SCAFFOLDING ------------------------------------------------------
	// Placeholder state so ExpensesStep compiles and is fully interactive.
	// Move all of this into useFinanceAllocation.ts (next to draftAllocation)
	// once Labor/Utilities/Additional are persisted for real — mirrors how
	// addAdjustment/removeAdjustment work today, just split into two
	// selection lists instead of one flat array. Delete this block then.
	const [laborActual, setLaborActual] = useState(0);
	const [expenses, setExpenses] = useState<TBusinessExpense[]>([]);
	const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);

	const selectedUtilityIds = selectedExpenseIds.filter((id) =>
		expenses.some((expense) => expense.id === id && expense.section === "UTILITIES")
	);
	const selectedAdditionalIds = selectedExpenseIds.filter((id) =>
		expenses.some((expense) => expense.id === id && expense.section === "ADDITIONAL")
	);

	function handleToggleExpense(_section: TExpenseSection, id: string) {
		setSelectedExpenseIds((prev) =>
			prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]
		);
	}

	function handleAddExpense(
		section: TExpenseSection,
		data: Omit<TBusinessExpense, "id" | "section" | "settledAmount">
	) {
		const id = `exp-${Date.now()}`;
		setExpenses((prev) => [...prev, { ...data, id, section, settledAmount: 0 }]);
		setSelectedExpenseIds((prev) => [...prev, id]);
	}
	// --- END SCAFFOLDING ----------------------------------------------------

	// Only one right-side drawer makes sense open at a time — opening one closes the other.
	function openAllocationDrawer(open: boolean) {
		if (open) {
			setActiveExpenseDrawer(null);
		}
		setAllocationSelectorDrawerState(open);
	}

	function openExpenseDrawer(section: TExpenseSection | null) {
		if (section) {
			setAllocationSelectorDrawerState(false);
		}
		setActiveExpenseDrawer(section);
	}

	const statusActions = {
		canConfirm: (isNewAllocation || draftAllocation.status === "DRAFT") && !isReadOnly,
		canEnableEdit: !isNewAllocation && draftAllocation.status === "CONFIRMED" && !editMode,
		canDistribute: draftAllocation.status === "CONFIRMED"
	};

	const showNameField = (isNewAllocation || draftAllocation.status === "DRAFT") && !isReadOnly;

	// Built once, fed by one data source, then handed to whichever step is
	// currently on screen — SalesStep/ExpensesStep/SummaryStep each just
	// drop it into their own existing layout slot.
	const salesBreakdown = (
		<SalesBreakdown
			step={currentStep}
			transactions={selectedTransactions}
			salesSummary={salesSummary}
			adjustments={draftAllocation.adjustments}
			adjustmentsTotal={adjustmentsTotal}
			finalResult={finalResult}
		/>
	);

	return (
		<div className={`page ${styles.pageRow}`}>
			<div className={styles.pageColumn}>
				<header className={styles.header}>
					<div>
						<p className={styles.eyebrow}>Orenji Cashier</p>
						<h1 className={styles.title}>Finance</h1>
					</div>

					<AllocationSelector
						setDrawerState={openAllocationDrawer}
						drawerState={allocationSelectorDrawerState}
						selectedAllocation={isNewAllocation ? null : selectedAllocation}
						isNewAllocation={isNewAllocation}
					/>
				</header>

				<div className={styles.controlRow}>
					<StepNav currentStep={currentStep} onStepChange={setCurrentStep} />

					{showNameField && (
						<div className={styles.nameField}>
							<input
								type="text"
								value={draftAllocation.name}
								onChange={(event) => setDraftName(event.target.value)}
								placeholder="Name this allocation, e.g. August 2026 — Regular Operations"
								className={styles.nameInput}
							/>
							<Button variant="primary" size="md" onClick={saveDraft}>
								Save draft
							</Button>
							<Button variant="danger" size="md">
								Cancel
							</Button>
						</div>
					)}
				</div>

				<main className={styles.content}>
					{currentStep === "SALES" && (
						<SalesStep
							transactions={filteredTransactions}
							filters={filters}
							onFiltersChange={setFilters}
							categories={categories}
							products={productNames}
							selectedTransactionIds={draftAllocation.transactionIds}
							onToggleTransaction={toggleTransaction}
							onSelectAll={selectAllFiltered}
							onClearSelection={clearSelection}
							readOnly={!isSalesAdjustmentsEditable}
							breakdown={salesBreakdown}
						/>
					)}

					{currentStep === "ADJUSTMENTS" && (
						<ExpensesStep
							transactions={selectedTransactions}
							readOnly={!isSalesAdjustmentsEditable}
							breakdown={salesBreakdown}
							laborActual={laborActual}
							onLaborActualChange={setLaborActual}
							expenses={expenses}
							selectedUtilityIds={selectedUtilityIds}
							selectedAdditionalIds={selectedAdditionalIds}
							activeDrawer={activeExpenseDrawer}
							setActiveDrawer={openExpenseDrawer}
							onToggleExpense={handleToggleExpense}
							// onAddExpense={handleAddExpense}
						/>
					)}

					{currentStep === "SUMMARY" && (
						<SummaryStep
							allocation={draftAllocation}
							finalResult={finalResult}
							onDistributionModeChange={setDistributionMode}
							onUpdateDistributionEntry={updateDistributionEntry}
							onAddDistributionEntry={addDistributionEntry}
							onRemoveDistributionEntry={removeDistributionEntry}
							distributionTotalAmount={distributionTotalAmount}
							distributionTotalPercent={distributionTotalPercent}
							isReconciled={isDistributionReconciled}
							canEditDistribution={isDistributionEditable}
							statusActions={statusActions}
							onConfirm={confirmAllocation}
							onEnableEdit={enableEdit}
							onDistribute={distributeAllocation}
							breakdown={salesBreakdown}
						/>
					)}
				</main>
			</div>

			<div className={styles.drawerSection}>
				{allocationSelectorDrawerState && (
					<AllocationSelectorDrawer
						allocations={allocations}
						selectedAllocation={isNewAllocation ? null : selectedAllocation}
						onSelect={loadAllocation}
						onCreateNew={startNewAllocation}
						getTransactionCount={(allocation) => allocation.transactionIds.length}
						setDrawerState={openAllocationDrawer}
					/>
				)}

				{activeExpenseDrawer && (
					<ExpenseDrawer
						section={activeExpenseDrawer}
						expenses={expenses.filter((expense) => expense.section === activeExpenseDrawer)}
						selectedIds={activeExpenseDrawer === "UTILITIES" ? selectedUtilityIds : selectedAdditionalIds}
						onToggleExpense={(id) => handleToggleExpense(activeExpenseDrawer, id)}
						onAddExpense={(data) => handleAddExpense(activeExpenseDrawer, data)}
						onClose={() => setActiveExpenseDrawer(null)}
					/>
				)}
			</div>

			<LoadingModal isOpen={isSaving}>{savingMessage}</LoadingModal>
		</div>
	);
}
