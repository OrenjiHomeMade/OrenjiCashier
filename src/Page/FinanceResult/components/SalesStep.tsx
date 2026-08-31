import { useState } from "react";
import type { FormEvent } from "react";
import styles from "./SalesStep.module.css";
import Button from "../../../Component/Button/Button";
import CurrencyStat from "./CurrencyStat";
import Drawer from "../../../Component/Drawer/Drawer";
import { formatRupiah } from "../../../Utilities/NumberFormater";
import type { TSalesFilter, TSalesSummary } from "../../../Types/finance";
import type { TTransaction } from "../../../Types/transaction";

export type SalesStepProps = {
	transactions: TTransaction[];
	filters: TSalesFilter;
	onFiltersChange: (filters: TSalesFilter) => void;
	categories: string[];
	products: string[];
	selectedTransactionIds: number[];
	onToggleTransaction: (id: number) => void;
	onSelectAll: () => void;
	onClearSelection: () => void;
	summary: TSalesSummary;
	readOnly: boolean;
};

function FilterFields({
	filters,
	onFiltersChange,
	categories,
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
	transactions,
	filters,
	onFiltersChange,
	categories,
	products,
	selectedTransactionIds,
	onToggleTransaction,
	onSelectAll,
	onClearSelection,
	summary,
	readOnly
}: SalesStepProps) {
	const [isFilterDrawerOpen, setFilterDrawerOpen] = useState(false);
	const activeFilterCount = Object.values(filters).filter(Boolean).length;

	function handleDrawerSubmit(event: FormEvent<HTMLFormElement>) {
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
					<span className={styles.listCount}>{transactions.length} results</span>
				</div>

				<div className={styles.list}>
					{transactions.length === 0 && (
						<p className={styles.emptyState}>No transactions match these filters.</p>
					)}

					{transactions.map((transaction) => {
						const isSelected = selectedTransactionIds.includes(transaction.transactionId);
						return (
							<label
								key={transaction.transactionId}
								className={`${styles.row} ${isSelected ? styles.rowSelected : ""} ${readOnly ? styles.rowReadOnly : ""}`}
							>
								{!readOnly && (
									<input
										type="checkbox"
										checked={isSelected}
										onChange={() => onToggleTransaction(transaction.transactionId)}
									/>
								)}
								<div className={styles.rowMain}>
									<span className={styles.rowCode}>{transaction.transactionCode}</span>
									<span className={styles.rowMeta}>
										{transaction.transactionDate.toLocaleDateString("id-ID", {
											day: "2-digit",
											month: "short",
											year: "numeric"
										})}{" "}
										· {transaction.cashier} · {transaction.paymentMethod}
									</span>
								</div>
								<span className={styles.rowItems}>{transaction.transactionItems.length} items</span>
								<span className={styles.rowAmount}>{formatRupiah(transaction.transactionAmount)}</span>
							</label>
						);
					})}
				</div>
			</section>

			<aside className={`${styles.summaryCard} card`}>
				<h3 className={styles.cardTitle}>Sales result</h3>
				<div className={styles.summaryGrid}>
					<CurrencyStat label="Transactions" value={summary.transactionCount} format="number" tone="muted" />
					<CurrencyStat label="Revenue" value={summary.revenue} size="lg" />
					<CurrencyStat label="COGS" value={summary.cogs} tone="muted" />
					<CurrencyStat label="Labor" value={summary.labor} tone="muted" />
					<CurrencyStat label="Other costs" value={summary.otherCosts} tone="muted" />
				</div>
				<div className={styles.marginRow}>
					<span className={styles.marginLabel}>Margin</span>
					<span className={styles.marginValue}>{formatRupiah(summary.margin)}</span>
				</div>
			</aside>

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
