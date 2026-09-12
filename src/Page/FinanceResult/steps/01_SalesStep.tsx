// IMPORT STYLES
import styles from "./01_SalesStep.module.css";
// IMPORT TYPES
import type { ReactNode, SubmitEvent } from "react";
import type { TBusinessSettlement, TSalesFilter } from "../../../Types/settlement";
import type { TTransactionPerItem } from "../../../Types/transaction";
// IMPORT HOOKS
import { useState } from "react";
// IMPORT COMPONENTS
import Button from "../../../Component/Button/Button";
import Drawer from "../../../Component/Drawer/Drawer";
import ChevronIcon from "../../../Component/MediaComponent/ChevronIcon";
import MultiSelectDropdown from "../../../Component/MultiSelectDropdown/MultiSelectDropdown";
// UTILITIES
import { guardAction } from "../../../Utilities/guardAction";
import { formatRupiah, getLocalTimestamp } from "../../../Utilities/NumberFormater";

const WARNING_SCOPE_CHANGE = "Perubahan ini akan mengubah cakupan pilihan. Anda yakin?";

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
	categories,
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
				<span>Tanggal Mulai</span>
				<input
					type="date"
					value={filters.startDate}
					onChange={(event) => {
						guardAction(isFilterAllowed, WARNING_SCOPE_CHANGE, () => {
							onFiltersChange({ ...filters, startDate: event.target.value || undefined });
						});
					}}
				/>
			</label>

			<label className={styles.field}>
				<span>Tanggal Akhir</span>
				<input
					type="date"
					value={filters.endDate}
					onChange={(event) => {
						guardAction(isFilterAllowed, WARNING_SCOPE_CHANGE, () => {
							onFiltersChange({ ...filters, endDate: event.target.value || undefined });
						});
					}}
				/>
			</label>

			<label className={styles.field}>
				<span>Kategori</span>
				<MultiSelectDropdown
					options={categories}
					selectedValues={filters.category}
					onChange={(category) => {
						onFiltersChange({ ...filters, category });
					}}
					placeholder="Kategori"
				/>
			</label>

			<label className={styles.field}>
				<span>Produk</span>
				<MultiSelectDropdown
					options={products}
					selectedValues={filters.productName}
					onChange={(productName) => {
						onFiltersChange({ ...filters, productName });
					}}
					placeholder="Produk"
				/>
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
							onSelectAll();
						}}
						type="button"
					>
						Pilih semua
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							onClearSelection();
						}}
						type="button"
					>
						Hapus pilihan
					</Button>
					<Button variant="danger" size="sm" onClick={onResetSelection} type="button">
						Atur ulang
					</Button>
				</div>
			)}
		</>
	);
	return (
		<div className={styles.layout}>
			<section className={styles.listCard}>
				<div className={styles.filterBar}>{renderFilterSection(false)}</div>

				<button type="button" className={styles.mobileFilterTrigger} onClick={() => setFilterDrawerOpen(true)}>
					Filter
					{activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
				</button>

				<div className={styles.listHeader}>
					<h3 className={styles.cardTitle}>Barang Terjual</h3>
					<span className={styles.listCount}>
						{readOnly
							? `${totalCount} hasil`
							: `${totalEffectiveSelected} barang transaksi terpilih dari ${totalCount} hasil penyaringan`}
					</span>
				</div>

				<div className={styles.list}>
					{transactionsItems.length === 0 && (
						<p className={styles.emptyState}>Tidak ada transaksi yang sesuai dengan filter ini.</p>
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
						Menampilkan {firstItem} - {lastItem} dari {totalCount}
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
					title="Filter transaksi"
					eyebrow="Penjualan"
					onClose={() => setFilterDrawerOpen(false)}
					onSubmit={handleDrawerSubmit}
				>
					{renderFilterSection(true)}
				</Drawer>
			)}
		</div>
	);
}
