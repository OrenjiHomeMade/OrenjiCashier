import { useMutation } from "@tanstack/react-query";
import type { BusinessExpenseInsert, BusinessExpenseUpdate, TExpenseSection } from "../Types/expense";

import {
	createBusinessExpense,
	deleteBusinessExpense,
	updateBusinessExpense,
	type BusinessExpenseCategory
} from "../Services/supabase/businessExpensesServices";
import { getLocalTimestamp } from "../Utilities/NumberFormater";
import { toast } from "react-toastify";

export const useBusinessExpenses = (param: {
	onAddExpenseSuccess?: (created: BusinessExpenseInsert) => void;
	onEditExpenseSuccess?: (updated: BusinessExpenseUpdate) => void;
	onDeletedExpenseSuccess?: () => void;
}) => {
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
			param.onAddExpenseSuccess?.(created);
		},
		onError: (error) => {
			console.error("Failed to add expense", error);
			toast.error(`Failed to add expense: ${(error as Error).message}`);
		}
	});

	const editExpenseMutation = useMutation({
		mutationFn: (input: {
			expenseId: number;
			section: TExpenseSection;
			description: string;
			category: BusinessExpenseCategory;
			updateAmount: number;
		}) =>
			updateBusinessExpense(input.expenseId, {
				business_expense_id: input.expenseId,
				expense_amount: input.updateAmount,
				expense_category: input.category,
				expense_description: input.description
			}),
		onSuccess: (updated) => param.onEditExpenseSuccess?.(updated)
	});

	const deleteExpenseMutation = useMutation({
		mutationFn: ({ id }: { id: number }) => deleteBusinessExpense(id),
		onSuccess: () => param.onDeletedExpenseSuccess?.()
	});

	return {
		addExpenseMutation,
		editExpenseMutation,
		deleteExpenseMutation
	};
};
