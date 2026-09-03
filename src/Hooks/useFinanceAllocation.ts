import { useMemo, useState } from "react";
import { mockAllocations, mockProducts } from "../Data/finance.mock";
import { calcDistributionTotal } from "../Utilities/financeCalculations";
import { DEFAULT_DISTRIBUTION_LABELS } from "../Types/finance";
import type { TDistributionMode, TFinanceAllocation, TFinanceStep } from "../Types/finance";

function createBlankAllocation(): TFinanceAllocation {
	const now = new Date().toISOString();

	return {
		id: `new-${Date.now()}`,
		name: "",
		status: "DRAFT",
		createdAt: now,
		updatedAt: now,
		transactionIds: [],
		adjustments: [],
		distributionMode: "PERCENTAGE",
		distribution: DEFAULT_DISTRIBUTION_LABELS.map((label, index) => ({
			id: `dist-${index}`,
			label,
			value: 0
		}))
	};
}

let distributionIdCounter = 0;

export function useAllocation() {
	const [allocations, setAllocations] = useState<TFinanceAllocation[]>(mockAllocations);

	const [selectedAllocationId, setSelectedAllocationId] = useState<string | null>(mockAllocations[0]?.id ?? null);

	const [isNewAllocation, setIsNewAllocation] = useState(false);

	const [draftAllocation, setDraftAllocation] = useState<TFinanceAllocation>(
		mockAllocations[0] ?? createBlankAllocation()
	);

	const [currentStep, setCurrentStep] = useState<TFinanceStep>("SUMMARY");

	const [editMode, setEditMode] = useState(false);

	const [isSaving, setIsSaving] = useState(false);
	const [savingMessage, setSavingMessage] = useState("Saving…");

	const selectedAllocation = useMemo(
		() => allocations.find((allocation) => allocation.id === selectedAllocationId) ?? null,
		[allocations, selectedAllocationId]
	);

	const finalResult = 0;

	const distributionTotalAmount = useMemo(
		() => calcDistributionTotal(draftAllocation.distribution, draftAllocation.distributionMode, finalResult),
		[draftAllocation.distribution, draftAllocation.distributionMode, finalResult]
	);

	const distributionTotalPercent = useMemo(
		() => draftAllocation.distribution.reduce((sum, entry) => sum + entry.value, 0),
		[draftAllocation.distribution]
	);

	const isDistributionReconciled = useMemo(() => {
		if (draftAllocation.distribution.length === 0) {
			return false;
		}

		return Math.abs(distributionTotalAmount - finalResult) < 1;
	}, [distributionTotalAmount, finalResult, draftAllocation.distribution.length]);

	const isReadOnly = draftAllocation.status === "DISTRIBUTED";

	const isDistributionEditable = !isReadOnly;

	function loadAllocation(id: string) {
		const allocation = allocations.find((item) => item.id === id);

		if (!allocation) {
			return;
		}

		setSelectedAllocationId(id);
		setIsNewAllocation(false);
		setDraftAllocation(allocation);
		setEditMode(false);
		setCurrentStep("SUMMARY");
	}

	function startNewAllocation() {
		const blank = createBlankAllocation();

		setSelectedAllocationId(null);
		setIsNewAllocation(true);
		setDraftAllocation(blank);
		setEditMode(false);
		setCurrentStep("SALES");
	}

	function setDistributionMode(mode: TDistributionMode) {
		setDraftAllocation((prev) => ({
			...prev,
			distributionMode: mode
		}));
	}

	function updateDistributionEntry(id: string, value: number) {
		setDraftAllocation((prev) => ({
			...prev,
			distribution: prev.distribution.map((entry) => (entry.id === id ? { ...entry, value } : entry))
		}));
	}

	function addDistributionEntry(label: string) {
		distributionIdCounter += 1;

		setDraftAllocation((prev) => ({
			...prev,
			distribution: [
				...prev.distribution,
				{
					id: `dist-${Date.now()}-${distributionIdCounter}`,
					label,
					value: 0
				}
			]
		}));
	}

	function removeDistributionEntry(id: string) {
		setDraftAllocation((prev) => ({
			...prev,
			distribution: prev.distribution.filter((entry) => entry.id !== id)
		}));
	}

	function persist(next: TFinanceAllocation, message: string) {
		setIsSaving(true);
		setSavingMessage(message);

		window.setTimeout(() => {
			setAllocations((prev) => {
				const exists = prev.some((allocation) => allocation.id === next.id);

				return exists
					? prev.map((allocation) => (allocation.id === next.id ? next : allocation))
					: [next, ...prev];
			});

			setDraftAllocation(next);
			setSelectedAllocationId(next.id);
			setIsNewAllocation(false);
			setIsSaving(false);
		}, 650);
	}

	function nameOrFallback() {
		return draftAllocation.name.trim() || `Untitled allocation — ${new Date().toLocaleDateString("id-ID")}`;
	}

	function confirmAllocation() {
		persist(
			{
				...draftAllocation,
				name: nameOrFallback(),
				status: "CONFIRMED",
				updatedAt: new Date().toISOString()
			},
			"Confirming allocation…"
		);

		setEditMode(false);
		setCurrentStep("SUMMARY");
	}

	function saveDraft() {
		persist(
			{
				...draftAllocation,
				name: nameOrFallback(),
				updatedAt: new Date().toISOString()
			},
			"Saving draft…"
		);
	}

	function enableEdit() {
		setEditMode(true);
		setCurrentStep("SALES");
	}

	function distributeAllocation() {
		persist(
			{
				...draftAllocation,
				status: "DISTRIBUTED",
				updatedAt: new Date().toISOString()
			},
			"Distributing allocation…"
		);

		setEditMode(false);
		setCurrentStep("SUMMARY");
	}

	function setDraftName(name: string) {
		setDraftAllocation((prev) => ({
			...prev,
			name
		}));
	}

	return {
		allocations,
		selectedAllocation,
		isNewAllocation,
		draftAllocation,
		currentStep,
		setCurrentStep,
		editMode,
		finalResult,
		distributionTotalAmount,
		distributionTotalPercent,
		isDistributionReconciled,
		isReadOnly,
		isDistributionEditable,
		isSaving,
		savingMessage,
		loadAllocation,
		startNewAllocation,
		setDistributionMode,
		updateDistributionEntry,
		addDistributionEntry,
		removeDistributionEntry,
		confirmAllocation,
		saveDraft,
		enableEdit,
		distributeAllocation,
		setDraftName,
		setDraftAllocation,
		persist
	};
}

