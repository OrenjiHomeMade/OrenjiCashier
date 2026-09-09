// IMPORT STYLE
import style from "./Ordering.module.css";

// IMPORT HOOKS
import { CartProvider, useCart } from "react-use-cart";
import { useLocation, useNavigate } from "react-router-dom";

// IMPORT COMPONENT
import ProductSection from "../../Component/ProductSection/ProductSection";
import OrderMaker from "./OrderMaker/OrderMaker";
import LoadingModal from "../../Component/LoadingModal/LoadingModal";

// IMPORT HOOKS (data)
import { useCreateOrder } from "../../Hooks/useOrdering";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

// IMPORT SERVICES
import { getProductCategories } from "../../Services/supabase/productService";

// IMPORT TYPES
import type { TCreateOrderInput, TOrderSeedItem } from "../../Types/order";

// Same route OrderManagement.tsx is mounted on — kept in sync with
// ORDER_MANAGEMENT_ROUTE there. Explicit target rather than
// navigate(-1), since /ordering can also be reached directly (e.g. a
// header link), where "back" wouldn't reliably mean "management".
const ORDER_MANAGEMENT_ROUTE = "/orders";

// Distinct storage id so react-use-cart never collides with the Cashier
// cart's persisted state, even though both providers can be mounted
// at different times in the same app.
const ORDER_CART_ID = "order-builder";

const OrderingContent = () => {
	const { emptyCart, addItem } = useCart();
	const [orderMakerIsOpenOnPhone, setOrderMakerIsOpenOnPhone] = useState(false);

	const location = useLocation();
	const navigate = useNavigate();
	const hasSeededRef = useRef(false);

	const createOrderMutation = useCreateOrder();

	const { data: productsCategory = [] } = useQuery({
		queryKey: ["category"],
		queryFn: () => getProductCategories()
	});

	/*
	 * Consumes a cart handed off from Cashier's "Jadikan Pesanan" button
	 * (see Cashier.tsx), fed in via router state rather than react-use-cart's
	 * own persistence. Runs once on mount, then clears the route state so
	 * refreshing or revisiting this page doesn't re-seed the cart.
	 */
	useEffect(() => {
		if (hasSeededRef.current) return;

		const seedItems = (location.state as { seedItems?: TOrderSeedItem[] } | null)?.seedItems;

		if (seedItems && seedItems.length > 0) {
			seedItems.forEach((seedItem) => {
				addItem(
					{
						id: seedItem.id,
						price: seedItem.price,
						name: seedItem.name,
						productImageUrl: seedItem.productImageUrl,
						costLabor: seedItem.costLabor,
						costIngredient: seedItem.costIngredient,
						costUtilities: seedItem.costUtilities,
						costPackaging: seedItem.costPackaging
					},
					seedItem.quantity
				);
			});

			navigate(location.pathname, { replace: true, state: null });
		}

		hasSeededRef.current = true;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleCreateOrder = (order: TCreateOrderInput) => {
		createOrderMutation.mutate(order, {
			onSuccess: () => {
				emptyCart();
				setOrderMakerIsOpenOnPhone(false);
			}
		});
	};

	return (
		<>
			<ProductSection
				mode="Order"
				categories={productsCategory}
				onItemAdd={(product) => {
					const item = {
						id: product.id,
						price: product.price,
						quantity: product.quantity,
						name: product.productName,
						productImageUrl: product.productImageUrl,
						costLabor: product.costLabor,
						costIngredient: product.costIngredient,
						costUtilities: product.costUtilities,
						costPackaging: product.costPackaging
					};
					addItem(item, 1);
				}}
			/>

			<OrderMaker
				onCreateOrder={handleCreateOrder}
				onHeaderClick={() => setOrderMakerIsOpenOnPhone((current) => !current)}
				headerIsOpen={orderMakerIsOpenOnPhone}
				isSubmitting={createOrderMutation.isPending}
			/>

			<LoadingModal isOpen={createOrderMutation.isPending}>Pesanan sedang diproses...</LoadingModal>
		</>
	);
};

const Ordering = () => {
	const navigate = useNavigate();

	return (
		<div id="ordering-layout" className={`page ${style.orderingLayout}`}>
			<div className={style.orderingHeader}>
				<button
					type="button"
					className={style.backButton}
					onClick={() => navigate(ORDER_MANAGEMENT_ROUTE)}
					aria-label="Kembali"
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</button>

				<h1>Pesanan Baru</h1>
			</div>

			<div className={style.orderingBody}>
				<CartProvider id={ORDER_CART_ID}>
					<OrderingContent />
				</CartProvider>
			</div>
		</div>
	);
};

export default Ordering;
