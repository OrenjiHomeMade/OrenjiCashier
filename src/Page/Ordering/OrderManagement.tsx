// IMPORT STYLE
import styles from "./OrderManagement.module.css";

// IMPORT HOOKS
import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";

// IMPORT DATA HOOKS
import {
	useOrdersOverview,
	useOrderDetail,
	useProductDemandOverview,
	useSetOrderItemReadyOverride,
	useUpdateOrderStatus,
	useConvertOrderToTransaction
} from "../../Hooks/useOrdering";

// IMPORT UTILITIES
import { formatDate } from "../../Utilities/NumberFormater";

// IMPORT TYPES
import type { TOrderStatus, TOrderSummary } from "../../Types/order";

// IMPORT COMPONENTS
import Button from "../../Component/Button/Button";
import ChevronIcon from "../../Component/MediaComponent/ChevronIcon";
import { ChevronDown, ChevronRight, Plus, RotateCcw } from "lucide-react";

// ASSUMPTION: adjust to wherever this screen actually gets mounted.
// Ordering.tsx's back button targets this same constant.
export const ORDER_MANAGEMENT_ROUTE = "/orders";
const NEW_ORDER_ROUTE = "/ordering";

type TStatusFilter = "all" | TOrderStatus;

const ALL_STATUSES: TOrderStatus[] = ["pending", "delivered", "paid", "cancelled"];

const STATUS_FILTERS: TStatusFilter[] = ["all", "pending", "delivered", "paid", "cancelled"];

const statusFilterToStatuses = (filter: TStatusFilter): TOrderStatus[] => (filter === "all" ? ALL_STATUSES : [filter]);

const statusLabel: Record<TStatusFilter, string> = {
	all: "All",
	pending: "Pending",
	delivered: "Delivered",
	paid: "Paid",
	cancelled: "Cancelled"
};

/* ==================================================
   EXPANDED ORDER ITEMS
   Fetches get_order_detail lazily — only while the
   row is open — rather than up front for every row.
   ================================================== */

const ExpandedOrderItems = ({ orderId }: { orderId: number }) => {
	const { data: items = [], isLoading } = useOrderDetail(orderId);
	const overrideMutation = useSetOrderItemReadyOverride(orderId);

	if (isLoading) {
		return <p className={styles.emptyState}>Loading items...</p>;
	}

	if (items.length === 0) {
		return <p className={styles.emptyState}>No items on this order.</p>;
	}

	return (
		<div className={styles.subList}>
			{items.map((item) => (
				<div key={item.orderItemId} className={styles.subRow}>
					<div className={styles.rowMain}>
						<span className={styles.rowCode}>
							{item.productName}: {item.quantityOrdered} pcs
						</span>
						<span className={styles.rowMeta}>Stock: {item.stockQuantity}</span>
					</div>

					<span className={item.isReady ? styles.readyBadge : styles.notReadyBadge}>
						{item.isReady ? "Ready" : "Not ready"}
					</span>

					{item.isReadyOverride !== null ? (
						<button
							type="button"
							className={styles.overrideResetButton}
							title="Clear manual override, go back to automatic"
							onClick={() => overrideMutation.mutate({ orderItemId: item.orderItemId, value: null })}
						>
							<RotateCcw size={13} />
							Auto
						</button>
					) : (
						<button
							type="button"
							className={styles.overrideToggleButton}
							title="Manually mark ready regardless of stock allocation"
							onClick={() =>
								overrideMutation.mutate({ orderItemId: item.orderItemId, value: !item.computedIsReady })
							}
						>
							Override
						</button>
					)}
				</div>
			))}
		</div>
	);
};

/* ==================================================
   BY ORDER TAB
   ================================================== */

