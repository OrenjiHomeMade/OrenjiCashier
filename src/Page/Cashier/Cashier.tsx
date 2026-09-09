// IMPORT STYLE
import style from "./Cashier.module.css";

// IMPORT HOOKS
import { CartProvider, useCart } from "react-use-cart";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// IMPORT COMPONENT
import ProductSection from "../../Component/ProductSection/ProductSection";
import CartSection from "./CartSection/CartSection";
import LoadingModal from "../../Component/LoadingModal/LoadingModal";

// IMPORT SERVICES
import { createTransaction } from "../../Services/supabase/transactionService";
import { getProductCategories } from "../../Services/supabase/productService";

// IMPORT TYPES
import type { TOrderSeedItem } from "../../Types/order";

// ASSUMPTION: adjust to whatever path your router actually mounts
// the Ordering screen on.
const ORDERING_ROUTE = "/ordering";

const CashierContent = () => {
	const { emptyCart, addItem, items: cartItems } = useCart();
	const [cartIsOpenOnPhone, setCartIsOpenOnPhone] = useState(false);
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const handleCartHeaderClick = () => {
		if (cartIsOpenOnPhone) {
			setCartIsOpenOnPhone(false);
		} else {
			setCartIsOpenOnPhone(true);
		}
	};

	const createTransactionMutation = useMutation({
		mutationFn: createTransaction,
		onSuccess: () => {
			emptyCart();
			setCartIsOpenOnPhone(false);
			queryClient.invalidateQueries({
				queryKey: ["products_in_section"]
			});
		}
	});

	const { data: productsCategory = [] } = useQuery({
		queryKey: ["category"],
		queryFn: () => getProductCategories()
	});

	/*
	 * Hands the current cart off to the Ordering screen as a plain,
	 * serializable payload via router state — NOT through
	 * react-use-cart's own persistence, since that would mean relying
	 * on its internal localStorage format across two isolated
	 * CartProviders. The Ordering screen reads this once on mount
	 * and seeds its own (separate) order cart from it.
	 */
	const handleConvertToOrder = () => {
		if (cartItems.length === 0) return;

		const seedItems: TOrderSeedItem[] = cartItems.map((item) => ({
			id: item.id,
			price: item.price,
			quantity: item.quantity ?? 1,
			name: item.name,
			productImageUrl: item.productImageUrl,
			costLabor: item.costLabor,
			costIngredient: item.costIngredient,
			costUtilities: item.costUtilities,
			costPackaging: item.costPackaging
		}));

		emptyCart();
		setCartIsOpenOnPhone(false);

		navigate(ORDERING_ROUTE, { state: { seedItems } });
	};

	return (
		<>
			<ProductSection
				mode="Cashier"
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
			<CartSection
				onExecutePayment={(transaction) => createTransactionMutation.mutate(transaction)}
				onConvertToOrder={handleConvertToOrder}
				onCartHeaderClick={handleCartHeaderClick}
				cartHeaderIsOpen={cartIsOpenOnPhone}
			/>
			<LoadingModal isOpen={createTransactionMutation.isPending}>Transaksi sedang diproses...</LoadingModal>
		</>
	);
};

const Cashier = () => {
	return (
		<div id="cashier-layout" className={`page ${style.cashierLayout}`}>
			<CartProvider>
				<CashierContent />
			</CartProvider>
		</div>
	);
};

export default Cashier;
