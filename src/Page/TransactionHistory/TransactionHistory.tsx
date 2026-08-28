// IMPORT STYLES
import style from "./TransactionHistory.module.css";
// IMPORT HOOKS
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { dateStringInputFormat } from "../../Utilities/NumberFormater";
import ChevronIcon from "../../Component/MediaComponent/ChevronIcon";

import TransactionItem from "./TransactionItem/TransactionItem";

import { deleteTransaction, getCashierOperators, getTransactions } from "../../Services/supabase/transactionService";

import LoadingModal from "../../Component/LoadingModal/LoadingModal";
import type { Database } from "../../Types/database";
import type { TTransaction } from "../../Types/transaction";

type PaymentMethod = "CASH" | "QRIS";

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "QRIS"];

/* =========================================================
   RESPONSIVE ITEMS PER PAGE
   ========================================================= */

const getItemsPerPage = () => {
	if (typeof window === "undefined") {
		return 10;
	}

	// Phone
	if (window.innerWidth <= 767) {
		return 5;
	}

	// Tablet
	if (window.innerWidth <= 1100) {
		return 8;
	}

	// Desktop
	return 10;
};

/* =========================================================
   MAP DATABASE TRANSACTION → UI TRANSACTION
   ========================================================= */

// Define the DB shape of an item returned inside transaction.items
type RawTransactionItem = {
	transaction_item_id: number | string;
	product_name: string | null;
	product_id: number | string;
	quantity: number;
	unit_price: number;
	subtotal: number;
};

const mapTransactionToUI = (
	transaction: Database["public"]["Functions"]["get_transactions"]["Returns"][0]
): TTransaction => {
	// Cast the Json array to your explicit item type
	const rawItems = (transaction.items as RawTransactionItem[] | null) ?? [];

	return {
		transactionId: transaction.transaction_id,
		transactionCode: transaction.transaction_code,
		transactionDate: new Date(transaction.transaction_time),
		cashier: transaction.cashier,
		transactionAmount: Number(transaction.transaction_amount),
		paymentMethod: transaction.payment_method as PaymentMethod,
		transactionItems: rawItems.map((item) => ({
			id: String(item.transaction_item_id),
			productName: item.product_name ?? "",
			quantity: item.quantity,
			unitPrice: Number(item.unit_price),
			subtotal: Number(item.subtotal)
		}))
	};
};

/* =========================================================
   COMPONENT
   ========================================================= */

