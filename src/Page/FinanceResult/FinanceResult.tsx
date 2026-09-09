import styles from "./FinanceResult.module.css";
import { AllocationSelector, AllocationSelectorDrawer } from "./components/AllocationSelector";
import { ExpensesStep, ExpenseDrawer } from "./components/ExpensesStep";
import { useState } from "react";
import { useFinanceSettlementCycle } from "../../Hooks/useFinanceSettlementCycle";
import { useSettlementSales } from "../../Hooks/useSettlementSales";
import { resolveSalesEstimate } from "../../Utilities/resolveSalesEstimate";

import StepNav from "./components/StepNav";
import SalesStep from "./components/SalesStep";
// import SummaryStep from "./components/SummaryStep";
import SalesBreakdown from "./components/SalesBreakdown";
import Button from "../../Component/Button/Button";
import LoadingModal from "../../Component/LoadingModal/LoadingModal";
import { useSettlementExpenses } from "../../Hooks/useSettlementExpenses";
import type { TExpenseSection } from "../../Types/expense";

type FinancePageDrawers =
	| { type: "SETTLEMENT_SELECTOR" }
	| { type: "EXPENSES_DRAWER"; section: TExpenseSection }
	| null;

type LoadingState = {
	isLoading: boolean;
	loadingState: string;
};

const consolidateLoadingState = (statesLoading: LoadingState[]) => {
	statesLoading.forEach((state) => {
		if (state.isLoading) {
			return { showLoading: state.isLoading, loadingState: state.loadingState };
		}
	});
	return {
		showLoading: false,
		loadingState: ""
	};
};

