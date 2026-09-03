import { useState } from "react";
import type { ReactNode, SubmitEvent } from "react";
import styles from "./SalesStep.module.css";
import Button from "../../../Component/Button/Button";
import Drawer from "../../../Component/Drawer/Drawer";
import { formatRupiah } from "../../../Utilities/NumberFormater";
import type { TSalesFilter } from "../../../Types/settlement";
import type { TTransactionPerItem } from "../../../Types/transaction";

export type SalesStepProps = {
	transactionsItems: TTransactionPerItem[];
	filters: TSalesFilter;
	onFiltersChange: (filters: TSalesFilter) => void;

	categories: string[];
	products: string[];

	selectedTransactionIds: Set<number>;
	onToggleTransaction: (id: number) => void;
	onSelectAll: () => void;
	onClearSelection: () => void;

	readOnly: boolean;
	breakdown: ReactNode;
};

function FilterFields({
	filters,
	onFiltersChange,
	categories, // --- ready
	products
}: {
	filters: TSalesFilter;
	onFiltersChange: (filters: TSalesFilter) => void;
	categories: string[];
	products: string[];
}) {
	return (
		<div className={styles.filterFields}>
			<label className={styles.field}>
				<span>Start date</span>
				<input
					type="date"
					value={filters.startDate ?? ""}
					onChange={(event) => onFiltersChange({ ...filters, startDate: event.target.value || undefined })}
				/>
			</label>

			<label className={styles.field}>
				<span>End date</span>
				<input
					type="date"
					value={filters.endDate ?? ""}
					onChange={(event) => onFiltersChange({ ...filters, endDate: event.target.value || undefined })}
				/>
			</label>

			<label className={styles.field}>
				<span>Category</span>
				<select
					value={filters.category ?? ""}
					onChange={(event) => onFiltersChange({ ...filters, category: event.target.value || undefined })}
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
					value={filters.productName ?? ""}
					onChange={(event) => onFiltersChange({ ...filters, productName: event.target.value || undefined })}
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
	categories,
	products,
	selectedTransactionIds,
	onToggleTransaction,
	onSelectAll,
	onClearSelection,
	readOnly,
	breakdown
}: SalesStepProps) {
	const [isFilterDrawerOpen, setFilterDrawerOpen] = useState(false);
	const activeFilterCount = Object.values(filters).filter(Boolean).length;

	function handleDrawerSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setFilterDrawerOpen(false);
	}

	return (
		<div className={styles.layout}>
			<aside className={`${styles.filterCard} card`}>
				<h3 className={styles.cardTitle}>Filter transactions</h3>
				<FilterFields
					filters={filters}
					onFiltersChange={onFiltersChange}
					categories={categories}
					products={products}
				/>
				{!readOnly && (
					<div className={styles.filterActions}>
						<Button variant="secondary" size="sm" onClick={onSelectAll} type="button">
							Select all
						</Button>
						<Button variant="ghost" size="sm" onClick={onClearSelection} type="button">
							Clear
						</Button>
					</div>
				)}
			</aside>

			<button type="button" className={styles.mobileFilterTrigger} onClick={() => setFilterDrawerOpen(true)}>
				Filters
				{activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
			</button>

			<section className={styles.listCard}>
				<div className={styles.listHeader}>
					<h3 className={styles.cardTitle}>Transactions</h3>
					<span className={styles.listCount}>{transactionsItems.length} results</span>
				</div>

				<div className={styles.list}>
					{transactionsItems.length === 0 && (
						<p className={styles.emptyState}>No transactions match these filters.</p>
					)}

					{transactionsItems.map((item) => {
						const isSelected = selectedTransactionIds.has(item.transactionItemId);
						return (
							<label
								key={item.transactionItemId}
								className={`${styles.row} ${isSelected ? styles.rowSelected : ""} ${readOnly ? styles.rowReadOnly : ""}`}
							>
								{!readOnly && (
									<input
										type="checkbox"
										checked={isSelected}
										onChange={() => onToggleTransaction(item.transactionItemId)}
									/>
								)}
								<div className={styles.rowMain}>
									<span className={styles.rowCode}>{item.transactionCode}</span>
									<span className={styles.rowMeta}>
										{item.transactionTime} · {item.cashier} · {item.paymentMethod}
									</span>
								</div>
								<span className={styles.rowItems}>{item.productName}</span>
								<span className={styles.rowItems}>
									{item.quantity} x {item.unitPrice}
								</span>
								<span className={styles.rowAmount}>{formatRupiah(item.subtotal)}</span>
							</label>
						);
					})}
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
					<FilterFields
						filters={filters}
						onFiltersChange={onFiltersChange}
						categories={categories}
						products={products}
					/>
					{!readOnly && (
						<div className={styles.drawerActions}>
							<Button variant="secondary" type="button" onClick={onSelectAll}>
								Select all
							</Button>
							<Button variant="ghost" type="button" onClick={onClearSelection}>
								Clear selection
							</Button>
						</div>
					)}
				</Drawer>
			)}
		</div>
	);
}
