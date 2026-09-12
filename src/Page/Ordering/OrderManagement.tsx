// IMPORT STYLE
import style from "./OrderManagement.module.css";

// IMPORT HOOKS
import { useState } from "react";
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
import { formatShortDate } from "../../Utilities/NumberFormater";

// IMPORT TYPES
import type { TOrderStatus, TOrderSummary } from "../../Types/order";

// IMPORT ICONS (lucide-react is already a project dependency — see ProductItem.tsx)
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

const ExpandedOrderItems = ({
	orderId,
	onCancel
}: {
	orderId: number;
	onCancel?: () => void;
}) => {
	const { data: items = [], isLoading } = useOrderDetail(orderId);
	const overrideMutation = useSetOrderItemReadyOverride(orderId);

	if (isLoading) {
		return <div className={style.detailRow}>Loading items...</div>;
	}

	if (items.length === 0) {
		return <div className={style.detailRow}>No items on this order.</div>;
	}

	return (
		<div className={style.itemsPanel}>
			<div className={style.itemsHeading}>Order items</div>
			<div className={style.itemsList}>
				{items.map((item) => (
					<div className={style.itemRow} key={item.orderItemId}>
						<div className={style.itemInfo}>
							<div className={style.itemName}>{item.productName}</div>
							<div className={style.itemMeta}>
								Qty {item.quantityOrdered} · Stock {item.stockQuantity}
							</div>
						</div>
						<div className={style.itemSide}>
							<span className={item.isReady ? style.readyBadge : style.notReadyBadge}>
								{item.isReady ? "Ready" : "Not ready"}
							</span>
							<button type="button" className={style.addButton} aria-label={`Add ${item.productName}`}>
								<Plus size={15} />
							</button>
							{item.isReadyOverride !== null ? (
								<button
									type="button"
									className={style.overrideResetButton}
									title="Clear manual override, go back to automatic"
									onClick={() =>
										overrideMutation.mutate({ orderItemId: item.orderItemId, value: null })
									}
								>
									<RotateCcw size={13} />
									Auto
								</button>
							) : (
								<button
									type="button"
									className={style.overrideToggleButton}
									title="Manually mark ready regardless of stock allocation"
									onClick={() =>
										overrideMutation.mutate({
											orderItemId: item.orderItemId,
											value: !item.computedIsReady
										})
									}
								>
									Override readiness
								</button>
							)}
						</div>
					</div>
				))}
			</div>
			{onCancel && (
				<button type="button" className={style.cancelButton} onClick={onCancel}>
					Cancel order
				</button>
			)}
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

	const renderActions = (order: TOrderSummary) => {
		if (order.status === "pending") {
			return (
				<div className={style.actionButtons}>
					<button
						type="button"
						className={style.actionButtonPrimary}
						onClick={() => updateStatusMutation.mutate({ orderId: order.orderId, status: "delivered" })}
					>
						Mark delivered
					</button>
				</div>
			);
		}

		if (order.status === "delivered") {
			return (
				<div className={style.actionButtons}>
					<button
						type="button"
						className={style.actionButtonPrimary}
						disabled={convertMutation.isPending}
						onClick={() => convertMutation.mutate(order.orderId)}
					>
						Convert to transaction
					</button>
				</div>
			);
		}

		return null;
	};

	return (
		<div>
			<div className={style.filterRow}>
				{STATUS_FILTERS.map((filter) => (
					<button
						key={filter}
						type="button"
						className={`${style.filterChip} ${statusFilter === filter ? style.filterChipActive : ""}`}
						onClick={() => {
							setStatusFilter(filter);
							setPage(1);
						}}
					>
						{statusLabel[filter]}
					</button>
				))}
			</div>

			{isLoading && <div className={style.emptyState}>Loading orders...</div>}

			{!isLoading && orders.length === 0 && <div className={style.emptyState}>No orders in this view.</div>}

			{!isLoading && orders.length > 0 && (
				<>
					<div className={style.desktopOrderHeader} aria-hidden="true">
						<span></span>
						<span>Customer</span>
						<span>Due date</span>
						<span>Ready</span>
						<span>Status</span>
						<span>Actions</span>
					</div>
					<div className={style.orderList}>
						{orders.map((order) => {
							const isExpanded = expandedIds.has(order.orderId);

							return (
								<article className={style.orderCard} key={order.orderId}>
								<button
									type="button"
									className={style.orderSummary}
									onClick={() => toggleExpand(order.orderId)}
								>
									<span className={style.expandCell}>
										{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
									</span>
									<span className={style.orderMainInfo}>
										<span className={style.customerName}>{order.customerName}</span>
										<span className={style.orderMeta}>
											<span>Due {formatShortDate(order.dueDate)}</span>
											<span className={style.readyCount}>
												Ready {order.readyCount} / {order.totalCount}
											</span>
										</span>
									</span>
									<span className={`${style.statusBadge} ${style[`status_${order.status}`]}`}>
										{order.status}
									</span>
								</button>

								<div className={style.summaryActions} onClick={(event) => event.stopPropagation()}>
									<span className={style.productCount}>{order.totalCount} products</span>
									{renderActions(order)}
								</div>

								{isExpanded && (
									<ExpandedOrderItems
										orderId={order.orderId}
										onCancel={
											order.status === "pending"
												? () =>
														updateStatusMutation.mutate({
															orderId: order.orderId,
															status: "cancelled"
														})
												: undefined
										}
									/>
								)}
								</article>
							);
						})}
					</div>
				</>
			)}

			{data && data.totalPages > 1 && (
				<div className={style.pagination}>
					<button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
						Previous
					</button>
					<span>
						Page {page} of {data.totalPages}
					</span>
					<button
						type="button"
						disabled={page >= data.totalPages}
						onClick={() => setPage((current) => current + 1)}
					>
						Next
					</button>
				</div>
			)}
		</div>
	);
};

/* ==================================================
   BY PRODUCT TAB
   ================================================== */

const ByProductView = () => {
	const { data: products = [], isLoading } = useProductDemandOverview();

	if (isLoading) {
		return <div className={style.emptyState}>Loading demand...</div>;
	}

	if (products.length === 0) {
		return <div className={style.emptyState}>No open demand right now.</div>;
	}

	return (
		<table className={`${style.orderTable} ${style.productTable}`}>
			<thead>
				<tr>
					<th>Product</th>
					<th>Stock</th>
					<th>Demand</th>
					<th>Shortfall</th>
					<th>Nearest due</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{products.map((product) => (
					<tr key={product.productId}>
						<td className={style.productNameCell}>{product.productName}</td>
						<td>{product.stockQuantity}</td>
						<td>{product.totalDemand}</td>
						<td>
							{product.shortfall > 0 ? (
								<span className={style.shortfallBadge}>{product.shortfall}</span>
							) : (
								<span className={style.mutedCell}>0</span>
							)}
						</td>
						<td className={style.mutedCell}>{formatShortDate(product.nearestDueDate)}</td>
						<td className={style.addActionCell}>
							<button type="button" className={style.addButton} aria-label={`Add ${product.productName}`}>
								<Plus size={15} />
							</button>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
};

/* ==================================================
   SCREEN
   ================================================== */

const OrderManagement = () => {
	const [activeTab, setActiveTab] = useState<"order" | "product">("order");
	const navigate = useNavigate();

	return (
		<div id="order-management-layout" className={`page ${style.orderManagementLayout}`}>
			<div className={style.headerRow}>
				<div className={style.tabs}>
					<button
						type="button"
						className={`${style.tabButton} ${activeTab === "order" ? style.tabButtonActive : ""}`}
						onClick={() => setActiveTab("order")}
					>
						By order
					</button>
					<button
						type="button"
						className={`${style.tabButton} ${activeTab === "product" ? style.tabButtonActive : ""}`}
						onClick={() => setActiveTab("product")}
					>
						By product
					</button>
				</div>

				<button type="button" className={style.newOrderButton} onClick={() => navigate(NEW_ORDER_ROUTE)}>
					<Plus size={16} />
					<span>New order</span>
				</button>
			</div>

			<section className={style.listCard}>{activeTab === "order" ? <ByOrderView /> : <ByProductView />}</section>
		</div>
	);
};

export default OrderManagement;
