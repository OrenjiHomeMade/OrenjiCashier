import styles from "./FinanceResult.module.css";
import { useFinanceAllocation } from "../../Hooks/useFinanceAllocation";
import { AllocationSelector, AllocationSelectorDrawer } from "./components/AllocationSelector";
import {
	// AdjustmentsStep,
	AdjustmentsStepDrawer
} from "./components/AdjustmentsStep";
import { useState } from "react";
import StepNav from "./components/StepNav";
import SalesStep from "./components/SalesStep";
// import SummaryStep from "./components/SummaryStep";
import SalesBreakdown from "./components/SalesBreakdown";
import Button from "../../Component/Button/Button";
import LoadingModal from "../../Component/LoadingModal/LoadingModal";

export default function FinancePage() {
	// CUSTOM HOOKS IDEA
	// -- allocation selections, creation and update
	// -- transaction item and selection
	// -- expense adjustment

	const {
		allocations,
		selectedAllocation,
		isNewAllocation,
		draftAllocation,
		currentStep,
		setCurrentStep,
		// editMode,
		filters,
		setFilters,
		categories,
		productNames,
		filteredTransactions,
		selectedTransactions,
		salesSummary,
		adjustmentsTotal,
		finalResult,
		// distributionTotalAmount,
		// distributionTotalPercent,
		// isDistributionReconciled,
		isReadOnly,
		isSalesAdjustmentsEditable,
		// isDistributionEditable,
		isSaving,
		savingMessage,
		loadAllocation,
		startNewAllocation,
		toggleTransaction,
		selectAllFiltered,
		clearSelection,
		addAdjustment,
		// removeAdjustment,
		// setDistributionMode,
		// updateDistributionEntry,
		// addDistributionEntry,
		// removeDistributionEntry,
		// confirmAllocation,
		saveDraft,
		// enableEdit,
		// distributeAllocation,
		setDraftName
	} = useFinanceAllocation();

	const [allocationSelectorDrawerState, setAllocationSelectorDrawerState] = useState(false);
	const [addAdjustmentDrawerState, setAddAdjustmentDrawerState] = useState(false);

	// Only one right-side drawer makes sense open at a time — opening one closes the other.
	function openAllocationDrawer(open: boolean) {
		if (open) {
			setAddAdjustmentDrawerState(false);
		}
		setAllocationSelectorDrawerState(open);
	}

	function openAdjustmentDrawer(open: boolean) {
		if (open) {
			setAllocationSelectorDrawerState(false);
		}
		setAddAdjustmentDrawerState(open);
	}

	// const statusActions = {
	// 	canConfirm: (isNewAllocation || draftAllocation.status === "DRAFT") && !isReadOnly,
	// 	canEnableEdit: !isNewAllocation && draftAllocation.status === "CONFIRMED" && !editMode,
	// 	canDistribute: draftAllocation.status === "CONFIRMED"
	// };

	const showNameField = (isNewAllocation || draftAllocation.status === "DRAFT") && !isReadOnly;

	// Built once, fed by one data source, then handed to whichever step is
	// currently on screen — SalesStep/AdjustmentsStep/SummaryStep each just
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

					{/* {currentStep === "ADJUSTMENTS" && (
						<AdjustmentsStep
							adjustments={draftAllocation.adjustments}
							onRemoveAdjustment={removeAdjustment}
							readOnly={!isSalesAdjustmentsEditable}
							drawerState={addAdjustmentDrawerState}
							setDrawerState={openAdjustmentDrawer}
							breakdown={salesBreakdown}
						/>
					)} */}

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
						allocations={allocations}
						selectedAllocation={isNewAllocation ? null : selectedAllocation}
						onSelect={loadAllocation}
						onCreateNew={startNewAllocation}
						getTransactionCount={(allocation) => allocation.transactionIds.length}
						setDrawerState={openAllocationDrawer}
					/>
				)}

				{addAdjustmentDrawerState && (
					<AdjustmentsStepDrawer setDrawerState={openAdjustmentDrawer} onAddAdjustment={addAdjustment} />
				)}
			</div>

			<LoadingModal isOpen={isSaving}>{savingMessage}</LoadingModal>
		</div>
	);
}
