import styles from "./FinanceResult.module.css";
// import { useFinanceAllocation } from "../../Hooks/useFinanceAllocation";
import { AllocationSelector, AllocationSelectorDrawer } from "./components/AllocationSelector";
// import { ExpensesStep, ExpenseDrawer } from "./components/ExpensesStep";
// import type { TExpenseSection, TBusinessExpense } from "./components/ExpensesStep";
import { useState } from "react";
import { useFinanceSettlementCycle } from "../../Hooks/useFinanceSettlementCycle";
import { useSettlementSales } from "../../Hooks/useSettlementSales";
import StepNav from "./components/StepNav";
import SalesStep from "./components/SalesStep";
// import SummaryStep from "./components/SummaryStep";
import SalesBreakdown from "./components/SalesBreakdown";
import Button from "../../Component/Button/Button";
import LoadingModal from "../../Component/LoadingModal/LoadingModal";

type FinancePageDrawers = {
	type: "SETTLEMENT_SELECTOR";
} | null;

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
	const { loadSettlement, startNewSettlement, updateDraftSettlement, onSave, onCancel } = cycleControl;
	// settlements states
	const { isNewSettlement, isEditMade, currentStep, setCurrentStep } = cycleControl;
	// settlements loading state
	const { showLoading: cycleLoading, loadingState: cycleLoadingMessage } = cycleControl;

	// settlements DERIVATION
	const isReadOnly = activeSettlement.settlementStatus === "SETTLED";
	const isConfirmed = activeSettlement.settlementStatus === "CONFIRMED";
	const isDraft = activeSettlement.settlementStatus === "DRAFT";
	const showNameField = (isNewSettlement || activeSettlement.settlementStatus === "DRAFT") && !isReadOnly;
	const readyToSave = isEditMade || isNewSettlement;

	// SALES STEP HOOKS
	const salesControl = useSettlementSales(isReadOnly, currentStep === "SALES", activeSettlement);
	// sales data
	const { productNames, productsCategories, transactionItems, checkIsEffectivelySelected } = salesControl;
	// sales functions
	const { toggleTransaction, selectAllFiltered, clearSelection, resetSelection } = salesControl;
	// sales pagination
	const { totalCount, totalSelected, totalPages, itemPerPage } = salesControl;
	// sales step stated & ui states
	const { salesFilter, updateSalesFilter, toggledTransactionItems, preventRefilter } = salesControl;

	// sales DERIVATION
	const salesCurrentPage = salesFilter.page;
	const safeCurrentPage = Math.min(salesCurrentPage, totalPages);
	const firstItem = totalCount === 0 ? 0 : (safeCurrentPage - 1) * itemPerPage + 1;
	const lastItem = Math.min(safeCurrentPage * itemPerPage, totalCount);

	const [drawerState, setDrawerState] = useState<FinancePageDrawers>(null);

	const allocationSelectorDrawerState = drawerState?.type === "SETTLEMENT_SELECTOR";

	const { showLoading, loadingState } = consolidateLoadingState([
		{ isLoading: cycleLoading, loadingState: cycleLoadingMessage }
	]);

	// console.log(activeSettlement);
	// {
	//     "settlementStart": "2026-09-02T17:54:47",
	//     "settlementEnd": "2026-09-02T17:54:47",
	//     "settlementFilter": null,
	//     "salesRevenue": 0,
	//     "salesIngredientCost": 0,
	//     "salesLaborCost": 0,
	//     "salesPackagingCost": 0,
	//     "salesUtilityCost": 0,
	//     "salesMargin": 0,
	//     "settledIngredientCost": null,
	//     "settledLaborCost": null,
	//     "settledPackagingCost": null,
	//     "settledUtilityCost": null,
	//     "totalAdditionalExpenses": 0,
	//     "profitDistributed": 0,
	//     "profitRetained": 0,
	//     "deficitCovered": 0,
	//     "settlementId": 6,
	//     "settlementName": "Test Again Ok Really",
	//     "settlementStatus": "DRAFT",
	//     "settlementLastUpdatedAt": "2026-09-02T18:02:01",
	//     "settlementCreatedAt": "2026-09-02T10:54:48.448026"
	// }

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
	const salesBreakdown = (
		<SalesBreakdown
			step={currentStep}
			settlement={activeSettlement}
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
							toggeledItems={toggledTransactionItems}
							onSelectAll={selectAllFiltered}
							onClearSelection={clearSelection}
							onResetSelection={resetSelection}
							readOnly={!isDraft}
							breakdown={salesBreakdown}
							pageData={{
								firstItem: firstItem,
								lastItem: lastItem,
								totalCount: totalCount,
								totalSelected: totalSelected,
								totalPages: totalPages,
								currentPage: salesCurrentPage
							}}
						/>
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
						settlements={settlements}
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
			{/* <Warners></Warners> */}
		</div>
	);
}
