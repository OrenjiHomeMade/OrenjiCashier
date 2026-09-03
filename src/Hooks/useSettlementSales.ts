import { useQuery } from "@tanstack/react-query";
import { getProductCategories, getProducts } from "../Services/supabase/productService";
import { useState } from "react";
import type { TSalesFilter } from "../Types/settlement";
import {
	getTransactionItemsBySettlementId,
	getTransactionsPerItem,
	type GetTransactionItemParams
} from "../Services/supabase/transactionService";

export const useSettlementSales = (isReadOnly: boolean, enabled: boolean, selectedTransactionId: number | null) => {
	console.log(selectedTransactionId);
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
		isReadOnly: isReadOnly
	});

	const { data: transactionResult, isLoading: isLoadingTransactionItem } = useQuery({
		queryKey: ["transactionItems", salesFilter, selectedTransactionId],
		queryFn: () => {
			// console.log(`transactionItems runs with ${selectedTransactionId}`);
			const filter: TSalesFilter = {
				...salesFilter,
				isReadOnly: isReadOnly,
				settlementId: selectedTransactionId ?? undefined
			};
			console.table(filter);
			return getTransactionItemByFilter(filter);
		}
		// enabled: enabled
	});

	const transactionItems = transactionResult?.data ?? [];
	const totalCount = transactionResult?.totalCount ?? 0;
	const totalPages = transactionResult?.totalPages ?? 1;
	const itemPerPage = transactionResult?.pageSize ?? 20;

	const { data: selectedTransactionItemsQRes = [], isLoading: isLoadingSelectedTransactionItem } = useQuery({
		queryKey: ["selectedTransactionItems", selectedTransactionId],
		queryFn: () => {
			if (!selectedTransactionId) {
				return [];
			}
			return getTransactionItemsBySettlementId(selectedTransactionId);
		}
	});

	const [selectedTransactionItems, setSelectedTransactionItems] = useState<Set<number>>(
		new Set(selectedTransactionItemsQRes)
	);

	const updateSalesFilter = (changes: Partial<TSalesFilter>) => {
		setSalesFilter((current) => {
			const base = current;
			return {
				...base,
				...changes
			};
		});
	};

	const toggleTransaction = (id: number) => {
		console.log(id);
		setSelectedTransactionItems((current) => {
			const next = new Set(current);
			if (current.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const selectAllFiltered = () => {
		setSelectedTransactionItems(new Set(transactionItems?.map((e) => e.transactionItemId)));
	};

	const clearSelection = () => {
		setSelectedTransactionItems(new Set());
	};

	const _getLoadingState = () => {
		if (isLoadingProductCategory) {
			return { showLoading: true, loadingState: "Loading product category item..." };
		} else if (isLoadingTransactionItem) {
			return { showLoading: true, loadingState: "Loading transaction items..." };
		} else if (isLoadingSelectedTransactionItem) {
			return { showLoading: true, loadingState: "Loading selected transaction items..." };
		} else {
			return { showLoading: false, loadingState: "" };
		}
	};

	const { showLoading, loadingState } = _getLoadingState();
	// const isError = isErrorSettlementList;
	// const errorState = isErrorSettlementList ? "Failed to load settlement lists." : "";

	return {
		productsCategories,
		productNames,
		transactionItems,
		// functions
		updateSalesFilter,
		toggleTransaction,
		selectAllFiltered,
		clearSelection,
		// pagination
		totalCount,
		totalPages,
		itemPerPage,
		// states
		selectedTransactionItems,
		setSelectedTransactionItems,
		salesFilter,
		setSalesFilter,
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
		p_search: filter.productName,
		p_product_category: filter.category,
		p_page: filter.page,
		p_page_size: 20,
		p_settlement_id: filter.settlementId
	};

	return await getTransactionsPerItem(filterData);
};
