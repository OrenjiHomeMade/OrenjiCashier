// Hooks/useBusinessExpenses.ts
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	getBusinessExpenses,
	createBusinessExpense,
	type BusinessExpenseCategory,
	CATEGORY_OPTIONS_BY_SECTION
} from "../Services/supabase/businessExpensesServices";
import type { SettlementExpenseInput, TBusinessExpense, TExpenseSection } from "../Types/expense";
import { getLocalTimestamp } from "../Utilities/NumberFormater";
import { toast } from "react-toastify";
import { getSettlementExpenses, updateBusinessSettlementExpenses } from "../Services/supabase/settlementServices";

const EMPTY_EXPENSES: TBusinessExpense[] = [];
const EMPTY_IDS: string[] = [];

// NOTE: adjust field names to match business_expense's real columns
// (Database["public"]["Tables"]["business_expense"]["Row"]) if different.
type TBusinessExpenseRow = {
	business_expense_id: number;
	expense_category: BusinessExpenseCategory;
	expense_description: string | null;
	expense_amount: number;
};

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
		// TODO: wire once a settlement-scoped "already recognized elsewhere"
		// RPC exists — every expense currently shows as fully unsettled.
		settledAmount: 0
	};
}

export const useSettlementExpenses = (
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
				expense_time: getLocalTimestamp(new Date())
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
		toggleExpense,
		addExpense,
		saveExpenses,
		resetExpenseSelection,
		showLoading,
		loadingState
	};
};