import { mockTransactions } from "../Data/finance.mock";
import type { TSalesFilter } from "../Types/finance";

export function useFinanceTransactions(
	draftAllocation: TFinanceAllocation,
	setDraftAllocation: React.Dispatch<React.SetStateAction<TFinanceAllocation>>
) {
	const [filters, setFilters] = useState<TSalesFilter>({});

	const categories = useMemo(() => Array.from(new Set(mockProducts.map((product) => product.productCategory))), []);

	const productNames = useMemo(() => Array.from(new Set(mockProducts.map((product) => product.productName))), []);

	const filteredTransactions = useMemo(() => {
		return mockTransactions.filter((transaction) => {
			if (filters.startDate && transaction.transactionDate < new Date(filters.startDate)) {
				return false;
			}

			if (filters.endDate) {
				const endOfDay = new Date(filters.endDate);
				endOfDay.setHours(23, 59, 59, 999);

				if (transaction.transactionDate > endOfDay) {
					return false;
				}
			}

			if (
				filters.category &&
				!transaction.transactionItems.some((item) => {
					const product = mockProducts.find((candidate) => candidate.productName === item.productName);

					return product?.productCategory === filters.category;
				})
			) {
				return false;
			}

			if (
				filters.productName &&
				!transaction.transactionItems.some((item) => item.productName === filters.productName)
			) {
				return false;
			}

			return true;
		});
	}, [filters]);

	const selectedTransactions = useMemo(
		() =>
			mockTransactions.filter((transaction) =>
				draftAllocation.transactionIds.includes(transaction.transactionId)
			),
		[draftAllocation.transactionIds]
	);

	function toggleTransaction(transactionId: number) {
		setDraftAllocation((prev) => ({
			...prev,
			transactionIds: prev.transactionIds.includes(transactionId)
				? prev.transactionIds.filter((id) => id !== transactionId)
				: [...prev.transactionIds, transactionId]
		}));
	}

	function selectAllFiltered() {
		setDraftAllocation((prev) => ({
			...prev,
			transactionIds: Array.from(
				new Set([...prev.transactionIds, ...filteredTransactions.map((t) => t.transactionId)])
			)
		}));
	}

	function clearSelection() {
		setDraftAllocation((prev) => ({
			...prev,
			transactionIds: []
		}));
	}

	return {
		filters,
		setFilters,
		categories,
		productNames,
		filteredTransactions,
		selectedTransactions,
		toggleTransaction,
		selectAllFiltered,
		clearSelection
	};
}

