// IMPORT STYLE
import style from "./OrderManagement.module.css";

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

const ExpandedOrderItems = ({ orderId }: { orderId: number }) => {
	const { data: items = [], isLoading } = useOrderDetail(orderId);
	const overrideMutation = useSetOrderItemReadyOverride(orderId);

	if (isLoading) {
		return <div className={style.detailRow}>Loading items...</div>;
	}

	if (items.length === 0) {
		return <div className={style.detailRow}>No items on this order.</div>;
	}

	return (
		<table className={style.detailTable}>
			<thead>
				<tr>
					<th>Product</th>
					<th>Qty</th>
					<th>Stock</th>
					<th>Ready</th>
				</tr>
			</thead>
			<tbody>
				{items.map((item) => (
					<tr key={item.orderItemId}>
						<td>{item.productName}</td>
						<td>{item.quantityOrdered}</td>
						<td>{item.stockQuantity}</td>
						<td>
							<span className={item.isReady ? style.readyBadge : style.notReadyBadge}>
								{item.isReady ? "Ready" : "Not ready"}
							</span>

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
									Override
								</button>
							)}
						</td>
					</tr>
				))}
			</tbody>
		</table>
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
					<button
						type="button"
						className={style.actionButtonDanger}
						onClick={() => updateStatusMutation.mutate({ orderId: order.orderId, status: "cancelled" })}
					>
						Cancel
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
				<table className={style.orderTable}>
					<thead>
						<tr>
							<th></th>
							<th>Customer</th>
							<th>Due date</th>
							<th>Ready</th>
							<th>Status</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{orders.map((order) => {
							const isExpanded = expandedIds.has(order.orderId);

							return (
								<Fragment key={order.orderId}>
									<tr className={style.orderRow} onClick={() => toggleExpand(order.orderId)}>
										<td className={style.expandCell}>
											{isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
										</td>
										<td>{order.customerName}</td>
										<td className={style.mutedCell}>{formatDate(order.dueDate)}</td>
										<td>
											<span
												className={
													order.readyCount >= order.totalCount
														? style.readyBadge
														: style.partialBadge
												}
											>
												{order.readyCount}/{order.totalCount}
											</span>
										</td>
										<td>
											<span className={`${style.statusBadge} ${style[`status_${order.status}`]}`}>
												{order.status}
											</span>
										</td>
										<td className={style.actionsCell} onClick={(event) => event.stopPropagation()}>
											{renderActions(order)}
										</td>
									</tr>

									{isExpanded && (
										<tr className={style.detailRowWrapper}>
											<td></td>
											<td colSpan={5}>
												<ExpandedOrderItems orderId={order.orderId} />
											</td>
										</tr>
									)}
								</Fragment>
							);
						})}
					</tbody>
				</table>
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
		<table className={style.orderTable}>
			<thead>
				<tr>
					<th>Product</th>
					<th>Stock</th>
					<th>Demand</th>
					<th>Shortfall</th>
					<th>Nearest due</th>
				</tr>
			</thead>
			<tbody>
				{products.map((product) => (
					<tr key={product.productId}>
						<td>{product.productName}</td>
						<td>{product.stockQuantity}</td>
						<td>{product.totalDemand}</td>
						<td>
							{product.shortfall > 0 ? (
								<span className={style.shortfallBadge}>{product.shortfall}</span>
							) : (
								<span className={style.mutedCell}>0</span>
							)}
						</td>
						<td className={style.mutedCell}>{formatDate(product.nearestDueDate)}</td>
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
