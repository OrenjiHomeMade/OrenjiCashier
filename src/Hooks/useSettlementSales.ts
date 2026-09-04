import { useQuery } from "@tanstack/react-query";
import { getProductCategories, getProducts } from "../Services/supabase/productService";
import { useEffect, useState } from "react";
import type { TBusinessSettlement, TSalesFilter } from "../Types/settlement";
import { getTransactionsPerItem, type GetTransactionItemParams } from "../Services/supabase/transactionService";
import type { TTransactionPerItem } from "../Types/transaction";
import { dateStringInputFormat } from "../Utilities/NumberFormater";

export const useSettlementSales = (isReadOnly: boolean, enabled: boolean, activeSettlement: TBusinessSettlement) => {
	const selectedTransactionId: number | null = activeSettlement.settlementId;

	const { data: productsCategories = [], isLoading: isLoadingProductCategory } = useQuery({
		queryKey: ["category"],
		queryFn: () => getProductCategories(),
		enabled: enabled
	});

	const { data: productNames = [] } = useQuery({
		queryKey: ["products"],
		queryFn: async () => {
			const data = await getProducts(null);
			return data.map((d) => d.productName);
		}
	});

	const [salesFilter, setSalesFilter] = useState<TSalesFilter>({
		isReadOnly: isReadOnly,
		page: 1
	});

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setSalesFilter((current) => {
			return {
				...current,
				startDate:
					activeSettlement.settlementStart &&
					activeSettlement.settlementStart.getTime() !== new Date(0).getTime()
						? dateStringInputFormat(activeSettlement.settlementStart)
						: undefined,
				endDate:
					activeSettlement.settlementEnd && activeSettlement.settlementEnd.getTime() !== new Date(0).getTime()
						? dateStringInputFormat(activeSettlement.settlementEnd)
						: undefined
			};
		});
	}, [activeSettlement.settlementStart, activeSettlement.settlementEnd]);

	console.log(salesFilter.category);
	const updateSalesFilter = (changes: Partial<TSalesFilter>) => {
		setSalesFilter((current) => {
			const base = current;
			return {
				...base,
				...changes
			};
		});
	};

	const { data: transactionResult, isLoading: isLoadingTransactionItem } = useQuery({
		queryKey: ["transactionItems", salesFilter, selectedTransactionId],
		queryFn: () => {
			const filter: TSalesFilter = {
				...salesFilter,
				isReadOnly: isReadOnly,
				settlementId: selectedTransactionId ?? undefined
			};
			return getTransactionItemByFilter(filter);
		},
		enabled: enabled
	});

	const transactionItems = transactionResult?.data ?? [];
	const totalCount = transactionResult?.totalCount ?? 0;
	const totalSelected = transactionResult?.totalSelected ?? 0;
	const totalPages = transactionResult?.totalPages ?? 1;
	const itemPerPage = transactionResult?.pageSize ?? 20;

	const [bulkIntent, setBulkIntent] = useState<"all" | "clear" | null>(null);
	const [toggledTransactionItems, setToggledTransactionItems] = useState<Set<number>>(new Set());
	const [preventRefilter, setPreventRefilter] = useState<boolean>(false);

	const toggleTransaction = (id: number) => {
		if (!preventRefilter) {
			setPreventRefilter(true);
		}
		setToggledTransactionItems((current) => {
			const next = new Set(current);
			if (current.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	// BULK_INTENT : NULL --> flip all toggledTransactionItems
	// BULK_INTENT : ALL --> set all transaction but exclude the toggledTransactionItems (exceptions)
	// BULK_INTENT : CLEAR --> unset all transaction but set the toggledTransactionItems (exceptions)
	const selectAllFiltered = () => {
		setBulkIntent("all");
		setToggledTransactionItems(new Set());
	};

	const totalEffectiveSelected = () => {
		if (bulkIntent === null) {
			return toggledTransactionItems.size === 0 ? totalSelected : toggledTransactionItems.size;
		}
		if (bulkIntent === "all") {
			return totalCount - toggledTransactionItems.size;
		}
		if (bulkIntent === "clear") {
			return toggledTransactionItems.size;
		}
	};

	const clearSelection = () => {
		setBulkIntent("clear");
		setToggledTransactionItems(new Set());
	};

	const resetSelection = () => {
		setSalesFilter({
			isReadOnly: isReadOnly,
			page: 1,
			startDate:
				activeSettlement.settlementStart && activeSettlement.settlementStart.getTime() !== new Date(0).getTime()
					? dateStringInputFormat(activeSettlement.settlementStart)
					: undefined,
			endDate:
				activeSettlement.settlementEnd && activeSettlement.settlementEnd.getTime() !== new Date(0).getTime()
					? dateStringInputFormat(activeSettlement.settlementEnd)
					: undefined
		});
		setBulkIntent(null);
		setToggledTransactionItems(new Set());
		setPreventRefilter(false);
	};

	const savingSales = () => {
		setPreventRefilter(false);
	};

	const checkIsEffectivelySelected = ({ transactionItemId, baselineSelected }: TTransactionPerItem) => {
		const base = bulkIntent === "all" ? true : bulkIntent === "clear" ? false : baselineSelected;
		return toggledTransactionItems.has(transactionItemId) ? !base : base;
	};

	const _getLoadingState = () => {
		if (isLoadingProductCategory) {
			return { showLoading: true, loadingState: "Loading product category item..." };
		} else if (isLoadingTransactionItem) {
			return { showLoading: true, loadingState: "Loading transaction items..." };
		} else {
			return { showLoading: false, loadingState: "" };
		}
	};

	const { showLoading, loadingState } = _getLoadingState();
	// const isError = isErrorSettlementList;
	// const errorState = isErrorSettlementList ? "Failed to load settlement lists." : "";

	return {
		effectiveSelected: totalEffectiveSelected,
		productsCategories,
		productNames,
		transactionItems,
		// functions
		savingSales,
		// filter related
		updateSalesFilter,
		selectAllFiltered,
		clearSelection,
		resetSelection,
		// selection related
		toggleTransaction,
		checkIsEffectivelySelected,
		// pagination
		totalCount,
		totalSelected,
		totalPages,
		itemPerPage,
		// states
		bulkIntent,
		setBulkIntent,
		toggledTransactionItems,
		setToggledTransactionItems,
		salesFilter,
		setSalesFilter,
		preventRefilter,
		// loading
		showLoading,
		loadingState
	};
};

const getTransactionItemByFilter = async (filter: TSalesFilter) => {
	const filterData: GetTransactionItemParams = {
		p_is_readonly: filter.isReadOnly,
		p_start_date: filter.startDate,
		p_end_date: filter.endDate,
		p_search: "",
		p_product_category: filter.category,
		p_product_name: filter.productName,
		p_page: filter.page,
		p_page_size: 20,
		p_settlement_id: filter.settlementId
	};

	return await getTransactionsPerItem(filterData);
};
