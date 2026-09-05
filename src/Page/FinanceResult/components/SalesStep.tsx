import { useState } from "react";
import type { ReactNode, SubmitEvent } from "react";
import styles from "./SalesStep.module.css";
import Button from "../../../Component/Button/Button";
import Drawer from "../../../Component/Drawer/Drawer";
import { formatRupiah, getLocalTimestamp } from "../../../Utilities/NumberFormater";
import type { TBusinessSettlement, TSalesFilter } from "../../../Types/settlement";
import type { TTransactionPerItem } from "../../../Types/transaction";
import ChevronIcon from "../../../Component/MediaComponent/ChevronIcon";

export type SalesStepProps = {
	activeSettlement: TBusinessSettlement;
	transactionsItems: TTransactionPerItem[];
	filters: TSalesFilter;
	onFiltersChange: (filters: TSalesFilter) => void;
	isFilterAllowed: boolean;

	categories: string[];
	products: string[];

	checkSelection: (item: TTransactionPerItem) => boolean;
	onToggleTransaction: (row: { id: number; baselineSelected: boolean }) => void;
	onSelectAll: () => void;
	onClearSelection: () => void;
	onResetSelection: () => void;

	// toggeledItems: Map<number, boolean>;
	totalEffectiveSelected: number;

	pageData: {
		firstItem: number;
		lastItem: number;
		totalCount: number;
		totalSelected: number;
		currentPage: number;
		totalPages: number;
	};

	readOnly: boolean;
	breakdown: ReactNode;
};

function FilterFields({
	filters,
	onFiltersChange,
	categories, // --- ready
	products,
	isFilterAllowed
}: {
	filters: TSalesFilter;
	onFiltersChange: (filters: TSalesFilter) => void;
	categories: string[];
	products: string[];
	isFilterAllowed: boolean;
}) {
	return (
		<div className={styles.filterFields}>
			<label className={styles.field}>
				<span>Start date</span>
				<input
					type="date"
					value={filters.startDate}
					onChange={(event) => {
						handleActionOnPrevention(
							isFilterAllowed,
							"Your action will change the selection scope, are you sure?",
							() => {
								onFiltersChange({ ...filters, startDate: event.target.value || undefined });
							}
						);
					}}
				/>
			</label>

			<label className={styles.field}>
				<span>End date</span>
				<input
					type="date"
					value={filters.endDate}
					onChange={(event) => {
						handleActionOnPrevention(
							isFilterAllowed,
							"Your action will change the selection scope, are you sure?",
							() => {
								onFiltersChange({ ...filters, endDate: event.target.value || undefined });
							}
						);
					}}
				/>
			</label>

			<label className={styles.field}>
				<span>Category</span>
				<select
					value={filters.category?.values().next().value ?? ""}
					onChange={(event) =>
						onFiltersChange({
							...filters,
							category: event.target.value ? [event.target.value] : undefined
						})
					}
				>
					<option value="">All categories</option>
					{categories.map((category) => (
						<option key={category} value={category}>
							{category}
						</option>
					))}
				</select>
			</label>

			<label className={styles.field}>
				<span>Product</span>
				<select
					value={filters.productName?.values().next().value ?? ""}
					onChange={(event) =>
						onFiltersChange({
							...filters,
							productName: event.target.value ? [event.target.value] : undefined
						})
					}
				>
					<option value="">All products</option>
					{products.map((product) => (
						<option key={product} value={product}>
							{product}
						</option>
					))}
				</select>
			</label>
		</div>
	);
}

