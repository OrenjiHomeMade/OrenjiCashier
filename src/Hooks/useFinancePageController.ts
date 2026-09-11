import { useState } from "react";
import type { TExpenseSection } from "../Types/expense";
import { useFinanceSettlementCycle } from "./useFinanceSettlementCycle";
import { useSettlementSales } from "./useSettlementSales";
import { useSettlementExpenses } from "./useSettlementExpenses";
import { useProfitAllocation } from "./useProfitAllocation";
import { resolveSettlementReconciliation } from "../Utilities/resolveSettlementReconciliation";
import { updateBusinessSettlementResult } from "../Services/supabase/settlementServices";

type FinancePageDrawers =
	| { type: "SETTLEMENT_SELECTOR" }
	| { type: "EXPENSES_DRAWER"; section: TExpenseSection }
	| null;

type LoadingSlice = { isLoading: boolean; loadingState: string };

function consolidateLoadingState(slices: LoadingSlice[]): LoadingSlice {
	const active = slices.find((slice) => slice.isLoading);
	return active ?? { isLoading: false, loadingState: "" };
}

export const useFinancePageController = () => {
	const [isEditMade, setIsEditMade] = useState<boolean>(false);

	// --- CYCLE ---
	const cycleControl = useFinanceSettlementCycle(setIsEditMade);
	const { settlements, selectedSettlement, activeSettlement } = cycleControl.data;
	const { loadSettlement, startNewSettlement, updateDraftSettlement, onSave, onCancel, onDelete, onEditStatusState } =
		cycleControl.functions;
	const { isNewSettlement, currentStep, setCurrentStep } = cycleControl.states;
	const { showLoading: cycleLoading, loadingState: cycleLoadingMessage } = cycleControl.loadingState;

	const isReadOnly = activeSettlement.settlementStatus === "SETTLED";
	const isConfirmed = activeSettlement.settlementStatus === "CONFIRMED";
	const isDraft = activeSettlement.settlementStatus === "DRAFT";
	const showNameField = (isNewSettlement || isDraft) && !isReadOnly;
	const readyToSave = isEditMade || isNewSettlement;
	const readyToConvert = isDraft && !isNewSettlement;

	// --- SALES ---
	const salesControl = useSettlementSales(isReadOnly, currentStep === "SALES", activeSettlement, setIsEditMade);
	const { showLoading: salesLoading, loadingState: salesLoadingMessage } = salesControl;

	// --- EXPENSES ---
	const expensesControl = useSettlementExpenses(
		currentStep === "SETTLEMENT",
		activeSettlement,
		salesControl.settlementSummary ?? null,
		setIsEditMade,
		isNewSettlement
	);
	const { showLoading: expenseLoading, loadingState: expenseLoadingMessage } = expensesControl;

	// --- DRAWERS ---
	const [drawerState, setDrawerState] = useState<FinancePageDrawers>(null);
	const allocationSelectorDrawerState = drawerState?.type === "SETTLEMENT_SELECTOR";
	const expensesDrawerSection = drawerState?.type === "EXPENSES_DRAWER" ? drawerState.section : null;

	function openAllocationDrawer(open: boolean) {
		setDrawerState(open ? { type: "SETTLEMENT_SELECTOR" } : null);
	}
	function openExpenseDrawer(section: TExpenseSection | null) {
		setDrawerState(section ? { type: "EXPENSES_DRAWER", section } : null);
	}
	function closeDrawer() {
		setDrawerState(null);
	}

	// --- RECONCILIATION (derived) ---
	const reconciliation = resolveSettlementReconciliation({
		revenue: expensesControl.salesEstimate.revenue,
		laborActual: expensesControl.laborActual,
		packagingEstimate: expensesControl.salesEstimate.packing,
		ingredientEstimate: expensesControl.salesEstimate.ingredient,
		expenses: expensesControl.expenses,
		selectedUtilityIds: expensesControl.selectedUtilityIds,
		selectedAdditionalIds: expensesControl.selectedAdditionalIds
	});

	// --- PROFIT ALLOCATION (derived) ---
	const { profitDistributed, profitRetained, setProfitDistributed, resetProfitAllocation } = useProfitAllocation(
		activeSettlement.settlementId,
		isNewSettlement,
		reconciliation.balance,
		activeSettlement.profitDistributed
	);

	// --- LOADING (bug fixed: was always returning false before) ---
	const { isLoading: showLoading, loadingState } = consolidateLoadingState([
		{ isLoading: cycleLoading, loadingState: cycleLoadingMessage },
		{ isLoading: salesLoading, loadingState: salesLoadingMessage },
		{ isLoading: expenseLoading, loadingState: expenseLoadingMessage }
	]);

	// --- ACTIONS ---
	function handleConvertion() {
		if (isDraft) onEditStatusState("CONFIRMED");
		if (isConfirmed) onEditStatusState("SETTLED");
	}

	function handleEdit() {
		onEditStatusState("DRAFT");
	}

	async function handleSaving() {
		try {
			const salesPortion = salesControl.savingSales();
			const saveId = await onSave(salesPortion);
			await expensesControl.saveExpenses(saveId);
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
			// TODO: surface this to the user — right now a failed save
			// fails silently and the page just sits there.
		}
	}

	function handleCancle() {
		salesControl.resetSelection();
		expensesControl.resetExpenseSelection();
		resetProfitAllocation();
		onCancel();
	}

	function handleDelete() {
		onDelete();
	}

	return {
		cycle: {
			settlements,
			selectedSettlement,
			activeSettlement,
			isNewSettlement,
			currentStep,
			setCurrentStep,
			loadSettlement,
			startNewSettlement,
			updateDraftSettlement
		},
		flags: { isReadOnly, isConfirmed, isDraft, showNameField, readyToSave, readyToConvert },
		sales: salesControl,
		expenses: expensesControl,
		reconciliation,
		allocation: { profitDistributed, profitRetained, setProfitDistributed, resetProfitAllocation },
		drawers: {
			allocationSelectorDrawerState,
			expensesDrawerSection,
			openAllocationDrawer,
			openExpenseDrawer,
			closeDrawer
		},
		loading: { showLoading, loadingState },
		actions: { handleConvertion, handleEdit, handleSaving, handleCancle, handleDelete }
	};
};
