import { useMemo, useState } from "react";
import styles from "./AllocationSelector.module.css";
import StatusBadge from "./StatusBadge";
// import type { TAllocationStatus, TFinanceAllocation } from "../../../Types/finance";
import Drawer from "../../../Component/Drawer/Drawer";
import type { TBusinessSettlement, TBusinessSettlementLists, TSettlementStatus } from "../../../Types/settlement";

const STATUS_ORDER: TSettlementStatus[] = ["DRAFT", "CONFIRMED", "SETTLED"];
const STATUS_GROUP_LABEL: Record<TSettlementStatus, string> = {
	DRAFT: "Draft",
	CONFIRMED: "Confirmed",
	SETTLED: "Settled"
};

export type AllocationSelectorButtonProps = {
	drawerState: boolean;
	setDrawerState: (state: boolean) => void;
	isNewAllocation: boolean;
	selectedSettlement: TBusinessSettlement | null;
};

export type AllocationSelectorDrawerProps = {
	settlements: TBusinessSettlementLists[];
	selectedSettlement: TBusinessSettlement | null;
	setDrawerState: (state: boolean) => void;
	onSelect: (id: number) => void;
	onCreateNew: () => void;
};

/**
 * Trigger button lives in the Finance header. The picker itself renders
 * inside the shared Drawer component (right-side panel), matching the
 * pattern already used on the Catalog page.
 */
export function AllocationSelector(props: AllocationSelectorButtonProps) {
	const triggerLabel = props.isNewAllocation
		? "New allocation"
		: props.selectedSettlement?.settlementName || "Select allocation";

	return (
		<>
			<button
				type="button"
				className={styles.trigger}
				onClick={() => props.setDrawerState(true)}
				aria-expanded={props.drawerState}
			>
				<div className={styles.triggerText}>
					<span className={styles.triggerEyebrow}>Allocation</span>
					<span className={styles.triggerName}>{triggerLabel}</span>
				</div>
				{props.selectedSettlement && !props.isNewAllocation && (
					<StatusBadge status={props.selectedSettlement.settlementStatus} />
				)}
				<span className={styles.chevron} aria-hidden="true">
					▾
				</span>
			</button>
		</>
	);
}

export function AllocationSelectorDrawer({
	settlements,
	selectedSettlement,
	setDrawerState,
	onSelect,
	onCreateNew
}: AllocationSelectorDrawerProps) {
	const [query, setQuery] = useState("");

	const grouped = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		const filtered = normalizedQuery
			? settlements.filter((settlement) => settlement.settlementName.toLowerCase().includes(normalizedQuery))
			: settlements;

		return STATUS_ORDER.map((status) => ({
			status,
			items: filtered
				.filter((allocation) => allocation.settlementStatus === status)
				.sort((a, b) => {
					const aDate = a.settlementLastUpdatedAt || a.settlementCreatedAt;
					const bDate = b.settlementLastUpdatedAt || b.settlementCreatedAt;
					if (!aDate && !bDate) return 0;
					if (!aDate) return 1;
					if (!bDate) return -1;
					return bDate.getTime() - aDate.getTime();
				})
		})).filter((group) => group.items.length > 0);
	}, [settlements, query]);

	return (
		<Drawer title="Select allocation" eyebrow="Finance" onClose={() => setDrawerState(false)}>
			<div className={styles.searchRow}>
				<input
					type="text"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search allocations… e.g. August, Bazar"
					className={styles.searchInput}
					autoFocus
				/>
			</div>

			<button
				type="button"
				className={styles.createAction}
				onClick={() => {
					onCreateNew();
					setDrawerState(false);
				}}
			>
				<span className={styles.createIcon} aria-hidden="true">
					+
				</span>
				Create new allocation
			</button>

			<div className={styles.groups}>
				{grouped.length === 0 && <p className={styles.empty}>No allocations match “{query}”.</p>}

				{grouped.map((group) => (
					<div className={styles.group} key={group.status}>
						<p className={styles.groupLabel}>
							{STATUS_GROUP_LABEL[group.status]}
							<span className={styles.groupCount}>{group.items.length}</span>
						</p>

						{group.items.map((settlement) => (
							<button
								type="button"
								key={settlement.settlementId}
								className={`${styles.item} ${settlement.settlementId === selectedSettlement?.settlementId ? styles.itemActive : ""}`}
								onClick={() => {
									onSelect(settlement.settlementId!);
									setDrawerState(false);
								}}
							>
								<span
									className={`${styles.dot} ${styles[settlement.settlementStatus]}`}
									aria-hidden="true"
								/>
								<span className={styles.itemText}>
									<span className={styles.itemName}>{settlement.settlementName}</span>
									<span className={styles.itemMeta}>
										{settlement.soldItems} sold items of {settlement.soldCategories} categories
									</span>
								</span>
							</button>
						))}
					</div>
				))}
			</div>
		</Drawer>
	);
}