export default function SalesStep({
	transactionsItems,
	filters,
	onFiltersChange,
	isFilterAllowed,
	categories,
	products,
	checkSelection,
	onToggleTransaction,
	onSelectAll,
	onClearSelection,
	onResetSelection,
	totalEffectiveSelected,
	pageData,
	readOnly,
	breakdown
}: SalesStepProps) {
	const [isFilterDrawerOpen, setFilterDrawerOpen] = useState(false);
	const activeFilterCount = Object.values(filters).filter(Boolean).length;

	function handleDrawerSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setFilterDrawerOpen(false);
	}

	const { firstItem, lastItem, totalCount, currentPage, totalPages } = pageData;

	const renderFilterSection = (inDrawer: boolean) => (
		<>
			<FilterFields
				isFilterAllowed={isFilterAllowed}
				filters={filters}
				onFiltersChange={onFiltersChange}
				categories={categories}
				products={products}
			/>
			{!readOnly && (
				<div className={inDrawer ? styles.drawerActions : styles.filterActions}>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => {
							// handleActionOnPrevention(
							// 	isFilterAllowed,
							// 	"Your action will reset toggled selection, are you sure?",
							// );
							onSelectAll();
						}}
						type="button"
					>
						Select all
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							// handleActionOnPrevention(
							// 	isFilterAllowed,
							// 	"Your action will reset toggled selection, are you sure?",
							// );
							onClearSelection();
						}}
						type="button"
					>
						Clear
					</Button>
					<Button variant="danger" size="sm" onClick={onResetSelection} type="button">
						Reset
					</Button>
				</div>
			)}
		</>
	);
	return (
		<div className={styles.layout}>
			<aside className={`${styles.filterCard} card`}>
				<h3 className={styles.cardTitle}>Filter transactions</h3>
				{renderFilterSection(false)}
			</aside>

			<button type="button" className={styles.mobileFilterTrigger} onClick={() => setFilterDrawerOpen(true)}>
				Filters
				{activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
			</button>

			<section className={styles.listCard}>
				<div className={styles.listHeader}>
					<h3 className={styles.cardTitle}>Sold Items</h3>
					<span className={styles.listCount}>
						{readOnly
							? `${totalCount} results`
							: `selected ${totalEffectiveSelected} of ${totalCount} results`}
					</span>
				</div>

				<div className={styles.list}>
					{transactionsItems.length === 0 && (
						<p className={styles.emptyState}>No transactions match these filters.</p>
					)}

					{transactionsItems.map((item) => {
						const isSelected = checkSelection(item);
						return (
							<label
								key={item.transactionItemId}
								className={`${styles.row} ${isSelected ? styles.rowSelected : ""} ${readOnly ? styles.rowReadOnly : ""}`}
							>
								{!readOnly && (
									<input
										type="checkbox"
										checked={isSelected}
										onChange={() =>
											onToggleTransaction({
												id: item.transactionItemId,
												baselineSelected: item.baselineSelected
											})
										}
									/>
								)}
								<div className={styles.rowMain}>
									<span className={styles.rowCode}>
										{item.productName}: {item.quantity} x {formatRupiah(item.unitPrice)}
									</span>
									<span className={styles.rowMeta}>
										{getLocalTimestamp(item.transactionTime)} · {item.cashier} ·{" "}
										{item.paymentMethod.toUpperCase()}
									</span>
								</div>
								<span className={styles.rowAmount}>{formatRupiah(item.subtotal)}</span>
							</label>
						);
					})}
				</div>

				<div className={styles.pagination}>
					<span className={styles.paginationInfo}>
						Showing {firstItem} - {lastItem} of {totalCount}
					</span>
					<div className={styles.paginationControls}>
						<Button
							variant="secondary"
							size="sm"
							type="button"
							onClick={() => {
								onFiltersChange({
									...filters,
									page: filters.page > 1 ? filters.page - 1 : 1
								});
							}}
							disabled={filters.page <= 1}
						>
							<ChevronIcon direction="left" />
						</Button>
						<div className={styles.currentPage}>
							{currentPage} / {totalPages}
						</div>
						<Button
							variant="secondary"
							size="sm"
							type="button"
							onClick={() => {
								onFiltersChange({
									...filters,
									page: filters.page < totalPages ? filters.page + 1 : totalPages
								});
							}}
							disabled={filters.page >= totalPages}
						>
							<ChevronIcon direction="right" />
						</Button>
					</div>
				</div>
			</section>

			<div className={styles.summaryCard}>{breakdown}</div>

			{isFilterDrawerOpen && (
				<Drawer
					title="Filter transactions"
					eyebrow="Sales"
					onClose={() => setFilterDrawerOpen(false)}
					onSubmit={handleDrawerSubmit}
				>
					{renderFilterSection(true)}
				</Drawer>
			)}
		</div>
	);
}

const handleActionOnPrevention = (isAllowed: boolean, message: string, action: () => void) => {
	if (isAllowed) {
		action();
		return;
	}

	const confirmed = window.confirm(message);

	if (!confirmed) {
		return;
	}
	action();
};
