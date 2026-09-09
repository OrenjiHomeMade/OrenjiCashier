// IMPORT STYLE
import style from "./Ordering.module.css";

// IMPORT HOOKS
import { CartProvider, useCart } from "react-use-cart";

// IMPORT COMPONENT
import ProductSection from "../../Component/ProductSection/ProductSection";
import OrderMaker from "./OrderMaker/OrderMaker";
import LoadingModal from "../../Component/LoadingModal/LoadingModal";

// IMPORT HOOKS (data)
import { useCreateOrder } from "../../Hooks/useOrdering";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

// IMPORT SERVICES
import { getProductCategories } from "../../Services/supabase/productService";

// IMPORT TYPES
import type { TCreateOrderInput } from "../../Types/order";

// Distinct storage id so react-use-cart never collides with the Cashier
// cart's persisted state, even though both providers can be mounted
// at different times in the same app.
const ORDER_CART_ID = "order-builder";

const OrderingContent = () => {
	const { emptyCart, addItem } = useCart();
	const [orderMakerIsOpenOnPhone, setOrderMakerIsOpenOnPhone] = useState(false);

	const createOrderMutation = useCreateOrder();

	const { data: productsCategory = [] } = useQuery({
		queryKey: ["category"],
		queryFn: () => getProductCategories()
	});

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

export type OrderingProps = {
	// Left as a callback rather than assuming a router — wire this to
	// whatever navigation Mufti's app uses to get back to the order
	// management table.
	onBack?: () => void;
};

const Ordering = ({ onBack }: OrderingProps) => {
	return (
		<div id="ordering-layout" className={`page ${style.orderingLayout}`}>
			<div className={style.orderingHeader}>
				<button
					type="button"
					className={style.backButton}
					onClick={() => (onBack ? onBack() : window.history.back())}
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
