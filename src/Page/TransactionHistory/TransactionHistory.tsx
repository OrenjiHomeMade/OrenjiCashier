import { useMemo, useState } from "react";
import style from "./TransactionHistory.module.css";
import { dateStringInputFormat } from "../../Utilities/NumberFormater";
import ChevronIcon from "../../Component/MediaComponent/ChevronIcon";
import TransactionItem, { type TTransactionItem } from "../../Component/TransactionItem/TransactionItem";

const exampleTransactions: TTransactionItem[] = [
	{
		transactionId: "TRX-20260810-001",
		transactionDate: new Date("2026-08-10T09:32:00"),
		transactionAmount: 85000,
		paymentMethod: "QRIS",
		transactionItems: [
			{
				productId: "DIM-001",
				productName: "Dimsum Ayam",
				quantity: 2,
				price: 15000
			},
			{
				productId: "GOR-002",
				productName: "Bakwan",
				quantity: 2,
				price: 10000
			},
			{
				productId: "CKS-001",
				productName: "Cookies Coklat",
				quantity: 1,
				price: 25000
			}
		]
	},
	{
		transactionId: "TRX-20260810-002",
		transactionDate: new Date("2026-08-10T10:15:00"),
		transactionAmount: 42000,
		paymentMethod: "CASH",
		transactionItems: [
			{
				productId: "DIM-002",
				productName: "Dimsum Udang",
				quantity: 1,
				price: 17000
			},
			{
				productId: "GOR-001",
				productName: "Cireng",
				quantity: 1,
				price: 10000
			},
			{
				productId: "GOR-002",
				productName: "Bakwan",
				quantity: 1,
				price: 15000
			}
		]
	},
	{
		transactionId: "TRX-20260809-001",
		transactionDate: new Date("2026-08-09T14:42:00"),
		transactionAmount: 120000,
		paymentMethod: "QRIS",
		transactionItems: [
			{
				productId: "DIM-001",
				productName: "Dimsum Ayam",
				quantity: 4,
				price: 15000
			},
			{
				productId: "DIM-002",
				productName: "Dimsum Udang",
				quantity: 2,
				price: 17000
			},
			{
				productId: "CKS-001",
				productName: "Cookies Coklat",
				quantity: 2,
				price: 25000
			}
		]
	},
	{
		transactionId: "TRX-20260808-001",
		transactionDate: new Date("2026-08-08T17:20:00"),
		transactionAmount: 56000,
		paymentMethod: "CASH",
		transactionItems: [
			{
				productId: "GOR-001",
				productName: "Cireng",
				quantity: 2,
				price: 10000
			},
			{
				productId: "GOR-002",
				productName: "Bakwan",
				quantity: 2,
				price: 15000
			},
			{
				productId: "DIM-001",
				productName: "Dimsum Ayam",
				quantity: 1,
				price: 16000
			}
		]
	},
	{
		transactionId: "TRX-20260807-001",
		transactionDate: new Date("2026-08-07T11:05:00"),
		transactionAmount: 75000,
		paymentMethod: "QRIS",
		transactionItems: [
			{
				productId: "DIM-001",
				productName: "Dimsum Ayam",
				quantity: 3,
				price: 15000
			},
			{
				productId: "CKS-001",
				productName: "Cookies Coklat",
				quantity: 1,
				price: 30000
			}
		]
	}
];

const ITEMS_PER_PAGE = 5;

const TransactionHistory = () => {
	const [searchTerm, setSearchTerm] = useState("");

	const [startDate, setStartDate] = useState(() => {
		const date = new Date();
		date.setDate(date.getDate() - 7);

		return dateStringInputFormat(date);
	});

	const [endDate, setEndDate] = useState(() => dateStringInputFormat(new Date()));

	const [currentPage, setCurrentPage] = useState(1);

	const filteredTransactions = useMemo(() => {
		return exampleTransactions.filter((transaction) => {
			const search = searchTerm.toLowerCase().trim();

			if (!search) {
				return true;
			}

			const transactionMatches = transaction.transactionId.toLowerCase().includes(search);

			const productMatches = transaction.transactionItems.some((item) =>
				item.productName.toLowerCase().includes(search)
			);

			return transactionMatches || productMatches;
		});
	}, [searchTerm]);

	const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));

	const displayedTransactions = filteredTransactions.slice(
		(currentPage - 1) * ITEMS_PER_PAGE,
		currentPage * ITEMS_PER_PAGE
	);

	const handleFilter = () => {
		setCurrentPage(1);

		console.log({
			searchTerm,
			startDate,
			endDate
		});
	};

	const handlePreviousPage = () => {
		setCurrentPage((page) => Math.max(1, page - 1));
	};

	const handleNextPage = () => {
		setCurrentPage((page) => Math.min(totalPages, page + 1));
	};

	return (
		<div className={`page ${style.transactionHistoryLayout}`}>
			<div className={style.transactionHistoryHeader}>
				<div className={style.headerTitle}>
					<h1>Transaction History</h1>
					<span>View and manage your previous transactions</span>
				</div>

				<div className={style.filterContainer}>
					<div className={style.searchContainer}>
						<label htmlFor="transaction-search">Search Transaction</label>

						<input
							id="transaction-search"
							type="search"
							value={searchTerm}
							onChange={(event) => {
								setSearchTerm(event.target.value);
								setCurrentPage(1);
							}}
							placeholder="Search transaction or product..."
							className={style.searchInput}
						/>
					</div>

					<div className={style.timeFilterContainer}>
						<div className={style.dateInputGroup}>
							<label htmlFor="startDate">From</label>

							<input
								id="startDate"
								type="date"
								value={startDate}
								onChange={(event) => setStartDate(event.target.value)}
							/>
						</div>

						<div className={style.dateInputGroup}>
							<label htmlFor="endDate">To</label>

							<input
								id="endDate"
								type="date"
								value={endDate}
								onChange={(event) => setEndDate(event.target.value)}
							/>
						</div>

						<button id="filterDate" type="button" className={style.filterButton} onClick={handleFilter}>
							Apply
						</button>
					</div>
				</div>
			</div>

			<div className={`card ${style.transactionTable}`}>
				<div className={style.transactionTableHeader}>
					<div className={style.expandColumn}></div>
					<div>Transaction ID</div>
					<div>Date & Time</div>
					<div>Items</div>
					<div>Payment</div>
					<div>Amount</div>
					<div className={style.actionColumn}>Action</div>
				</div>

				<div className={style.transactionTableBody}>
					{displayedTransactions.length > 0 ? (
						displayedTransactions.map((transaction) => (
							<TransactionItem key={transaction.transactionId} {...transaction} />
						))
					) : (
						<div className={style.emptyState}>No transactions found.</div>
					)}
				</div>

				<div className={style.transactionTableFooter}>
					<span className={style.paginationInfo}>
						Showing {filteredTransactions.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
						{Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of{" "}
						{filteredTransactions.length}
					</span>

					<div className={style.paginationControls}>
						<button
							type="button"
							onClick={handlePreviousPage}
							disabled={currentPage === 1}
							aria-label="Previous page"
						>
							<ChevronIcon direction="left" />
						</button>

						<div className={style.currentPage}>
							{currentPage} / {totalPages}
						</div>

						<button
							type="button"
							onClick={handleNextPage}
							disabled={currentPage === totalPages}
							aria-label="Next page"
						>
							<ChevronIcon direction="right" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TransactionHistory;
