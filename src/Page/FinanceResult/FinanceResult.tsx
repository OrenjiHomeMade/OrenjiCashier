import styles from "./FinanceResult.module.css";
import { useFinanceAllocation } from "../../Hooks/useFinanceAllocation";
import AllocationSelector from "./components/AllocationSelector";
import StepNav from "./components/StepNav";
import SalesStep from "./components/SalesStep";
import AdjustmentsStep from "./components/AdjustmentsStep";
import SummaryStep from "./components/SummaryStep";
import Button from "../../Component/Button/Button";
import LoadingModal from "../../Component/LoadingModal/LoadingModal";

export default function FinancePage() {
	const finance = useFinanceAllocation();

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
		addAdjustment,
		removeAdjustment,
		setDistributionMode,
		updateDistributionEntry,
		addDistributionEntry,
		removeDistributionEntry,
		confirmAllocation,
		saveDraft,
		enableEdit,
		distributeAllocation,
		setDraftName
	} = finance;

	const statusActions = {
		canConfirm: (isNewAllocation || draftAllocation.status === "DRAFT") && !isReadOnly,
		canEnableEdit: !isNewAllocation && draftAllocation.status === "CONFIRMED" && !editMode,
		canDistribute: draftAllocation.status === "CONFIRMED"
	};

	const showNameField = (isNewAllocation || draftAllocation.status === "DRAFT") && !isReadOnly;

	return (
		<div className={`page ${styles.page}`}>
			<header className={styles.header}>
				<div>
					<p className={styles.eyebrow}>Orenji Cashier</p>
					<h1 className={styles.title}>Finance</h1>
				</div>

				<AllocationSelector
					allocations={allocations}
					selectedAllocation={isNewAllocation ? null : selectedAllocation}
					isNewAllocation={isNewAllocation}
					onSelect={loadAllocation}
					onCreateNew={startNewAllocation}
					getTransactionCount={(allocation) => allocation.transactionIds.length}
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
						<Button variant="secondary" size="sm" onClick={saveDraft}>
							Save draft
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
						summary={salesSummary}
						readOnly={!isSalesAdjustmentsEditable}
					/>
				)}

				{currentStep === "ADJUSTMENTS" && (
					<AdjustmentsStep
						adjustments={draftAllocation.adjustments}
						onAddAdjustment={addAdjustment}
						onRemoveAdjustment={removeAdjustment}
						salesMargin={salesSummary.margin}
						readOnly={!isSalesAdjustmentsEditable}
					/>
				)}

				{currentStep === "SUMMARY" && (
					<SummaryStep
						allocation={draftAllocation}
						salesSummary={salesSummary}
						adjustmentsTotal={adjustmentsTotal}
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
					/>
				)}
			</main>

			<LoadingModal isOpen={isSaving}>{savingMessage}</LoadingModal>
		</div>
	);
}
