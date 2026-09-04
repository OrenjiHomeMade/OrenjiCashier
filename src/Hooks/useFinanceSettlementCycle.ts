import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type {
	TBusinessSettlement,
	TBusinessSettlementLists,
	TSettlementStep,
	TSettlementStatus
} from "../Types/settlement";
import { useState } from "react";
import {
	createBusinessSettlement,
	getBusinessSettlementById,
	getBusinessSettlementLists,
	updateBusinessSettlement
} from "../Services/supabase/settlementServices";

const EMPTY_SETTLEMENT: TBusinessSettlement = {
	settlementStart: null,
	settlementEnd: null,
	settlementFilter: null,

	salesRevenue: 0,
	salesIngredientCost: 0,
	salesLaborCost: 0,
	salesPackagingCost: 0,
	salesUtilityCost: 0,
	salesMargin: 0,

	settledIngredientCost: 0,
	settledLaborCost: 0,
	settledPackagingCost: 0,
	settledUtilityCost: 0,
	totalAdditionalExpenses: 0,

	profitDistributed: 0,
	profitRetained: 0,
	deficitCovered: 0,

	settlementId: null,
	settlementName: "",
	settlementStatus: "DRAFT",

	settlementLastUpdatedAt: null,
	settlementCreatedAt: null,

	soldItems: 0,
	soldCategories: 0
};

