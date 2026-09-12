// Hooks/useBusinessExpenses.ts
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	getBusinessExpenses,
	type BusinessExpenseCategory,
	CATEGORY_OPTIONS_BY_SECTION
} from "../Services/supabase/businessExpensesServices";
import type { SettlementExpenseInput, TBusinessExpense, TBusinessExpenseRow, TExpenseSection } from "../Types/expense";
import { toast } from "react-toastify";
import { getSettlementExpenses, updateBusinessSettlementExpenses } from "../Services/supabase/settlementServices";
import type { TBusinessSettlement, TQSalesSummary } from "../Types/settlement";
import { resolveSalesEstimate } from "../Utilities/resolveSalesEstimate";
import { useSettlementScopedValue } from "./useSettlementScopedValue";
import { useBusinessExpenses } from "./useBusinessExpenses";

const EMPTY_EXPENSES: TBusinessExpense[] = [];
const EMPTY_IDS: string[] = [];

const SECTION_BY_CATEGORY: Partial<Record<BusinessExpenseCategory, TExpenseSection>> = Object.entries(
	CATEGORY_OPTIONS_BY_SECTION
).reduce(
	(acc, [section, categories]) => {
		categories.forEach((category) => {
			acc[category] = section as TExpenseSection;
		});
		return acc;
	},
	{} as Partial<Record<BusinessExpenseCategory, TExpenseSection>>
);

function mapExpenseRow(row: TBusinessExpenseRow): TBusinessExpense | null {
	const section = SECTION_BY_CATEGORY[row.expense_category];
	if (!section) return null;

	return {
		id: String(row.business_expense_id),
		section,
		description: row.expense_description ?? "",
		category: row.expense_category,
		originalAmount: row.expense_amount,
		settledAmount: 0
	};
}

