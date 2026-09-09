/* =========================================================
   COMMON / ENUM TYPES
   ========================================================= */

export type TOrderStatus = "pending" | "delivered" | "paid" | "cancelled";

/* =========================================================
   SEED ITEM — handoff payload from Cashier's cart to Ordering
   (passed as router state, then fed through react-use-cart's
   own addItem on the Ordering side; never touches the RPC layer)
   ========================================================= */

export type TOrderSeedItem = {
	id: string;
	price: number;
	quantity: number;
	name: string;
	productImageUrl?: string;
	costLabor?: number;
	costIngredient?: number;
	costUtilities?: number;
	costPackaging?: number;
};

/* =========================================================
   ORDER ITEM — INPUT (creating an order)
   ========================================================= */

export type TOrderItemInput = {
	productId: number;
	quantityOrdered: number;
	unitPrice: number;
	unitCostLabor: number;
	unitCostIngredient: number;
	unitCostUtilities: number;
	unitCostPackaging: number;
};

export type TCreateOrderInput = {
	customerName: string;
	customerAddress?: string;
	dueDate: string;
	notes?: string;
	items: TOrderItemInput[];
};

/* =========================================================
   ORDER SUMMARY — "by order" table row (get_orders_overview)
   ========================================================= */

export type TOrderSummary = {
	orderId: number;
	customerName: string;
	customerAddress: string | null;
	dueDate: string;
	status: TOrderStatus;
	notes: string | null;
	createdAt: string;
	itemCount: number;
	readyCount: number;
	totalCount: number;
};

export type TOrdersOverviewResult = {
	orders: TOrderSummary[];
	totalPages: number;
	totalOrders: number;
};

export type TOrdersFilter = {
	statuses?: TOrderStatus[];
	page?: number;
	itemsPerPage?: number;
};

/* =========================================================
   ORDER ITEM DETAIL — expanded row (get_order_detail)
   ========================================================= */

export type TOrderItemDetail = {
	orderItemId: number;
	productId: number;
	productName: string;
	quantityOrdered: number;
	stockQuantity: number;
	isReadyOverride: boolean | null;
	computedIsReady: boolean;
	isReady: boolean;
	unitPrice: number;
};

/* =========================================================
   PRODUCT DEMAND — "by product" view (get_product_demand_overview)
   ========================================================= */

export type TProductDemand = {
	productId: number;
	productName: string;
	stockQuantity: number;
	totalDemand: number;
	nearestDueDate: string;
	shortfall: number;
};

/* =========================================================
   RAW (snake_case) RPC ROW SHAPES
   Mapped into the domain types above inside orderService.ts —
   nothing outside that file should ever import these.
   ========================================================= */

export type DTOrderSummaryRow = {
	order_id: number;
	customer_name: string;
	customer_address: string | null;
	due_date: string;
	status: TOrderStatus;
	notes: string | null;
	created_at: string;
	item_count: number;
	ready_count: number;
	total_count: number;
	order_detail: unknown;
	total_pages: number;
	total_orders: number;
};

export type DTOrderItemDetailRow = {
	order_item_id: number;
	product_id: number;
	product_name: string;
	quantity_ordered: number;
	stock_quantity: number;
	is_ready_override: boolean | null;
	computed_is_ready: boolean;
	is_ready: boolean;
	unit_price: number;
};

export type DTProductDemandRow = {
	product_id: number;
	product_name: string;
	stock_quantity: number;
	total_demand: number;
	nearest_due_date: string;
	shortfall: number;
};