const TransactionHistory = () => {
	const queryClient = useQueryClient();
	const { data: CASHIERS } = useQuery({ queryKey: ["cashiers"], queryFn: () => getCashierOperators() });
	/* =====================================================
	   FILTER INPUT STATE

	   These represent what the user is currently typing/
	   selecting. They do NOT immediately query Supabase.
	   ===================================================== */

	const [searchTerm, setSearchTerm] = useState("");
	const [startDate, setStartDate] = useState(() => {
		const date = new Date();
		date.setDate(date.getDate() - 7);
		return dateStringInputFormat(date);
	});

	const [endDate, setEndDate] = useState(() => dateStringInputFormat(new Date()));
	const [cashier, setCashier] = useState("");
	const [paymentMethod, setPaymentMethod] = useState("");
	const [minAmount, setMinAmount] = useState("");
	const [maxAmount, setMaxAmount] = useState("");

	/* =====================================================
	   APPLIED FILTERS

	   These are the filters actually used by useQuery.

	   This means typing into Search does not cause a query
	   on every keystroke.
	   ===================================================== */

	const [appliedFilters, setAppliedFilters] = useState({
		searchTerm: "",
		startDate,
		endDate,
		cashier: "",
		paymentMethod: "",
		minAmount: "",
		maxAmount: ""
	});

	/* =====================================================
	   PAGINATION
	   ===================================================== */

	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(getItemsPerPage);

	/* =====================================================
	   RESPONSIVE PAGE SIZE
	   ===================================================== */

	useEffect(() => {
		const handleResize = () => {
			const newItemsPerPage = getItemsPerPage();
			setItemsPerPage((previous) => {
				if (previous !== newItemsPerPage) {
					// Changing page size can make the
					// current page invalid.
					setCurrentPage(1);
				}
				return newItemsPerPage;
			});
		};
		window.addEventListener("resize", handleResize);
		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, []);

	/* =====================================================
	   APPLY FILTER
	   ===================================================== */

	const handleFilter = () => {
		setAppliedFilters({
			searchTerm: searchTerm.trim(),
			startDate,
			endDate,
			cashier,
			paymentMethod,
			minAmount,
			maxAmount
		});

		setCurrentPage(1);
	};

	/* =====================================================
	   RESET FILTER
	   ===================================================== */

	const handleReset = () => {
		const defaultStartDate = (() => {
			const date = new Date();

			date.setDate(date.getDate() - 7);

			return dateStringInputFormat(date);
		})();

		const defaultEndDate = dateStringInputFormat(new Date());
		setSearchTerm("");
		setStartDate(defaultStartDate);
		setEndDate(defaultEndDate);
		setCashier("");
		setPaymentMethod("");
		setMinAmount("");
		setMaxAmount("");
		setAppliedFilters({
			searchTerm: "",
			startDate: defaultStartDate,
			endDate: defaultEndDate,
			cashier: "",
			paymentMethod: "",
			minAmount: "",
			maxAmount: ""
		});
		setCurrentPage(1);
	};

	/* =====================================================
	   TANSTACK QUERY
	   ===================================================== */

	const {
		data: transactionResult,
		isPending,
		isFetching,
		isError
	} = useQuery({
		queryKey: [
			"transactions",
			{
				page: currentPage,
				pageSize: itemsPerPage,
				search: appliedFilters.searchTerm,
				startDate: appliedFilters.startDate,
				endDate: appliedFilters.endDate,
				cashier: appliedFilters.cashier,
				paymentMethod: appliedFilters.paymentMethod,
				minAmount: appliedFilters.minAmount,
				maxAmount: appliedFilters.maxAmount
			}
		],

		queryFn: () =>
			getTransactions({
				page: currentPage,
				pageSize: itemsPerPage,
				search: appliedFilters.searchTerm || undefined,
				startDate: appliedFilters.startDate || undefined,
				endDate: appliedFilters.endDate || undefined,
				cashier: appliedFilters.cashier || undefined,
				paymentMethod: appliedFilters.paymentMethod || undefined,
				minAmount: appliedFilters.minAmount ? Number(appliedFilters.minAmount) : undefined,
				maxAmount: appliedFilters.maxAmount ? Number(appliedFilters.maxAmount) : undefined
			}),

		placeholderData: keepPreviousData,
		refetchOnWindowFocus: false
	});

	/* =====================================================
	   DELETE MUTATION
	   ===================================================== */
	const deleteTransactionMutation = useMutation({
		mutationFn: deleteTransaction,

		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["transactions"]
			});
		}
	});

	const handleDeleteTransaction = (transactionId: number) => {
		const confirmed = window.confirm("Are you sure you want to delete this transaction?");

		if (!confirmed) {
			return;
		}

		deleteTransactionMutation.mutate(Number(transactionId));
	};

	/* =====================================================
	   DATA
	   ===================================================== */

	const transactions: TTransaction[] = transactionResult?.data.map(mapTransactionToUI) ?? [];
	const totalCount = transactionResult?.totalCount ?? 0;
	const totalPages = transactionResult?.totalPages ?? 1;

	/*
	 * Protect the UI if the current page becomes invalid.
	 *
	 * Normally this should not happen because we reset
	 * page to 1 when filters/page size change.
	 */
	const safeCurrentPage = Math.min(currentPage, totalPages);

	/* =====================================================
	   PAGINATION INFORMATION
	   ===================================================== */

	const firstItem = totalCount === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;

	const lastItem = Math.min(safeCurrentPage * itemsPerPage, totalCount);

	/* =====================================================
	   PAGINATION HANDLERS
	   ===================================================== */

	const handlePreviousPage = () => {
		setCurrentPage((page) => Math.max(1, page - 1));
	};

	const handleNextPage = () => {
		setCurrentPage((page) => Math.min(totalPages, page + 1));
	};

	/* =====================================================
	   RENDER
	   ===================================================== */

	return (
		<div className={`page ${style.transactionHistoryLayout}`}>
			{isFetching && !isPending && <LoadingModal isOpen={isFetching && !isPending}>Refreshing Data</LoadingModal>}
			{/* =================================================
			    HEADER
			    ================================================= */}

			<header className={style.transactionHistoryHeader}>
				<div className={style.headerTitle}>
					<h1>Transaction History</h1>

					<span>View and manage your previous transactions</span>
				</div>

				{/* =============================================
				    FILTER PANEL
				    ============================================= */}

				<div className={style.filterPanel}>
					{/* SEARCH */}

					<div className={style.filterFieldSearch}>
						<label htmlFor="transaction-search">Search</label>

						<input
							id="transaction-search"
							type="search"
							value={searchTerm}
							onChange={(event) => setSearchTerm(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									handleFilter();
								}
							}}
							placeholder="No nota, product, cashier..."
							className={style.filterInput}
						/>
					</div>

					{/* FROM */}

					<div className={style.filterField}>
						<label htmlFor="startDate">From</label>

						<input
							id="startDate"
							type="date"
							value={startDate}
							onChange={(event) => setStartDate(event.target.value)}
							className={style.filterInput}
						/>
					</div>

					{/* TO */}

					<div className={style.filterField}>
						<label htmlFor="endDate">To</label>

						<input
							id="endDate"
							type="date"
							value={endDate}
							onChange={(event) => setEndDate(event.target.value)}
							className={style.filterInput}
						/>
					</div>

					{/* CASHIER */}

					<div className={style.filterField}>
						<label htmlFor="cashier">Cashier</label>

						<select
							id="cashier"
							value={cashier}
							onChange={(event) => setCashier(event.target.value)}
							className={style.filterInput}
						>
							<option value="">All cashiers</option>

							{CASHIERS &&
								CASHIERS.map(({ username: name }) => (
									<option key={name} value={name}>
										{name}
									</option>
								))}
							<option key={"SYSTEM"} value={"SYSTEM"}>
								SYSTEM
							</option>
						</select>
					</div>

					{/* PAYMENT */}

					<div className={style.filterField}>
						<label htmlFor="paymentMethod">Payment</label>

						<select
							id="paymentMethod"
							value={paymentMethod}
							onChange={(event) => setPaymentMethod(event.target.value)}
							className={style.filterInput}
						>
							<option value="">All methods</option>

							{PAYMENT_METHODS.map((method) => (
								<option key={method} value={method.toLowerCase()}>
									{method}
								</option>
							))}
						</select>
					</div>

					{/* MINIMUM AMOUNT */}

					<div className={style.filterField}>
						<label htmlFor="minAmount">Min. Amount</label>

						<input
							id="minAmount"
							type="number"
							min="0"
							value={minAmount}
							onChange={(event) => setMinAmount(event.target.value)}
							placeholder="0"
							className={style.filterInput}
						/>
					</div>

					{/* MAXIMUM AMOUNT */}

					<div className={style.filterField}>
						<label htmlFor="maxAmount">Max. Amount</label>

						<input
							id="maxAmount"
							type="number"
							min="0"
							value={maxAmount}
							onChange={(event) => setMaxAmount(event.target.value)}
							placeholder="No limit"
							className={style.filterInput}
						/>
					</div>

					{/* ACTIONS */}

					<div className={style.filterActions}>
						<button type="button" className={style.resetButton} onClick={handleReset}>
							Reset
						</button>

						<button type="button" className={style.filterButton} onClick={handleFilter}>
							Apply Filter
						</button>
					</div>
				</div>
			</header>

			{/* =================================================
			    TRANSACTION TABLE
			    ================================================= */}

			<section className={`card ${style.transactionTable}`}>
				{/* TABLE HEADER */}

				<div className={style.transactionTableHeader}>
					<div className={style.expandColumn}></div>

					<div>No Nota</div>

					<div>Tanggal</div>

					<div>Kasir</div>

					<div>Items</div>

					<div>Metode</div>

					<div className={style.amountHeader}>Total</div>

					<div className={style.actionColumn}>Aksi</div>
				</div>

				{/* =================================================
				    TABLE BODY
				    ================================================= */}

				<div className={style.transactionTableBody}>
					{/* INITIAL LOADING */}

					{isPending ? (
						<LoadingModal isOpen={isPending}>Loading Transaction Data...</LoadingModal>
					) : isError ? (
						<div className={style.emptyState}>
							<strong>Failed to load transactions</strong>
							<span>Please try again.</span>
						</div>
					) : transactions.length > 0 ? (
						transactions.map((transaction) => (
							<TransactionItem
								key={transaction.transactionId}
								{...transaction}
								onDelete={handleDeleteTransaction}
								isDeleting={
									deleteTransactionMutation.isPending &&
									deleteTransactionMutation.variables === transaction.transactionId
								}
							/>
						))
					) : (
						<div className={style.emptyState}>
							<div className={style.emptyIcon}>⌕</div>
							<strong>No transactions found</strong>
							<span>Try changing your search or filters.</span>
						</div>
					)}
				</div>

				{/* =================================================
				    PAGINATION
				    ================================================= */}

				<footer className={style.transactionTableFooter}>
					<span className={style.paginationInfo}>
						Showing {firstItem} - {lastItem} of {totalCount}
					</span>

					<div className={style.paginationControls}>
						<button
							type="button"
							onClick={handlePreviousPage}
							disabled={safeCurrentPage === 1 || isFetching}
							aria-label="Previous page"
						>
							<ChevronIcon direction="left" />
						</button>

						<div className={style.currentPage}>
							{safeCurrentPage} / {totalPages}
						</div>

						<button
							type="button"
							onClick={handleNextPage}
							disabled={safeCurrentPage === totalPages || isFetching}
							aria-label="Next page"
						>
							<ChevronIcon direction="right" />
						</button>
					</div>
				</footer>
			</section>
		</div>
	);
};

export default TransactionHistory;