export default function FinancePage() {
	// CYCLE HOOKS
	const cycleControl = useFinanceSettlementCycle();
	// settlements data
	const { settlements, selectedSettlement, activeSettlement } = cycleControl;
	// settlements functions
	const { loadSettlement, startNewSettlement, updateDraftSettlement } = cycleControl;
	// settlements states
	const { isNewSettlement, isEditMade, setIsEditMade, currentStep, setCurrentStep } = cycleControl;
	// settlements loading state
	const { showLoading: cycleLoading, loadingState: cycleLoadingMessage } = cycleControl;
	// settlement result control
	const { onSave, onCancel, onDelete } = cycleControl;

	// settlements DERIVATION
	const isReadOnly = activeSettlement.settlementStatus === "SETTLED";
	const isConfirmed = activeSettlement.settlementStatus === "CONFIRMED";
	const isDraft = activeSettlement.settlementStatus === "DRAFT";
	const showNameField = (isNewSettlement || activeSettlement.settlementStatus === "DRAFT") && !isReadOnly;
	const readyToSave = isEditMade || isNewSettlement;

	// SALES STEP HOOKS
	const salesControl = useSettlementSales(isReadOnly, currentStep === "SALES", activeSettlement, setIsEditMade);
	// sales data
	const { productNames, productsCategories, transactionItems, productBreakdown, settlementSummary } = salesControl;
	// sales functions
	const {
		checkIsEffectivelySelected,
		totalEffectiveSelected,
		toggleTransaction,
		savingSales,
		selectAllFiltered,
		clearSelection,
		resetSelection
	} = salesControl;
	// sales pagination
	const { totalCount, totalSelected, totalPages, itemPerPage } = salesControl;
	// sales step stated & ui states
	const { salesFilter, updateSalesFilter, preventRefilter, breakdownGroupBy, setBreakdownGroupBy } = salesControl;
	// sales loading state
	const { showLoading: salesLoading, loadingState: salesLoadingMessage } = salesControl;

	// sales DERIVATION
	const salesCurrentPage = salesFilter.page;
	const safeCurrentPage = Math.min(salesCurrentPage, totalPages);
	const firstItem = totalCount === 0 ? 0 : (safeCurrentPage - 1) * itemPerPage + 1;
	const lastItem = Math.min(safeCurrentPage * itemPerPage, totalCount);

	// EXPENSES STEP HOOKS
	const expensesControl = useSettlementExpenses(
		currentStep === "SETTLEMENT",
		activeSettlement.settlementId,
		setIsEditMade
	);
	// Expense selector
	const { expenses, selectedUtilityIds, selectedAdditionalIds } = expensesControl;
	// Expense functons
	const { toggleExpense, addExpense, saveExpenses, resetExpenseSelection } = expensesControl;
	// Expense loading
	const { showLoading: expenseLoading, loadingState: expenseLoadingMessage } = expensesControl;

	const [laborActual, setLaborActual] = useState(0);

	// Single drawer state for the whole page.
	const [drawerState, setDrawerState] = useState<FinancePageDrawers>(null);

	const allocationSelectorDrawerState = drawerState?.type === "SETTLEMENT_SELECTOR";
	const expensesDrawerSection = drawerState?.type === "EXPENSES_DRAWER" ? drawerState.section : null;

	const { showLoading, loadingState } = consolidateLoadingState([
		{ isLoading: cycleLoading, loadingState: cycleLoadingMessage },
		{ isLoading: salesLoading, loadingState: salesLoadingMessage },
		{ isLoading: expenseLoading, loadingState: expenseLoadingMessage }
	]);

	const salesEstimate = resolveSalesEstimate(activeSettlement, settlementSummary ?? null);

	// --- handler ------------------------------------------------------
	function openAllocationDrawer(open: boolean) {
		setDrawerState(open ? { type: "SETTLEMENT_SELECTOR" } : null);
	}

	function openExpenseDrawer(section: TExpenseSection | null) {
		setDrawerState(section ? { type: "EXPENSES_DRAWER", section } : null);
	}

	async function handleSaving() {
		try {
			const salesPortion = savingSales();
			const saveId = await onSave(salesPortion);
			await saveExpenses(saveId);
			window.location.reload();
		} catch (error) {
			console.error("Save failed", error);
		}
	}

	function handleCancle() {
		resetSelection();
		resetExpenseSelection();
		onCancel();
	}

	function handleDelete() {
		onDelete();
	}

	// function handleConfirmation() {}

	// const {
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

	// const statusActions = {
	// 	canConfirm: (isNewAllocation || draftAllocation.status === "DRAFT") && !isReadOnly,
	// 	canEnableEdit: !isNewAllocation && draftAllocation.status === "CONFIRMED" && !editMode,
	// 	canDistribute: draftAllocation.status === "CONFIRMED"
	// };

	// Built once, fed by one data source, then handed to whichever step is
	// currently on screen — SalesStep/ExpensesStep/SummaryStep each just
	// drop it into their own existing layout slot.
	const salesBreakdown = (
		<SalesBreakdown
			step={currentStep}
			settlement={activeSettlement}
			productBreakdown={productBreakdown || []}
			settlementSummary={settlementSummary ?? null}
			breakdownGroupBy={breakdownGroupBy}
			onBreakdownGroupByChange={setBreakdownGroupBy}
			// transactions={selectedTransactions}
			// salesSummary={salesSummary}
			// adjustments={draftAllocation.adjustments}
			// adjustmentsTotal={adjustmentsTotal}
			// finalResult={finalResult}
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
									<Button
										disabled={showLoading || activeSettlement.settlementName === ""}
										variant="primary"
										size="md"
										onClick={handleSaving}
									>
										Save as Draft
									</Button>
									<Button disabled={showLoading} variant="danger" size="md" onClick={handleCancle}>
										Cancel
									</Button>
								</>
							)}
							{isDraft && !isNewSettlement && (
								<Button variant="danger" size="md" onClick={handleDelete}>
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
						<SalesStep
							activeSettlement={activeSettlement}
							filters={salesFilter}
							onFiltersChange={updateSalesFilter}
							isFilterAllowed={!preventRefilter}
							categories={productsCategories}
							transactionsItems={transactionItems || []}
							products={productNames}
							checkSelection={checkIsEffectivelySelected}
							onToggleTransaction={toggleTransaction}
							// toggeledItems={toggledTransactionItems}
							totalEffectiveSelected={totalEffectiveSelected()}
							onSelectAll={selectAllFiltered}
							onClearSelection={clearSelection}
							onResetSelection={resetSelection}
							readOnly={!isDraft}
							breakdown={salesBreakdown}
							pageData={{
								firstItem,
								lastItem,
								totalCount,
								totalSelected,
								totalPages,
								currentPage: salesCurrentPage
							}}
						/>
					)}

					{currentStep === "SETTLEMENT" && (
						<ExpensesStep
							salesEstimate={salesEstimate}
							readOnly={!isDraft}
							breakdown={salesBreakdown}
							laborActual={laborActual}
							onLaborActualChange={setLaborActual}
							expenses={expenses}
							selectedUtilityIds={selectedUtilityIds}
							selectedAdditionalIds={selectedAdditionalIds}
							activeDrawer={expensesDrawerSection}
							setActiveDrawer={openExpenseDrawer}
							onToggleExpense={toggleExpense}
						/>
					)}

					{/* {currentStep === "SUMMARY" && (
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
						settlements={settlements}
						selectedSettlement={isNewSettlement ? null : activeSettlement}
						onSelect={(id) => {
							if (preventRefilter) {
								const confirmed = window.confirm(
									"You have some changed in the sales selection, are you really want to go to other settlement without saving?"
								);
								if (!confirmed) return;
							}
							loadSettlement(id);
							resetSelection();
						}}
						onCreateNew={() => {
							if (preventRefilter) {
								const confirmed = window.confirm(
									"You have some changed in the sales selection, are you really want to go to other settlement without saving?"
								);
								if (!confirmed) return;
							}
							startNewSettlement();
						}}
						setDrawerState={openAllocationDrawer}
					/>
				)}

				{expensesDrawerSection && (
					<ExpenseDrawer
						section={expensesDrawerSection}
						expenses={expenses.filter((expense) => expense.section === expensesDrawerSection)}
						selectedIds={expensesDrawerSection === "UTILITIES" ? selectedUtilityIds : selectedAdditionalIds}
						onToggleExpense={(id) => toggleExpense(expensesDrawerSection, id)}
						onAddExpense={(data) => addExpense(expensesDrawerSection, data)}
						onClose={() => setDrawerState(null)}
					/>
				)}
			</div>

			<LoadingModal isOpen={showLoading}>{loadingState}</LoadingModal>
			{/* <Warners></Warners> */}
		</div>
	);
}