const ByOrderView = () => {
	const [statusFilter, setStatusFilter] = useState<TStatusFilter>("pending");
	const [page, setPage] = useState(1);
	const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

	const { data, isLoading } = useOrdersOverview({
		statuses: statusFilterToStatuses(statusFilter),
		page,
		itemsPerPage: 20
	});

	const updateStatusMutation = useUpdateOrderStatus();
	const convertMutation = useConvertOrderToTransaction();

	const toggleExpand = (orderId: number) => {
		setExpandedIds((current) => {
			const next = new Set(current);
			if (next.has(orderId)) {
				next.delete(orderId);
			} else {
				next.add(orderId);
			}
			return next;
		});
	};

	const orders = data?.orders ?? [];
	const totalPages = data?.totalPages ?? 1;

	const renderActions = (order: TOrderSummary) => {
		if (order.status === "pending") {
			return (
				<div className={styles.rowActions} onClick={(event) => event.stopPropagation()}>
					<Button
						variant="secondary"
						size="sm"
						type="button"
						onClick={() => updateStatusMutation.mutate({ orderId: order.orderId, status: "delivered" })}
					>
						Mark delivered
					</Button>
					<Button
						variant="danger"
						size="sm"
						type="button"
						onClick={() => updateStatusMutation.mutate({ orderId: order.orderId, status: "cancelled" })}
					>
						Cancel
					</Button>
				</div>
			);
		}

		if (order.status === "delivered") {
			return (
				<div className={styles.rowActions} onClick={(event) => event.stopPropagation()}>
					<Button
						variant="secondary"
						size="sm"
						type="button"
						disabled={convertMutation.isPending}
						onClick={() => convertMutation.mutate(order.orderId)}
					>
						Convert to transaction
					</Button>
				</div>
			);
		}

		return null;
	};

	return (
		<>
			<div className={styles.filterBar}>
				{STATUS_FILTERS.map((filter) => (
					<button
						key={filter}
						type="button"
						className={`${styles.filterChip} ${statusFilter === filter ? styles.filterChipActive : ""}`}
						onClick={() => {
							setStatusFilter(filter);
							setPage(1);
						}}
					>
						{statusLabel[filter]}
					</button>
				))}
			</div>

			<div className={styles.listHeader}>
				<h3 className={styles.cardTitle}>Orders</h3>
				<span className={styles.listCount}>{data ? `${data.totalOrders} results` : ""}</span>
			</div>

			<div className={styles.list}>
				{isLoading && <p className={styles.emptyState}>Loading orders...</p>}

				{!isLoading && orders.length === 0 && <p className={styles.emptyState}>No orders in this view.</p>}

				{!isLoading &&
					orders.map((order) => {
						const isExpanded = expandedIds.has(order.orderId);

						return (
							<Fragment key={order.orderId}>
								<div
									className={`${styles.row} ${isExpanded ? styles.rowSelected : ""}`}
									onClick={() => toggleExpand(order.orderId)}
								>
									<span className={styles.expandIcon}>
										{isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
									</span>

									<div className={styles.rowMain}>
										<span className={styles.rowCode}>{order.customerName}</span>
										<span className={styles.rowMeta}>Due {formatDate(order.dueDate)}</span>
									</div>

									<span
										className={
											order.readyCount >= order.totalCount
												? styles.readyBadge
												: styles.notReadyBadge
										}
									>
										{order.readyCount}/{order.totalCount}
									</span>

									<span className={`${styles.statusBadge} ${styles[`status_${order.status}`]}`}>
										{order.status}
									</span>

									{renderActions(order)}
								</div>

								{isExpanded && (
									<div className={styles.subListWrapper}>
										<ExpandedOrderItems orderId={order.orderId} />
									</div>
								)}
							</Fragment>
						);
					})}
			</div>

			{totalPages > 1 && (
				<div className={styles.pagination}>
					<span className={styles.paginationInfo}>
						Page {page} of {totalPages}
					</span>
					<div className={styles.paginationControls}>
						<Button
							variant="secondary"
							size="sm"
							type="button"
							onClick={() => setPage((current) => Math.max(1, current - 1))}
							disabled={page <= 1}
						>
							<ChevronIcon direction="left" />
						</Button>
						<div className={styles.currentPage}>
							{page} / {totalPages}
						</div>
						<Button
							variant="secondary"
							size="sm"
							type="button"
							onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
							disabled={page >= totalPages}
						>
							<ChevronIcon direction="right" />
						</Button>
					</div>
				</div>
			)}
		</>
	);
};

/* ==================================================
   BY PRODUCT TAB
   ================================================== */

const ByProductView = () => {
	const { data: products = [], isLoading } = useProductDemandOverview();

	return (
		<>
			<div className={styles.listHeader}>
				<h3 className={styles.cardTitle}>Product demand</h3>
				<span className={styles.listCount}>{products.length} products</span>
			</div>

			<div className={styles.list}>
				{isLoading && <p className={styles.emptyState}>Loading demand...</p>}

				{!isLoading && products.length === 0 && <p className={styles.emptyState}>No open demand right now.</p>}

				{!isLoading &&
					products.map((product) => (
						<div key={product.productId} className={styles.row}>
							<div className={styles.rowMain}>
								<span className={styles.rowCode}>{product.productName}</span>
								<span className={styles.rowMeta}>
									Stock {product.stockQuantity} · Demand {product.totalDemand} · Due{" "}
									{formatDate(product.nearestDueDate)}
								</span>
							</div>

							{product.shortfall > 0 ? (
								<span className={styles.shortfallBadge}>Short {product.shortfall}</span>
							) : (
								<span className={styles.readyBadge}>Covered</span>
							)}
						</div>
					))}
			</div>
		</>
	);
};

/* ==================================================
   SCREEN
   ================================================== */

const OrderManagement = () => {
	const [activeTab, setActiveTab] = useState<"order" | "product">("order");
	const navigate = useNavigate();

	return (
		<div id="order-management-layout" className={`page ${styles.pageLayout}`}>
			<div className={styles.headerRow}>
				<div className={styles.tabs}>
					<button
						type="button"
						className={`${styles.tabButton} ${activeTab === "order" ? styles.tabButtonActive : ""}`}
						onClick={() => setActiveTab("order")}
					>
						By order
					</button>
					<button
						type="button"
						className={`${styles.tabButton} ${activeTab === "product" ? styles.tabButtonActive : ""}`}
						onClick={() => setActiveTab("product")}
					>
						By product
					</button>
				</div>

				<button type="button" className={styles.newOrderButton} onClick={() => navigate(NEW_ORDER_ROUTE)}>
					<Plus size={16} />
					<span>New order</span>
				</button>
			</div>

			<section className={styles.listCard}>{activeTab === "order" ? <ByOrderView /> : <ByProductView />}</section>
		</div>
	);
};

export default OrderManagement;