export const useFinanceSettlementCycle = () => {
	const queryClient = useQueryClient();
	// =========================================================
	// SERVER STATE
	// =========================================================
	const {
		data: settlements,
		isLoading: isLoadingSettlementList,
		isError: isErrorSettlementList
	} = useSuspenseQuery({
		queryKey: ["getSettlementsList"],
		queryFn: async (): Promise<TBusinessSettlementLists[]> => {
			const settlements = await getBusinessSettlementLists();
			return settlements.map((settlement) => ({
				settlementId: settlement.business_settlement_id,
				settlementName: settlement.settlement_name,
				settlementStatus: settlement.settlement_status as TSettlementStatus,
				soldItems: settlement.transaction_item_count,
				soldCategories: settlement.product_category_count,
				settlementLastUpdatedAt: settlement.updated_at ? new Date(settlement.updated_at) : null,
				settlementCreatedAt: new Date(settlement.created_at)
			}));
		}
	});

	// =========================================================
	// UI STATE
	// =========================================================
	const [selectedSettlementId, setSelectedSettlementId] = useState<number | null>(
		settlements[0]?.settlementId ?? null
	);
	const [isNewSettlement, setIsNewSettlement] = useState<boolean>(false);
	const [currentStep, setCurrentStep] = useState<TSettlementStep>("SUMMARY");

	// =========================================================
	// DRAFT STATE
	// =========================================================
	const [draftSettlement, setDraftSettlement] = useState<TBusinessSettlement | null>(null);
	const [isEditMade, setIsEditMade] = useState<boolean>(false);

	// =========================================================
	// SELECTED SETTLEMENT
	// =========================================================
	const {
		data: selectedSettlement
		// isLoading,
		// isError
	} = useQuery({
		queryKey: ["settlement", selectedSettlementId, settlements],
		enabled: selectedSettlementId !== null,
		queryFn: async (): Promise<TBusinessSettlement | null> => {
			if (selectedSettlementId === null) {
				return null;
			}
			const data = await getBusinessSettlementById(selectedSettlementId);
			if (!data) {
				return null;
			}
			const { soldItems, soldCategories } = settlements.filter((e) => e.settlementId === selectedSettlementId)[0];
			return {
				settlementStart: new Date(data.settlement_start!),
				settlementEnd: new Date(data.settlement_end!),
				settlementFilter: data.settlement_additional_selector,

				salesRevenue: data.sales_revenue,
				salesIngredientCost: data.sales_ingredient_cost,
				salesLaborCost: data.sales_labor_cost,
				salesPackagingCost: data.sales_packaging_cost,
				salesUtilityCost: data.sales_utility_cost,
				salesMargin: data.sales_margin,

				settledIngredientCost: data.settled_ingredient_cost,
				settledLaborCost: data.settled_labor_cost,
				settledPackagingCost: data.settled_packaging_cost,
				settledUtilityCost: data.settled_utility_cost,
				totalAdditionalExpenses: data.total_additional_expenses,

				profitDistributed: data.profit_distributed,
				profitRetained: data.profit_retained,
				deficitCovered: data.deficit_covered,

				settlementId: data.business_settlement_id,
				settlementName: data.settlement_name,
				settlementStatus: data.settlement_status as TSettlementStatus,

				settlementLastUpdatedAt: data.updated_at ? new Date(data.updated_at) : null,
				settlementCreatedAt: new Date(data.created_at!),

				soldItems: soldItems,
				soldCategories: soldCategories
			};
		}
	});

	// ---------------------------------------------------------
	// QUERY MUTATION
	// ---------------------------------------------------------
	const createNewSettlementMutation = useMutation({
		mutationFn: createBusinessSettlement,
		onSuccess: async (data) => {
			await queryClient.invalidateQueries({
				queryKey: ["getSettlementsList"]
			});
			setSelectedSettlementId(data.business_settlement_id);
			setIsNewSettlement(false);
			setDraftSettlement(null);
			setIsEditMade(false);
			if (activeSettlement.settlementStatus !== "DRAFT") {
				setCurrentStep("SUMMARY");
			}
		}
	});

	const updateSettlementMutation = useMutation({
		mutationFn: updateBusinessSettlement,
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: ["settlement"]
				}),
				queryClient.invalidateQueries({
					queryKey: ["getSettlementsList"]
				})
			]);
			setIsEditMade(false);
		}
	});

	// ---------------------------------------------------------
	// EFFECTIVE DATA
	// ---------------------------------------------------------
	const activeSettlement = draftSettlement ?? selectedSettlement ?? EMPTY_SETTLEMENT;

	const loadSettlement = (settlementId: number) => {
		setIsEditMade(false);
		setSelectedSettlementId(settlementId);
		setIsNewSettlement(false);
		setDraftSettlement(null);
		setCurrentStep("SUMMARY");
	};

	const startNewSettlement = () => {
		setIsEditMade(false);
		setSelectedSettlementId(null);
		setIsNewSettlement(true);
		setDraftSettlement({ ...EMPTY_SETTLEMENT });
		setCurrentStep("SALES");
	};

	const updateDraftSettlement = (changes: Partial<TBusinessSettlement>) => {
		setIsEditMade(true);
		setDraftSettlement((current) => {
			const base = current ?? selectedSettlement;

			if (!base) {
				return current;
			}

			return {
				...base,
				...changes
			};
		});
	};

	const onSave = () => {
		// console.log(activeSettlement);
		if (activeSettlement.settlementId === null) {
			createNewSettlementMutation.mutate({
				settlementName: activeSettlement.settlementName,
				settlementStart: activeSettlement.settlementStart!,
				settlementEnd: activeSettlement.settlementEnd!,
				settlementFilter: null,
				transactionItemIds: []
			});
		} else {
			updateSettlementMutation.mutate({
				settlementId: activeSettlement.settlementId,
				changes: activeSettlement
			});
		}
	};

	const onCancel = () => {
		// Cancel creating a new settlement
		if (isNewSettlement) {
			const firstSettlementId = settlements[0]?.settlementId ?? null;

			setSelectedSettlementId(firstSettlementId);
			setIsNewSettlement(false);
			setDraftSettlement(null);
			setIsEditMade(false);
			return;
		}

		// Cancel editing an existing settlement
		setDraftSettlement(null);
		setIsEditMade(false);
		if (activeSettlement.settlementStatus !== "DRAFT") {
			setCurrentStep("SUMMARY");
		}
	};

	const _getLoadingState = () => {
		if (isLoadingSettlementList) {
			return { showLoading: true, loadingState: "Loading settlement lists..." };
		} else if (createNewSettlementMutation.isPending) {
			return { showLoading: true, loadingState: "Saving new settlement..." };
		} else if (updateSettlementMutation.isPending) {
			return { showLoading: true, loadingState: "Updating settlement..." };
		} else {
			return { showLoading: false, loadingState: "" };
		}
	};

	const { showLoading, loadingState } = _getLoadingState();
	const isError = isErrorSettlementList;
	const errorState = isErrorSettlementList ? "Failed to load settlement lists." : "";

	return {
		// DATA
		settlements,
		selectedSettlement,
		// CALLBACKS
		loadSettlement,
		startNewSettlement,
		updateDraftSettlement,
		onSave,
		onCancel,
		// STATE & SETTER
		currentStep,
		setCurrentStep,
		isEditMade,
		setIsEditMade,
		// DERIVED DATA
		activeSettlement,
		// ONLY STATE
		isNewSettlement,
		// QUERY STATE
		showLoading,
		loadingState,
		isError,
		errorState
	};
};
