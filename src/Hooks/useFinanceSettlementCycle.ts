import { useSuspenseQuery } from "@tanstack/react-query";
import { getBusinessSettlementById, getBusinessSettlementLists } from "../Services/supabase/settlementServices";
import type {
	TBusinessSettlement,
	TBusinessSettlementLists,
	TFinanceStep,
	TSettlementStatus
} from "../Types/settlement";
import { useState } from "react";

export const useFinanceSettlementCycle = () => {
	const {
		data: settlement,
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
				settlementLastUpdatedAt: settlement.updated_at,
				settlementCreatedAt: settlement.created_at
			}));
		}
	});

	const [selectedSettlementId, setSelectedSettlementId] = useState<number | null>(settlement[0].settlementId ?? null);
	const [isNewSettlement, setIsNewSettlement] = useState<boolean>(false);
	const [currentStep, setCurrentStep] = useState<TFinanceStep>("SUMMARY");

	const { data: selectedSettlement } = useSuspenseQuery({
		queryKey: ["getSettlementsById", selectedSettlementId],
		queryFn: async (): Promise<TBusinessSettlement> => {
			const data = selectedSettlementId ? await getBusinessSettlementById(selectedSettlementId) : null;
			if (!data) {
				return {
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

					settlementId: 0,
					settlementName: "",
					settlementStatus: "DRAFT",

					settlementLastUpdatedAt: null,
					settlementCreatedAt: new Date().toLocaleString()
				};
			}

			return {
				settlementStart: data.settlement_start,
				settlementEnd: data.settlement_end,
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

				settlementLastUpdatedAt: data.updated_at,
				settlementCreatedAt: data.created_at!
			};
		}
	});

	// const [draftSettlement, setDraftSettlement] = useState<TBusinessSettlement | null>(null);

	const loadSettlement = (settlementId: number) => {
		setSelectedSettlementId(settlementId);
		setIsNewSettlement(false);
		setCurrentStep("SUMMARY");
	};

	const startNewSettlement = () => {
		setSelectedSettlementId(null);
		setIsNewSettlement(true);
		setCurrentStep("SALES");
	};

	const showLoading = isLoadingSettlementList && !settlement;
	const loadingState = isLoadingSettlementList ? "Loading settlement lists..." : "";
	const isError = isErrorSettlementList;
	const errorState = isErrorSettlementList ? "Failed to load settlement lists." : "";

	console.log(selectedSettlement);

	return {
		// DATA
		settlement,
		selectedSettlement,
		// CALLBACKS
		loadSettlement,
		startNewSettlement,
		// STATE
		currentStep,
		isNewSettlement,
		// QUERY STATE
		showLoading,
		loadingState,
		isError,
		errorState
	};
};
