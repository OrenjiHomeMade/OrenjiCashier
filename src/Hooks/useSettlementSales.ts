import { useQuery } from "@tanstack/react-query";
import { getProductCategories, getProducts } from "../Services/supabase/productService";
import { useEffect, useState } from "react";
import type { TBusinessSettlement, TSalesFilter } from "../Types/settlement";
import { getTransactionsPerItem, type GetTransactionItemParams } from "../Services/supabase/transactionService";
import type { TTransactionPerItem } from "../Types/transaction";
import { dateStringInputFormat, getDate30DaysAgo } from "../Utilities/NumberFormater";

export const useSettlementSales = (
	isReadOnly: boolean,
	enabled: boolean,
	activeSettlement: TBusinessSettlement,
	setIsEditMade: (value: boolean) => void
) => {
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
						: dateStringInputFormat(getDate30DaysAgo()),
				endDate:
					activeSettlement.settlementEnd && activeSettlement.settlementEnd.getTime() !== new Date(0).getTime()
						? dateStringInputFormat(activeSettlement.settlementEnd)
						: dateStringInputFormat(new Date())
			};
		});
	}, [activeSettlement.settlementStart, activeSettlement.settlementEnd]);

	// console.log(salesFilter.category);
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

	const [bulkIntent, setBulkIntent] = useState<"ALL" | "CLEAR" | "MANUAL">("MANUAL");
	const [toggledTransactionItems, setToggledTransactionItems] = useState<Map<number, boolean>>(new Map());
	const [preventRefilter, setPreventRefilter] = useState<boolean>(false);

	const toggleTransaction = (row: { id: number; baselineSelected: boolean }) => {
		if (!preventRefilter) {
			setIsEditMade(true);
			setPreventRefilter(true);
		}
		setToggledTransactionItems((current) => {
			const next = new Map(current);
			if (next.has(row.id)) {
				next.delete(row.id);
			} else {
				next.set(row.id, row.baselineSelected);
			}
			return next;
		});
	};

	// BULK_INTENT : NULL --> flip all toggledTransactionItems
	// BULK_INTENT : ALL --> set all transaction but exclude the toggledTransactionItems (exceptions)
	// BULK_INTENT : CLEAR --> unset all transaction but set the toggledTransactionItems (exceptions)
	const totalEffectiveSelected = () => {
		if (bulkIntent === "ALL") {
			return totalCount - toggledTransactionItems.size;
		}
		if (bulkIntent === "CLEAR") {
			return toggledTransactionItems.size;
		}
		let delta = 0;
		for (const wasSelected of toggledTransactionItems.values()) {
			delta += wasSelected ? -1 : +1;
		}
		return totalSelected + delta;
	};

	const selectAllFiltered = () => {
		setBulkIntent("ALL");
		setIsEditMade(true);
		setToggledTransactionItems(new Map());
	};

	const clearSelection = () => {
		setBulkIntent("CLEAR");
		setIsEditMade(true);
		setToggledTransactionItems(new Map());
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
		setBulkIntent("MANUAL");
		setToggledTransactionItems(new Map());
		setPreventRefilter(false);
	};

	// const savingSales = () => {
	// 	setPreventRefilter(false);

	// 	if (bulkIntent === "ALL") {
	// 		return {
	// 			selectionMode: bulkIntent,
	// 			idToSave: [],
	// 			idToDelete: Array.from(toggledTransactionItems.keys()),
	// 			salesFilter
	// 		};
	// 	}

	// 	if (bulkIntent === "CLEAR") {
	// 		return {
	// 			selectionMode: bulkIntent,
	// 			idToSave: Array.from(toggledTransactionItems.keys()),
	// 			idToDelete: [],
	// 			salesFilter
	// 		};
	// 	}

	// 	const idToSave: Array<number> = Array.from(toggledTransactionItems.entries()).flatMap(([k, v]) =>
	// 		!v ? [k] : []
	// 	);
	// 	const idToDelete: Array<number> = Array.from(toggledTransactionItems.entries()).flatMap(([k, v]) =>
	// 		v ? [k] : []
	// 	);
	// 	return {
	// 		idToSave,
	// 		idToDelete,
	// 		salesFilter,
	// 		selectionMode: bulkIntent
	// 	};
	// };

	const savingSales = () => {
		setPreventRefilter(false);

		const toggledIds = Array.from(toggledTransactionItems.keys());

		let idToSave: number[] = [];
		let idToDelete: number[] = [];

		if (bulkIntent === "ALL") {
			idToDelete = toggledIds;
		} else if (bulkIntent === "CLEAR") {
			idToSave = toggledIds;
		} else {
			for (const [id, isDeleted] of toggledTransactionItems) {
				(isDeleted ? idToDelete : idToSave).push(id);
			}
		}

		return {
			selectionMode: bulkIntent,
			idToSave,
			idToDelete,
			salesFilter
		};
	};

	const checkIsEffectivelySelected = ({ transactionItemId, baselineSelected }: TTransactionPerItem) => {
		const base = bulkIntent === "ALL" ? true : bulkIntent === "CLEAR" ? false : baselineSelected;
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
		totalEffectiveSelected,
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
