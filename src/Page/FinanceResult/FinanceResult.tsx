import styles from "./FinanceResult.module.css";
import type { TExpenseSection } from "../../Types/expense";

import { AllocationSelector, AllocationSelectorDrawer } from "./components/AllocationSelector";

import StepNav from "./components/StepNav";
import SalesStep from "./components/01_SalesStep";
import { ExpensesStep, ExpenseDrawer } from "./components/02_ExpensesStep";
import SummaryStep from "./components/03_SummaryStep";
import SalesBreakdown from "./components/SalesBreakdown";
import Button from "../../Component/Button/Button";
import LoadingModal from "../../Component/LoadingModal/LoadingModal";
import { useState } from "react";
import { useFinanceSettlementCycle } from "../../Hooks/useFinanceSettlementCycle";
import { useSettlementSales } from "../../Hooks/useSettlementSales";
import { useSettlementExpenses } from "../../Hooks/useSettlementExpenses";
import { resolveSettlementReconciliation } from "../../Utilities/resolveSettlementReconciliation";
import { useProfitAllocation } from "../../Hooks/useProfitAllocation";
import { updateBusinessSettlementResult } from "../../Services/supabase/settlementServices";
import { guardAction } from "../../Utilities/guardAction";

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
	// global hooks
	const [isEditMade, setIsEditMade] = useState<boolean>(false);

	// CYCLE HOOKS
	const cycleControl = useFinanceSettlementCycle(setIsEditMade);
	// settlements data
	const { settlements, selectedSettlement, activeSettlement } = cycleControl.data;
	// settlements functions
	const { loadSettlement, startNewSettlement, updateDraftSettlement, onSave, onCancel, onDelete } =
		cycleControl.functions;
	// settlements states
	const { isNewSettlement, currentStep, setCurrentStep } = cycleControl.states;
	// settlements loading state
	const { showLoading: cycleLoading, loadingState: cycleLoadingMessage } = cycleControl.loadingState;

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
		activeSettlement,
		settlementSummary ?? null,
		setIsEditMade
	);
	// Expense selector
	const { expenses, selectedUtilityIds, selectedAdditionalIds, salesEstimate } = expensesControl;
	// Expense functons
	const { toggleExpense, addExpense, saveExpenses, resetExpenseSelection } = expensesControl;
	// Expense loading
	const { showLoading: expenseLoading, loadingState: expenseLoadingMessage } = expensesControl;
	// Expense labor
	const { laborActual, updateLaborActual, isLaborEdited, clearLaborEdit } = expensesControl;

	// Single drawer state for the whole page.
	const [drawerState, setDrawerState] = useState<FinancePageDrawers>(null);

	const allocationSelectorDrawerState = drawerState?.type === "SETTLEMENT_SELECTOR";
	const expensesDrawerSection = drawerState?.type === "EXPENSES_DRAWER" ? drawerState.section : null;

	const { showLoading, loadingState } = consolidateLoadingState([
		{ isLoading: cycleLoading, loadingState: cycleLoadingMessage },
		{ isLoading: salesLoading, loadingState: salesLoadingMessage },
		{ isLoading: expenseLoading, loadingState: expenseLoadingMessage }
	]);

	const reconciliation = resolveSettlementReconciliation({
		revenue: salesEstimate.revenue,
		laborActual,
		packagingEstimate: salesEstimate.packing,
		ingredientEstimate: salesEstimate.ingredient,
		expenses,
		selectedUtilityIds,
		selectedAdditionalIds
	});

	const { profitDistributed, profitRetained, setProfitDistributed, resetProfitAllocation } = useProfitAllocation(
		activeSettlement.settlementId,
		isNewSettlement,
		reconciliation.balance,
		activeSettlement.profitDistributed
	);

	// --------------------------------------- HANDLER ---------------------------------------
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
			if (currentStep === "SUMMARY" && saveId) {
				await updateBusinessSettlementResult({
					businessSettlementId: saveId,
					settledLaborCost: reconciliation.settledLaborCost,
					settledPackagingCost: reconciliation.settledPackagingCost,
					settledUtilityCost: reconciliation.settledUtilityCost,
					settledIngredientCost: reconciliation.settledIngredientCost,
					profitRetained,
					profitDistributed,
					deficitCovered: reconciliation.isDeficit ? Math.abs(reconciliation.balance) : 0
				});
			}

			window.location.reload();
		} catch (error) {
			console.error("Save failed", error);
		}
	}

	function handleCancle() {
		resetSelection();
		resetExpenseSelection();
		resetProfitAllocation();
		onCancel();
	}

	function handleDelete() {
		onDelete();
	}

	const salesBreakdown = (
		<SalesBreakdown
			step={currentStep}
			settlement={activeSettlement}
			reconciliation={reconciliation}
			productBreakdown={productBreakdown || []}
			settlementSummary={settlementSummary ?? null}
			breakdownGroupBy={breakdownGroupBy}
			onBreakdownGroupByChange={setBreakdownGroupBy}
			isExpenseEdit={isLaborEdited}
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
							onToggleTransaction={(row) => {
								guardAction(
									isLaborEdited,
									"You have changed the labor in the settlement section, do you really want to re-select the transaction items, it will reset the labor section to labor sales portion?",
									() => {
										clearLaborEdit();
										toggleTransaction(row);
									}
								);
							}}
							totalEffectiveSelected={totalEffectiveSelected()}
							onSelectAll={selectAllFiltered}
							onClearSelection={() =>
								guardAction(
									isLaborEdited,
									"You have changed the labor in the settlement section, do you really want to re-select the transaction items, it will reset the labor section to labor sales portion?",
									() => clearSelection()
								)
							}
							onResetSelection={() => {
								guardAction(
									isLaborEdited,
									"You have changed the labor in the settlement section, do you really want to re-select the transaction items, it will reset the labor section to labor sales portion?",
									resetSelection
								);
							}}
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
							onLaborActualChange={updateLaborActual}
							expenses={expenses}
							selectedUtilityIds={selectedUtilityIds}
							selectedAdditionalIds={selectedAdditionalIds}
							activeDrawer={expensesDrawerSection}
							setActiveDrawer={openExpenseDrawer}
							onToggleExpense={toggleExpense}
						/>
					)}

					{currentStep === "SUMMARY" && (
						<SummaryStep
							reconciliation={reconciliation}
							profitDistributed={profitDistributed}
							profitRetained={profitRetained}
							onProfitDistributedChange={setProfitDistributed}
							readOnly={!isDraft}
							breakdown={salesBreakdown}
						/>
					)}
				</main>
			</div>

			<div className={styles.drawerSection}>
				{allocationSelectorDrawerState && (
					<AllocationSelectorDrawer
						settlements={settlements}
						selectedSettlement={isNewSettlement ? null : activeSettlement}
						onSelect={(id) => {
							guardAction(
								preventRefilter,
								"You have some changed in the sales selection, are you really want to go to other settlement without saving?",
								() => loadSettlement(id)
							);
						}}
						onCreateNew={() => {
							guardAction(
								preventRefilter,
								"You have some changed in the sales selection, are you really want to go to other settlement without saving?",
								() => startNewSettlement()
							);
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
		</div>
	);
}
