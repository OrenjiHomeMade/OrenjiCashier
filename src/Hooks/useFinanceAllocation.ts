import { useMemo, useState } from "react";
import { mockAllocations, mockProducts, mockTransactions } from "../Data/finance.mock";
import {
	calcAdjustedResult,
	calcAdjustmentsTotal,
	calcDistributionTotal,
	calcSalesSummary
} from "../Utilities/financeCalculations";
import { DEFAULT_DISTRIBUTION_LABELS } from "../Types/finance";
import type { TAdjustment, TDistributionMode, TFinanceAllocation, TFinanceStep, TSalesFilter } from "../Types/finance";

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

let adjustmentIdCounter = 0;
let distributionIdCounter = 0;

export function useFinanceAllocation() {
	const [allocations, setAllocations] = useState<TFinanceAllocation[]>(mockAllocations);
	const [selectedAllocationId, setSelectedAllocationId] = useState<string | null>(mockAllocations[0]?.id ?? null);
	const [isNewAllocation, setIsNewAllocation] = useState(false);
	const [draftAllocation, setDraftAllocation] = useState<TFinanceAllocation>(
		mockAllocations[0] ?? createBlankAllocation()
	);
	const [currentStep, setCurrentStep] = useState<TFinanceStep>("SUMMARY");
	const [editMode, setEditMode] = useState(false);
	const [filters, setFilters] = useState<TSalesFilter>({});
	const [isSaving, setIsSaving] = useState(false);
	const [savingMessage, setSavingMessage] = useState("Saving…");

	const selectedAllocation = useMemo(
		() => allocations.find((allocation) => allocation.id === selectedAllocationId) ?? null,
		[allocations, selectedAllocationId]
	);

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

	const salesSummary = useMemo(() => calcSalesSummary(selectedTransactions), [selectedTransactions]);
	const adjustmentsTotal = useMemo(
		() => calcAdjustmentsTotal(draftAllocation.adjustments),
		[draftAllocation.adjustments]
	);
	const finalResult = useMemo(
		() => calcAdjustedResult(salesSummary.margin, adjustmentsTotal),
		[salesSummary.margin, adjustmentsTotal]
	);

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
	const isSalesAdjustmentsEditable =
		!isReadOnly && (isNewAllocation || draftAllocation.status === "DRAFT" || editMode);
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
		setFilters({});
	}

	function startNewAllocation() {
		const blank = createBlankAllocation();
		setSelectedAllocationId(null);
		setIsNewAllocation(true);
		setDraftAllocation(blank);
		setEditMode(false);
		setCurrentStep("SALES");
		setFilters({});
	}

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
		setDraftAllocation((prev) => ({ ...prev, transactionIds: [] }));
	}

	function addAdjustment(adjustment: Omit<TAdjustment, "id">) {
		adjustmentIdCounter += 1;
		setDraftAllocation((prev) => ({
			...prev,
			adjustments: [...prev.adjustments, { ...adjustment, id: `adj-${Date.now()}-${adjustmentIdCounter}` }]
		}));
	}

	function removeAdjustment(id: string) {
		setDraftAllocation((prev) => ({ ...prev, adjustments: prev.adjustments.filter((a) => a.id !== id) }));
	}

	function setDistributionMode(mode: TDistributionMode) {
		setDraftAllocation((prev) => ({ ...prev, distributionMode: mode }));
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
			distribution: [...prev.distribution, { id: `dist-${Date.now()}-${distributionIdCounter}`, label, value: 0 }]
		}));
	}

	function removeDistributionEntry(id: string) {
		setDraftAllocation((prev) => ({ ...prev, distribution: prev.distribution.filter((entry) => entry.id !== id) }));
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
			{ ...draftAllocation, name: nameOrFallback(), status: "CONFIRMED", updatedAt: new Date().toISOString() },
			"Confirming allocation…"
		);
		setEditMode(false);
		setCurrentStep("SUMMARY");
	}

	function saveDraft() {
		persist({ ...draftAllocation, name: nameOrFallback(), updatedAt: new Date().toISOString() }, "Saving draft…");
	}

	function enableEdit() {
		setEditMode(true);
		setCurrentStep("SALES");
	}

	function distributeAllocation() {
		persist(
			{ ...draftAllocation, status: "DISTRIBUTED", updatedAt: new Date().toISOString() },
			"Distributing allocation…"
		);
		setEditMode(false);
		setCurrentStep("SUMMARY");
	}

	function setDraftName(name: string) {
		setDraftAllocation((prev) => ({ ...prev, name }));
	}

	return {
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
		selectedTransactions,
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
	};
}
