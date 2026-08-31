import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./AllocationSelector.module.css";
import StatusBadge from "./StatusBadge";
import type { TAllocationStatus, TFinanceAllocation } from "../../../Types/finance";

const STATUS_ORDER: TAllocationStatus[] = ["DRAFT", "CONFIRMED", "DISTRIBUTED"];
const STATUS_GROUP_LABEL: Record<TAllocationStatus, string> = {
	DRAFT: "Draft",
	CONFIRMED: "Confirmed",
	DISTRIBUTED: "Distributed"
};

export type AllocationSelectorProps = {
	allocations: TFinanceAllocation[];
	selectedAllocation: TFinanceAllocation | null;
	isNewAllocation: boolean;
	onSelect: (id: string) => void;
	onCreateNew: () => void;
	getTransactionCount: (allocation: TFinanceAllocation) => number;
};

export default function AllocationSelector({
	allocations,
	selectedAllocation,
	isNewAllocation,
	onSelect,
	onCreateNew,
	getTransactionCount
}: AllocationSelectorProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const rootRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

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

	const triggerLabel = isNewAllocation ? "New allocation" : selectedAllocation?.name || "Select allocation";

	return (
		<div className={styles.root} ref={rootRef}>
			<button
				type="button"
				className={styles.trigger}
				onClick={() => setIsOpen((open) => !open)}
				aria-expanded={isOpen}
			>
				<div className={styles.triggerText}>
					<span className={styles.triggerEyebrow}>Allocation</span>
					<span className={styles.triggerName}>{triggerLabel}</span>
				</div>
				{selectedAllocation && !isNewAllocation && <StatusBadge status={selectedAllocation.status} />}
				<span className={styles.chevron} aria-hidden="true">
					▾
				</span>
			</button>

			{isOpen && (
				<div className={styles.panel} role="listbox">
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
							setIsOpen(false);
							setQuery("");
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
											setIsOpen(false);
											setQuery("");
										}}
									>
										<span
											className={`${styles.dot} ${styles[allocation.status]}`}
											aria-hidden="true"
										/>
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
				</div>
			)}
		</div>
	);
}