export const useSettlementExpenses = (
	enabled: boolean,
	activeSettlement: TBusinessSettlement,
	salesSummary: TQSalesSummary,
	setIsEditMade: (value: boolean) => void,
	isNewSettlement: boolean
) => {
	const businessSettlementId = activeSettlement.settlementId;
	const queryClient = useQueryClient();

	const salesEstimate = resolveSalesEstimate(activeSettlement, salesSummary ?? null);

	const { data: expenseRows, isLoading: isLoadingExpenses } = useQuery({
		queryKey: ["businessExpenses"],
		queryFn: () => getBusinessExpenses(),
		enabled
	});

	const expenses = useMemo(() => {
		if (!expenseRows) return EMPTY_EXPENSES;
		return expenseRows
			.map((row) => mapExpenseRow(row as unknown as TBusinessExpenseRow))
			.filter((expense): expense is TBusinessExpense => expense !== null);
	}, [expenseRows]);

	// Existing allocations for THIS settlement, read from business_settlement_expense.
	const { data: settlementExpenseRows } = useQuery({
		queryKey: ["settlementExpenses", businessSettlementId],
		queryFn: () => getSettlementExpenses(businessSettlementId!),
		enabled: enabled && businessSettlementId !== null
	});

	const {
		value: laborActual,
		setValue: setLaborActualRaw,
		isEdited: isLaborEdited,
		resetToPersisted: resetLaborActual,
		clearEdit: clearLaborEdit
	} = useSettlementScopedValue<number>({
		resetKey: [businessSettlementId, isNewSettlement],
		computeValue: () => {
			const initialEstimate = resolveSalesEstimate(activeSettlement, salesSummary ?? null);
			return initialEstimate.labor || activeSettlement.settledLaborCost || activeSettlement.salesLaborCost;
		},
		persistedValue: activeSettlement.settledLaborCost || activeSettlement.salesLaborCost
	});

	const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>(EMPTY_IDS);

	// Seed selection from the DB whenever the loaded settlement's allocations change.
	useEffect(() => {
		if (!settlementExpenseRows) return;
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setSelectedExpenseIds(settlementExpenseRows.map((row) => String(row.business_expense_id)));
	}, [businessSettlementId, settlementExpenseRows]);

	const selectedUtilityIds = useMemo(
		() => selectedExpenseIds.filter((id) => expenses.some((e) => e.id === id && e.section === "UTILITIES")),
		[selectedExpenseIds, expenses]
	);
	const selectedAdditionalIds = useMemo(
		() => selectedExpenseIds.filter((id) => expenses.some((e) => e.id === id && e.section === "ADDITIONAL")),
		[selectedExpenseIds, expenses]
	);

	function toggleExpense(_section: TExpenseSection, id: string) {
		setIsEditMade(true);
		setSelectedExpenseIds((prev) =>
			prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]
		);
	}

	function updateLaborActual(value: number) {
		setIsEditMade(true);
		setLaborActualRaw(value);
	}

	function invalidateBusinessExpense() {
		queryClient.invalidateQueries({
			queryKey: ["businessExpenses"]
		});
	}

	const { addExpenseMutation, editExpenseMutation, deleteExpenseMutation } = useBusinessExpenses({
		onAddExpenseSuccess: (created) => {
			queryClient.setQueryData<TBusinessExpenseRow[]>(["businessExpenses"], (current) => [
				created as unknown as TBusinessExpenseRow,
				...(current ?? [])
			]);
			setIsEditMade(true);
			setSelectedExpenseIds((prev) => [...prev, String(created.business_expense_id)]);
		},
		onDeletedExpenseSuccess: invalidateBusinessExpense,
		onEditExpenseSuccess: invalidateBusinessExpense
	});

	function addExpense(section: TExpenseSection, data: Omit<TBusinessExpense, "id" | "section" | "settledAmount">) {
		return addExpenseMutation.mutateAsync({ section, ...data });
	}

	function editExpense(section: TExpenseSection, data: Omit<TBusinessExpense, "section" | "settledAmount">) {
		return editExpenseMutation.mutateAsync({
			section,
			expenseId: Number(data.id),
			description: data.description,
			category: data.category,
			updateAmount: data.originalAmount
		});
	}

	function deleteExpense(id: number) {
		return deleteExpenseMutation.mutateAsync({
			id: id
		});
	}

	const saveExpensesMutation = useMutation({
		mutationFn: (settlementIdOverride?: number) => {
			const id = settlementIdOverride ?? businessSettlementId;
			if (!id) throw new Error("Settlement must exist before expenses can be saved");
			const payload: SettlementExpenseInput[] = selectedExpenseIds.map((idStr) => {
				const expense = expenses.find((e) => e.id === idStr);
				return { business_expense_id: Number(idStr), allocated_amount: expense?.originalAmount ?? 0 };
			});
			return updateBusinessSettlementExpenses(id, payload);
		},
		onError: (error) => toast.error(`Failed to save settlement expenses: ${(error as Error).message}`)
	});

	const saveExpenses = (idOverride?: number) => saveExpensesMutation.mutateAsync(idOverride);

	const resetExpenseSelection = () => {
		setSelectedExpenseIds(
			settlementExpenseRows ? settlementExpenseRows.map((row) => String(row.business_expense_id)) : []
		);
		resetLaborActual();
	};

	const _getLoadingState = () => {
		if (saveExpensesMutation.isPending) {
			return { showLoading: true, loadingState: "Saving expenses..." };
		} else if (addExpenseMutation.isPending) {
			return { showLoading: true, loadingState: "Add expenses..." };
		} else if (isLoadingExpenses) {
			return { showLoading: true, loadingState: "Fetching expenses..." };
		} else {
			return { showLoading: false, loadingState: "" };
		}
	};

	const { showLoading, loadingState } = _getLoadingState();

	return {
		expenses,
		selectedUtilityIds,
		selectedAdditionalIds,
		salesEstimate,
		toggleExpense,
		addExpense,
		editExpense,
		deleteExpense,
		saveExpenses,
		resetExpenseSelection,
		laborActual,
		updateLaborActual,
		clearLaborEdit,
		isLaborEdited,
		showLoading,
		loadingState
	};
};
