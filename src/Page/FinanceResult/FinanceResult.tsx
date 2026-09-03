import styles from "./FinanceResult.module.css";
// import { useFinanceAllocation } from "../../Hooks/useFinanceAllocation";
import { AllocationSelector, AllocationSelectorDrawer } from "./components/AllocationSelector";
// import { ExpensesStep, ExpenseDrawer } from "./components/ExpensesStep";
// import type { TExpenseSection, TBusinessExpense } from "./components/ExpensesStep";
import { useState } from "react";
import { useFinanceSettlementCycle } from "../../Hooks/useFinanceSettlementCycle";
import StepNav from "./components/StepNav";
// import SalesStep from "./components/SalesStep";
// import SummaryStep from "./components/SummaryStep";
// import SalesBreakdown from "./components/SalesBreakdown";
import Button from "../../Component/Button/Button";
import LoadingModal from "../../Component/LoadingModal/LoadingModal";

type FinancePageDrawers = {
	type: "SETTLEMENT_SELECTOR";
} | null;

export default function FinancePage() {
	const {
		// data
		settlement,
		selectedSettlement,
		activeSettlement,
		// functions
		loadSettlement,
		startNewSettlement,
		updateDraftSettlement,
		onSave,
		onCancel,
		// states
		isNewSettlement,
		isEditMade,
		currentStep,
		setCurrentStep,
		// ui state
		showLoading,
		loadingState
	} = useFinanceSettlementCycle();

	const [drawerState, setDrawerState] = useState<FinancePageDrawers>(null);

	const allocationSelectorDrawerState = drawerState?.type === "SETTLEMENT_SELECTOR";

	const isReadOnly = activeSettlement.settlementStatus === "SETTLED";
	const isConfirmed = activeSettlement.settlementStatus === "CONFIRMED";
	const isDraft = activeSettlement.settlementStatus === "DRAFT";
	const showNameField = (isNewSettlement || activeSettlement.settlementStatus === "DRAFT") && !isReadOnly;
	const readyToSave = isEditMade || isNewSettlement;

	// --- handler ------------------------------------------------------
	function openAllocationDrawer(open: boolean) {
		setDrawerState(open ? { type: "SETTLEMENT_SELECTOR" } : null);
	}

	// const {
	// draftAllocation, -- replaced kinda
	// editMode,
	// filters,
	// setFilters,
	// categories,
	// productNames,
	// filteredTransactions,
	// selectedTransactions,
	// salesSummary,
	// adjustmentsTotal,
	// finalResult,
	// distributionTotalAmount,
	// distributionTotalPercent,
	// isDistributionReconciled,
	// isReadOnly,
	// isSalesAdjustmentsEditable,
	// isDistributionEditable,
	// isSaving,
	// savingMessage,
	// toggleTransaction,
	// selectAllFiltered,
	// clearSelection,
	// setDistributionMode,
	// updateDistributionEntry,
	// addDistributionEntry,
	// removeDistributionEntry,
	// confirmAllocation,
	// saveDraft,
	// enableEdit,
	// distributeAllocation,
	// setDraftName
	// } = useFinanceAllocation();

	// const [activeExpenseDrawer, setActiveExpenseDrawer] = useState<TExpenseSection | null>(null);

	// const [laborActual, setLaborActual] = useState(0);
	// const [expenses, setExpenses] = useState<TBusinessExpense[]>([]);
	// const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);

	// const selectedUtilityIds = selectedExpenseIds.filter((id) =>
	// 	expenses.some((expense) => expense.id === id && expense.section === "UTILITIES")
	// );
	// const selectedAdditionalIds = selectedExpenseIds.filter((id) =>
	// 	expenses.some((expense) => expense.id === id && expense.section === "ADDITIONAL")
	// );

	// function handleToggleExpense(_section: TExpenseSection, id: string) {
	// 	setSelectedExpenseIds((prev) =>
	// 		prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]
	// 	);
	// }

	// function handleAddExpense(
	// 	section: TExpenseSection,
	// 	data: Omit<TBusinessExpense, "id" | "section" | "settledAmount">
	// ) {
	// 	const id = `exp-${Date.now()}`;
	// 	setExpenses((prev) => [...prev, { ...data, id, section, settledAmount: 0 }]);
	// 	setSelectedExpenseIds((prev) => [...prev, id]);
	// }
	// --- END SCAFFOLDING ----------------------------------------------------

	// function openExpenseDrawer(section: TExpenseSection | null) {
	// 	if (section) {
	// 		setAllocationSelectorDrawerState(false);
	// 	}
	// 	setActiveExpenseDrawer(section);
	// }

	// const statusActions = {
	// 	canConfirm: (isNewAllocation || draftAllocation.status === "DRAFT") && !isReadOnly,
	// 	canEnableEdit: !isNewAllocation && draftAllocation.status === "CONFIRMED" && !editMode,
	// 	canDistribute: draftAllocation.status === "CONFIRMED"
	// };

	// Built once, fed by one data source, then handed to whichever step is
	// currently on screen — SalesStep/ExpensesStep/SummaryStep each just
	// drop it into their own existing layout slot.
	// const salesBreakdown = (
	// 	<SalesBreakdown
	// 		step={currentStep}
	// 		transactions={selectedTransactions}
	// 		salesSummary={salesSummary}
	// 		adjustments={draftAllocation.adjustments}
	// 		adjustmentsTotal={adjustmentsTotal}
	// 		finalResult={finalResult}
	// 	/>
	// );

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
						selectedSettlement={isNewSettlement ? null : (selectedSettlement ?? null)}
						isNewAllocation={isNewSettlement}
					/>
				</header>

				<div className={styles.controlRow}>
					<StepNav currentStep={currentStep} onStepChange={setCurrentStep} />

					{(showNameField || isConfirmed) && (
						<div className={styles.nameField}>
							{!isConfirmed && (
								<input
									type="text"
									value={activeSettlement.settlementName}
									onChange={(event) => updateDraftSettlement({ settlementName: event.target.value })}
									placeholder="Name this allocation, e.g. August 2026 — Regular Operations"
									className={styles.nameInput}
								/>
							)}
							{readyToSave && (
								<>
									<Button disabled={showLoading} variant="primary" size="md" onClick={onSave}>
										Save
									</Button>
									<Button disabled={showLoading} variant="danger" size="md" onClick={onCancel}>
										Cancel
									</Button>
								</>
							)}
							{isDraft && (
								<Button variant="danger" size="md">
									Delete
								</Button>
							)}
							{isConfirmed && (
								<Button variant="primary" size="md">
									Edit
								</Button>
							)}
						</div>
					)}
				</div>

				<main className={styles.content}>
					{currentStep === "SALES" && (
						<div></div>
						// <SalesStep
						// 	transactions={filteredTransactions}
						// 	filters={filters}
						// 	onFiltersChange={setFilters}
						// 	categories={categories}
						// 	products={productNames}
						// 	selectedTransactionIds={draftAllocation.transactionIds}
						// 	onToggleTransaction={toggleTransaction}
						// 	onSelectAll={selectAllFiltered}
						// 	onClearSelection={clearSelection}
						// 	readOnly={!isSalesAdjustmentsEditable}
						// 	breakdown={salesBreakdown}
						// />
					)}

					{/* {currentStep === "ADJUSTMENTS" && (
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
					)} */}
				</main>
			</div>

			<div className={styles.drawerSection}>
				{allocationSelectorDrawerState && (
					<AllocationSelectorDrawer
						settlements={settlement}
						selectedSettlement={isNewSettlement ? null : activeSettlement}
						onSelect={loadSettlement}
						onCreateNew={startNewSettlement}
						setDrawerState={openAllocationDrawer}
					/>
				)}

				{/* {activeExpenseDrawer && (
					<ExpenseDrawer
						section={activeExpenseDrawer}
						expenses={expenses.filter((expense) => expense.section === activeExpenseDrawer)}
						selectedIds={activeExpenseDrawer === "UTILITIES" ? selectedUtilityIds : selectedAdditionalIds}
						onToggleExpense={(id) => handleToggleExpense(activeExpenseDrawer, id)}
						onAddExpense={(data) => handleAddExpense(activeExpenseDrawer, data)}
						onClose={() => setActiveExpenseDrawer(null)}
					/>
				)} */}
			</div>

			<LoadingModal isOpen={showLoading}>{loadingState}</LoadingModal>
		</div>
	);
}
