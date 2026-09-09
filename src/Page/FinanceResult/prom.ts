import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
	getBusinessExpenses,
	createBusinessExpense,
	CATEGORY_OPTIONS_BY_SECTION,
	type BusinessExpenseCategory
} from "../Services/supabase/businessExpensesServices";
import {
	getSettlementExpenses,
	updateBusinessSettlementExpenses,
	type SettlementExpenseInput
} from "../Services/supabase/settlementServices";
import type { TBusinessExpense, TExpenseSection } from "../Types/expense";

// ...(EMPTY_EXPENSES, TBusinessExpenseRow, SECTION_BY_CATEGORY, mapExpenseRow unchanged)

export const useBusinessExpenses = (
	enabled: boolean,
	businessSettlementId: number | null,
	setIsEditMade: (value: boolean) => void
) => {
	const queryClient = useQueryClient();

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

	const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>(EMPTY_IDS);

	// Seed selection from the DB whenever the loaded settlement's allocations change.
	useEffect(() => {
		if (!settlementExpenseRows) return;
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

	const addExpenseMutation = useMutation({
		mutationFn: (input: {
			section: TExpenseSection;
			description: string;
			category: BusinessExpenseCategory;
			originalAmount: number;
		}) =>
			createBusinessExpense({
				expense_category: input.category,
				expense_type: "DIRECT_EXPENSE",
				expense_description: input.description,
				expense_amount: input.originalAmount,
				expense_time: new Date().toISOString()
			}),
		onSuccess: (created) => {
			queryClient.setQueryData<TBusinessExpenseRow[]>(["businessExpenses"], (current) => [
				created as unknown as TBusinessExpenseRow,
				...(current ?? [])
			]);
			setIsEditMade(true);
			setSelectedExpenseIds((prev) => [...prev, String(created.business_expense_id)]);
		},
		onError: (error) => {
			console.error("Failed to add expense", error);
			toast.error(`Failed to add expense: ${(error as Error).message}`);
		}
	});

	function addExpense(section: TExpenseSection, data: Omit<TBusinessExpense, "id" | "section" | "settledAmount">) {
		return addExpenseMutation.mutateAsync({ section, ...data });
	}

	// Full amount only for now — no partial-allocation input in the UI yet.
	const saveExpensesMutation = useMutation({
		mutationFn: () => {
			if (!businessSettlementId) throw new Error("Settlement must exist before expenses can be saved");
			const payload: SettlementExpenseInput[] = selectedExpenseIds.map((id) => {
				const expense = expenses.find((e) => e.id === id);
				return { business_expense_id: Number(id), allocated_amount: expense?.originalAmount ?? 0 };
			});
			return updateBusinessSettlementExpenses(businessSettlementId, payload);
		},
		onError: (error) => {
			console.error("Failed to save settlement expenses", error);
			toast.error(`Failed to save settlement expenses: ${(error as Error).message}`);
		}
	});

	return {
		expenses,
		selectedUtilityIds,
		selectedAdditionalIds,
		toggleExpense,
		addExpense,
		saveExpenses: saveExpensesMutation.mutateAsync,
		isLoadingExpenses,
		isAddingExpense: addExpenseMutation.isPending,
		isSavingExpenses: saveExpensesMutation.isPending
	};
};
