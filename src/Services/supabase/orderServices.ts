// IMPORT TYPES
import type {
	TOrderStatus,
	TCreateOrderInput,
	TOrderSummary,
	TOrdersOverviewResult,
	TOrdersFilter,
	TOrderItemDetail,
	TProductDemand,
	DTOrderSummaryRow,
	DTOrderItemDetailRow,
	DTProductDemandRow
} from "../../Types/order";
import type { TPaymentMethod } from "../../Types/transaction";
import { generateTransactionCode, getLocalTimestamp } from "../../Utilities/NumberFormater";

// IMPORT LIBRARY
import { supabase } from "./client";
import { toast } from "react-toastify";

const EMPTY_ORDERS_RESULT: TOrdersOverviewResult = {
	orders: [],
	totalPages: 0,
	totalOrders: 0
};

/* =========================================================
   CREATE ORDER
   ========================================================= */

export const createOrder = async (order: TCreateOrderInput): Promise<number> => {
	const { data, error } = await supabase.rpc("create_order_with_items", {
		p_customer_name: order.customerName,
		p_customer_address: order.customerAddress ?? undefined,
		p_due_date: order.dueDate,
		p_notes: order.notes ?? undefined,
		p_items: order.items.map((item) => ({
			product_id: item.productId,
			quantity_ordered: item.quantityOrdered,
			unit_price: item.unitPrice,
			unit_cost_labor: item.unitCostLabor,
			unit_cost_ingredient: item.unitCostIngredient,
			unit_cost_utilities: item.unitCostUtilities,
			unit_cost_packaging: item.unitCostPackaging
		}))
	});

	if (error) {
		toast.error(`Failed creating order: ${error.message}`);
		console.error(error.message);
		throw error;
	}

	toast.success("Order created");

	return data as number;
};

/* =========================================================
   ORDERS OVERVIEW — "by order" table
   ========================================================= */

export const getOrdersOverview = async ({
	statuses = ["pending"],
	page = 1,
	itemsPerPage = 20
}: TOrdersFilter = {}): Promise<TOrdersOverviewResult> => {
	const { data, error } = await supabase.rpc("get_orders_overview", {
		p_statuses: statuses,
		p_page: page,
		p_items_per_page: itemsPerPage
	});

	if (error) {
		toast.error(`Failed loading orders: ${error.message}`);
		console.error(error.message);
		return EMPTY_ORDERS_RESULT;
	}

	const rows = (data ?? []) as DTOrderSummaryRow[];

	const orders: TOrderSummary[] = rows.map((row) => ({
		orderId: Number(row.order_id),
		customerName: row.customer_name,
		customerAddress: row.customer_address,
		dueDate: row.due_date,
		status: row.status,
		notes: row.notes,
		createdAt: row.created_at,
		itemCount: Number(row.item_count),
		readyCount: Number(row.ready_count),
		totalCount: Number(row.total_count)
	}));

	// NOTE: total_pages / total_orders ride along on each row, so an empty
	// page (valid page number, zero matching rows after the status filter)
	// loses the totals entirely. Falls back to 0 — fine for "no results",
	// but flag this if pagination controls ever need the real count on an
	// empty page.
	return {
		orders,
		totalPages: rows[0] ? Number(rows[0].total_pages) : 0,
		totalOrders: rows[0] ? Number(rows[0].total_orders) : 0
	};
};

/* =========================================================
   ORDER DETAIL — expanded row / drawer
   ========================================================= */

export const getOrderDetail = async (orderId: number): Promise<TOrderItemDetail[]> => {
	const { data, error } = await supabase.rpc("get_order_detail", {
		p_order_id: orderId
	});

	if (error) {
		toast.error(`Failed loading order detail: ${error.message}`);
		console.error(error.message);
		return [];
	}

	const rows = (data ?? []) as DTOrderItemDetailRow[];

	return rows.map((row) => ({
		orderItemId: Number(row.order_item_id),
		productId: Number(row.product_id),
		productName: row.product_name,
		quantityOrdered: row.quantity_ordered,
		stockQuantity: row.stock_quantity,
		isReadyOverride: row.is_ready_override,
		computedIsReady: row.computed_is_ready,
		isReady: row.is_ready,
		unitPrice: row.unit_price
	}));
};

/* =========================================================
   PRODUCT DEMAND — "by product" view
   ========================================================= */

export const getProductDemandOverview = async (): Promise<TProductDemand[]> => {
	const { data, error } = await supabase.rpc("get_product_demand_overview");

	if (error) {
		toast.error(`Failed loading product demand: ${error.message}`);
		console.error(error.message);
		return [];
	}

	const rows = (data ?? []) as DTProductDemandRow[];

	return rows.map((row) => ({
		productId: Number(row.product_id),
		productName: row.product_name,
		stockQuantity: row.stock_quantity,
		totalDemand: Number(row.total_demand),
		nearestDueDate: row.nearest_due_date,
		shortfall: Number(row.shortfall)
	}));
};

/* =========================================================
   READINESS OVERRIDE
   ========================================================= */

export const setOrderItemReadyOverride = async (orderItemId: number, value: boolean | null): Promise<void> => {
	const { error } = await supabase.rpc("set_order_item_ready_override", {
		p_order_item_id: orderItemId,
		p_value: value || false
	});

	if (error) {
		toast.error(`Failed updating readiness: ${error.message}`);
		console.error(error.message);
		throw error;
	}
};

/* =========================================================
   ORDER STATUS
   ========================================================= */

export const updateOrderStatus = async (
	orderId: number,
	status: Extract<TOrderStatus, "delivered" | "cancelled">
): Promise<void> => {
	const { error } = await supabase.rpc("update_order_status", {
		p_order_id: orderId,
		p_status: status
	});

	if (error) {
		toast.error(`Failed updating order status: ${error.message}`);
		console.error(error.message);
		throw error;
	}

	toast.success(`Order marked as ${status}`);
};

/* =========================================================
   CONVERT TO TRANSACTION
   ========================================================= */

/**
 * ASSUMPTION: calls an RPC `convert_order_to_transaction(p_order_id)`
 * returning the new transaction_id, per the atomic-RPC approach we
 * discussed earlier. It wasn't in the order.sql scratch you shared —
 * rename/adjust the params here if the implemented signature differs.
 */
export const convertOrderToTransaction = async ({
	orderId,
	cashier,
	paymentMethod
}: {
	orderId: number;
	cashier: string;
	paymentMethod: TPaymentMethod;
}): Promise<number> => {
	const { data, error } = await supabase.rpc("convert_order_to_transaction", {
		p_order_id: orderId,
		p_transaction_time: getLocalTimestamp(new Date()),
		p_transaction_code: generateTransactionCode(cashier, new Date()),
		p_cashier: cashier,
		p_payment_method: paymentMethod
	});

	if (error) {
		toast.error(`Failed converting order to transaction: ${error.message}`);
		console.error(error.message);
		throw error;
	}

	toast.success("Order converted to transaction");

	return data as number;
};