import { calcAdjustedResult, calcAdjustmentsTotal, calcSalesSummary } from "../Utilities/financeCalculations";
import type { TAdjustment } from "../Types/finance";

let adjustmentIdCounter = 0;

export function useFinanceAdjustments(
	draftAllocation: TFinanceAllocation,
	selectedTransactions: typeof mockTransactions,
	setDraftAllocation: React.Dispatch<React.SetStateAction<TFinanceAllocation>>
) {
	const salesSummary = useMemo(() => calcSalesSummary(selectedTransactions), [selectedTransactions]);

	const adjustmentsTotal = useMemo(
		() => calcAdjustmentsTotal(draftAllocation.adjustments),
		[draftAllocation.adjustments]
	);

	const finalResult = useMemo(
		() => calcAdjustedResult(salesSummary.remain, adjustmentsTotal),
		[salesSummary.remain, adjustmentsTotal]
	);

	function addAdjustment(adjustment: Omit<TAdjustment, "id">) {
		adjustmentIdCounter += 1;

		setDraftAllocation((prev) => ({
			...prev,
			adjustments: [
				...prev.adjustments,
				{
					...adjustment,
					id: `adj-${Date.now()}-${adjustmentIdCounter}`
				}
			]
		}));
	}

	function removeAdjustment(id: string) {
		setDraftAllocation((prev) => ({
			...prev,
			adjustments: prev.adjustments.filter((a) => a.id !== id)
		}));
	}

	return {
		salesSummary,
		adjustmentsTotal,
		finalResult,
		addAdjustment,
		removeAdjustment
	};
}

export function useFinanceAllocation() {
	const allocation = useAllocation();

	const transactions = useFinanceTransactions(allocation.draftAllocation, allocation.setDraftAllocation);

	const adjustments = useFinanceAdjustments(
		allocation.draftAllocation,
		transactions.selectedTransactions,
		allocation.setDraftAllocation
	);

	return {
		// Allocation
		allocations: allocation.allocations,
		selectedAllocation: allocation.selectedAllocation,
		isNewAllocation: allocation.isNewAllocation,
		draftAllocation: allocation.draftAllocation,
		currentStep: allocation.currentStep,
		setCurrentStep: allocation.setCurrentStep,
		editMode: allocation.editMode,

		// Transactions
		filters: transactions.filters,
		setFilters: transactions.setFilters,
		categories: transactions.categories,
		productNames: transactions.productNames,
		filteredTransactions: transactions.filteredTransactions,
		selectedTransactions: transactions.selectedTransactions,

		// Calculations
		salesSummary: adjustments.salesSummary,
		adjustmentsTotal: adjustments.adjustmentsTotal,
		finalResult: adjustments.finalResult,

		// Distribution
		distributionTotalAmount: allocation.distributionTotalAmount,
		distributionTotalPercent: allocation.distributionTotalPercent,
		isDistributionReconciled: allocation.isDistributionReconciled,

		// Permissions
		isReadOnly: allocation.isReadOnly,
		isSalesAdjustmentsEditable:
			!allocation.isReadOnly &&
			(allocation.isNewAllocation || allocation.draftAllocation.status === "DRAFT" || allocation.editMode),
		isDistributionEditable: allocation.isDistributionEditable,

		// Saving
		isSaving: allocation.isSaving,
		savingMessage: allocation.savingMessage,

		// Allocation actions
		loadAllocation: allocation.loadAllocation,
		startNewAllocation: allocation.startNewAllocation,

		// Transaction actions
		toggleTransaction: transactions.toggleTransaction,
		selectAllFiltered: transactions.selectAllFiltered,
		clearSelection: transactions.clearSelection,

		// Adjustment actions
		addAdjustment: adjustments.addAdjustment,
		removeAdjustment: adjustments.removeAdjustment,

		// Distribution actions
		setDistributionMode: allocation.setDistributionMode,
		updateDistributionEntry: allocation.updateDistributionEntry,
		addDistributionEntry: allocation.addDistributionEntry,
		removeDistributionEntry: allocation.removeDistributionEntry,

		// Allocation lifecycle
		confirmAllocation: allocation.confirmAllocation,
		saveDraft: allocation.saveDraft,
		enableEdit: allocation.enableEdit,
		distributeAllocation: allocation.distributeAllocation,
		setDraftName: allocation.setDraftName
	};
}
