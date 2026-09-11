import styles from "./FinanceResult.module.css";

import { AllocationSelector, AllocationSelectorDrawer } from "./components/AllocationSelector";
import StepNav from "./components/StepNav";
import SalesStep from "./components/01_SalesStep";
import { ExpensesStep, ExpenseDrawer } from "./components/02_ExpensesStep";
import SummaryStep from "./components/03_SummaryStep";
import SalesBreakdown from "./components/SalesBreakdown";
import Button from "../../Component/Button/Button";
import LoadingModal from "../../Component/LoadingModal/LoadingModal";
import { useFinancePageController } from "../../Hooks/useFinancePageController";
import { guardAction } from "../../Utilities/guardAction";

const CONFIRM_RESET_MESSAGE =
	"You have changed the labor in the settlement section, do you really want to re-select the transaction items, it will reset the labor section to labor sales portion?";
const CONFIRM_SWITCH_MESSAGE =
	"You have some changed in the sales selection, are you really want to go to other settlement without saving?";

export default function FinancePage() {
	const { cycle, flags, sales, expenses, reconciliation, allocation, drawers, loading, actions } =
		useFinancePageController();

	const { activeSettlement, currentStep, setCurrentStep, settlements, selectedSettlement, isNewSettlement } = cycle;
	const { isDraft, isConfirmed, showNameField, readyToSave, readyToConvert } = flags;
	const { allocationSelectorDrawerState, expensesDrawerSection } = drawers;

	const safeCurrentPage = Math.min(sales.salesFilter.page, sales.totalPages);
	const firstItem = sales.totalCount === 0 ? 0 : (safeCurrentPage - 1) * sales.itemPerPage + 1;
	const lastItem = Math.min(safeCurrentPage * sales.itemPerPage, sales.totalCount);

	const salesBreakdown = (
		<SalesBreakdown
			step={currentStep}
			settlement={activeSettlement}
			reconciliation={reconciliation}
			productBreakdown={sales.productBreakdown || []}
			settlementSummary={sales.settlementSummary ?? null}
			breakdownGroupBy={sales.breakdownGroupBy}
			onBreakdownGroupByChange={sales.setBreakdownGroupBy}
			isExpenseEdit={expenses.isLaborEdited}
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
						setDrawerState={drawers.openAllocationDrawer}
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
									onChange={(event) =>
										cycle.updateDraftSettlement({ settlementName: event.target.value })
									}
									placeholder="Name this allocation, e.g. August 2026 — Regular Operations"
									className={styles.nameInput}
								/>
							)}
							{readyToConvert && (
								<Button
									disabled={loading.showLoading}
									variant="primary"
									size="md"
									onClick={actions.handleConvertion}
								>
									{isDraft ? "Confirm!" : "Settle!"}
								</Button>
							)}
							{readyToSave && (
								<>
									<Button
										disabled={loading.showLoading || activeSettlement.settlementName === ""}
										variant="primary"
										size="md"
										onClick={actions.handleSaving}
									>
										Save as Draft
									</Button>
									<Button
										disabled={loading.showLoading}
										variant="danger"
										size="md"
										onClick={actions.handleCancle}
									>
										Cancel
									</Button>
								</>
							)}
							{isDraft && !isNewSettlement && (
								<Button variant="danger" size="md" onClick={actions.handleDelete}>
									Delete
								</Button>
							)}
							{isConfirmed && (
								<Button
									variant="primary"
									size="md"
									disabled={loading.showLoading}
									onClick={actions.handleEdit}
								>
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
							filters={sales.salesFilter}
							onFiltersChange={sales.updateSalesFilter}
							isFilterAllowed={!sales.preventRefilter}
							categories={sales.productsCategories}
							transactionsItems={sales.transactionItems || []}
							products={sales.productNames}
							checkSelection={sales.checkIsEffectivelySelected}
							onToggleTransaction={(row) => {
								guardAction(expenses.isLaborEdited, CONFIRM_RESET_MESSAGE, () => {
									expenses.clearLaborEdit();
									sales.toggleTransaction(row);
								});
							}}
							totalEffectiveSelected={sales.totalEffectiveSelected()}
							onSelectAll={sales.selectAllFiltered}
							onClearSelection={() =>
								guardAction(expenses.isLaborEdited, CONFIRM_RESET_MESSAGE, () => sales.clearSelection())
							}
							onResetSelection={() =>
								guardAction(expenses.isLaborEdited, CONFIRM_RESET_MESSAGE, sales.resetSelection)
							}
							readOnly={!isDraft}
							breakdown={salesBreakdown}
							pageData={{
								firstItem,
								lastItem,
								totalCount: sales.totalCount,
								totalSelected: sales.totalSelected,
								totalPages: sales.totalPages,
								currentPage: safeCurrentPage
							}}
						/>
					)}

					{currentStep === "SETTLEMENT" && (
						<ExpensesStep
							salesEstimate={expenses.salesEstimate}
							readOnly={!isDraft}
							breakdown={salesBreakdown}
							laborActual={expenses.laborActual}
							onLaborActualChange={expenses.updateLaborActual}
							expenses={expenses.expenses}
							selectedUtilityIds={expenses.selectedUtilityIds}
							selectedAdditionalIds={expenses.selectedAdditionalIds}
							activeDrawer={expensesDrawerSection}
							setActiveDrawer={drawers.openExpenseDrawer}
							onToggleExpense={expenses.toggleExpense}
						/>
					)}

					{currentStep === "SUMMARY" && (
						<SummaryStep
							reconciliation={reconciliation}
							profitDistributed={allocation.profitDistributed}
							profitRetained={allocation.profitRetained}
							onProfitDistributedChange={allocation.setProfitDistributed}
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
						onSelect={(id) =>
							guardAction(sales.preventRefilter, CONFIRM_SWITCH_MESSAGE, () => cycle.loadSettlement(id))
						}
						onCreateNew={() =>
							guardAction(sales.preventRefilter, CONFIRM_SWITCH_MESSAGE, () => cycle.startNewSettlement())
						}
						setDrawerState={drawers.openAllocationDrawer}
					/>
				)}

				{expensesDrawerSection && (
					<ExpenseDrawer
						section={expensesDrawerSection}
						expenses={expenses.expenses.filter((expense) => expense.section === expensesDrawerSection)}
						selectedIds={
							expensesDrawerSection === "UTILITIES"
								? expenses.selectedUtilityIds
								: expenses.selectedAdditionalIds
						}
						onToggleExpense={(id) => expenses.toggleExpense(expensesDrawerSection, id)}
						onAddExpense={(data) => expenses.addExpense(expensesDrawerSection, data)}
						onClose={drawers.closeDrawer}
					/>
				)}
			</div>

			<LoadingModal isOpen={loading.showLoading}>{loading.loadingState}</LoadingModal>
		</div>
	);
}
