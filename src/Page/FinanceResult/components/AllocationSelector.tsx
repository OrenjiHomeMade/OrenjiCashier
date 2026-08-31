import { useMemo, useState } from "react";
import styles from "./AllocationSelector.module.css";
import StatusBadge from "./StatusBadge";
import type { TAllocationStatus, TFinanceAllocation } from "../../../Types/finance";
import Drawer from "../../../Component/Drawer/Drawer";

const STATUS_ORDER: TAllocationStatus[] = ["DRAFT", "CONFIRMED", "DISTRIBUTED"];
const STATUS_GROUP_LABEL: Record<TAllocationStatus, string> = {
	DRAFT: "Draft",
	CONFIRMED: "Confirmed",
	DISTRIBUTED: "Distributed"
};

export type AllocationSelectorButtonProps = {
	drawerState: boolean;
	setDrawerState: (state: boolean) => void;
	isNewAllocation: boolean;
	selectedAllocation: TFinanceAllocation | null;
};

export type AllocationSelectorDrawerProps = {
	allocations: TFinanceAllocation[];
	selectedAllocation: TFinanceAllocation | null;
	setDrawerState: (state: boolean) => void;
	onSelect: (id: string) => void;
	onCreateNew: () => void;
	getTransactionCount: (allocation: TFinanceAllocation) => number;
};

/**
 * Trigger button lives in the Finance header. The picker itself renders
 * inside the shared Drawer component (right-side panel), matching the
 * pattern already used on the Catalog page.
 */
export function AllocationSelector(props: AllocationSelectorButtonProps) {
	const triggerLabel = props.isNewAllocation
		? "New allocation"
		: props.selectedAllocation?.name || "Select allocation";

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
				{props.selectedAllocation && !props.isNewAllocation && (
					<StatusBadge status={props.selectedAllocation.status} />
				)}
				<span className={styles.chevron} aria-hidden="true">
					▾
				</span>
			</button>
			{/* {isOpen && <AllocationSelectorDrawer {...props} />} */}
		</>
	);
}

export function AllocationSelectorDrawer({
	allocations,
	selectedAllocation,
	// isNewAllocation,
	setDrawerState,
	onSelect,
	onCreateNew,
	getTransactionCount
}: AllocationSelectorDrawerProps) {
	const [query, setQuery] = useState("");

	const grouped = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		const filtered = normalizedQuery
			? allocations.filter((allocation) => allocation.name.toLowerCase().includes(normalizedQuery))
			: allocations;

		return STATUS_ORDER.map((status) => ({
			status,
			items: filtered
				.filter((allocation) => allocation.status === status)
				.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
		})).filter((group) => group.items.length > 0);
	}, [allocations, query]);

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

						{group.items.map((allocation) => (
							<button
								type="button"
								key={allocation.id}
								className={`${styles.item} ${allocation.id === selectedAllocation?.id ? styles.itemActive : ""}`}
								onClick={() => {
									onSelect(allocation.id);
									setDrawerState(false);
								}}
							>
								<span className={`${styles.dot} ${styles[allocation.status]}`} aria-hidden="true" />
								<span className={styles.itemText}>
									<span className={styles.itemName}>{allocation.name}</span>
									<span className={styles.itemMeta}>
										{getTransactionCount(allocation)} transactions
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
