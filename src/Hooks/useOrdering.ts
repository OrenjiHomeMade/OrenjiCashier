// IMPORT HOOKS
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// IMPORT SERVICES
import {
	createOrder,
	getOrdersOverview,
	getOrderDetail,
	getProductDemandOverview,
	setOrderItemReadyOverride,
	updateOrderStatus,
	convertOrderToTransaction
} from "../Services/supabase/orderServices.ts";

// IMPORT TYPES
import type { TOrderStatus, TCreateOrderInput, TOrdersFilter } from "../Types/order";
import AuthContext from "../Component/Context/AuthProvider.tsx";
import { useContext } from "react";

const ORDERS_KEY = "orders";
const ORDER_DETAIL_KEY = "order-detail";
const PRODUCT_DEMAND_KEY = "product-demand";

/* =========================================================
   QUERIES
   ========================================================= */

export const useOrdersOverview = (filter: TOrdersFilter = {}) => {
	const { statuses = ["pending"], page = 1, itemsPerPage = 20 } = filter;

	return useQuery({
		queryKey: [ORDERS_KEY, statuses, page, itemsPerPage],
		queryFn: () => getOrdersOverview({ statuses, page, itemsPerPage })
	});
};

export const useOrderDetail = (orderId: number | null) => {
	return useQuery({
		queryKey: [ORDER_DETAIL_KEY, orderId],
		queryFn: () => getOrderDetail(orderId as number),
		enabled: orderId !== null
	});
};

export const useProductDemandOverview = () => {
	return useQuery({
		queryKey: [PRODUCT_DEMAND_KEY],
		queryFn: () => getProductDemandOverview()
	});
};

/* =========================================================
   MUTATIONS
   ========================================================= */

export const useCreateOrder = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (order: TCreateOrderInput) => createOrder(order),
		onSuccess: () => {
			// FIFO readiness allocation shifts across every open order for a
			// product once a new one is created, so a targeted setQueryData
			// isn't safe here — invalidate rather than patch the cache.
			queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
			queryClient.invalidateQueries({ queryKey: [PRODUCT_DEMAND_KEY] });
		}
	});
};

export const useSetOrderItemReadyOverride = (orderId: number) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ orderItemId, value }: { orderItemId: number; value: boolean | null }) =>
			setOrderItemReadyOverride(orderItemId, value),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [ORDER_DETAIL_KEY, orderId] });
			queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
			queryClient.invalidateQueries({ queryKey: [PRODUCT_DEMAND_KEY] });
		}
	});
};

export const useUpdateOrderStatus = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			orderId,
			status
		}: {
			orderId: number;
			status: Extract<TOrderStatus, "delivered" | "cancelled">;
		}) => updateOrderStatus(orderId, status),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
		}
	});
};

export const useConvertOrderToTransaction = () => {
	const queryClient = useQueryClient();
	const { user } = useContext(AuthContext);

	const cashierName = user?.username || "SYSTEM";

	return useMutation({
		mutationFn: (orderId: number) =>
			convertOrderToTransaction({ orderId: orderId, cashier: cashierName, paymentMethod: "QRIS" }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
			queryClient.invalidateQueries({ queryKey: ["products"] });
		}
	});
};
