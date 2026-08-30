// IMPORT STYLE
import style from "./Cashier.module.css";

// IMPORT HOOKS
import { CartProvider, useCart } from "react-use-cart";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

// IMPORT COMPONENT
import ProductSection from "../../Component/ProductSection/ProductSection";
import CartSection from "./CartSection/CartSection";
import LoadingModal from "../../Component/LoadingModal/LoadingModal";

// IMPORT SERVICES
import { createTransaction } from "../../Services/supabase/transactionService";
import { getProductCategories } from "../../Services/supabase/productService";

const CashierContent = () => {
	const { emptyCart, addItem } = useCart();
	const [cartIsOpenOnPhone, setCartIsOpenOnPhone] = useState(false);
	const queryClient = useQueryClient();

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
				queryKey: ["products"]
			});
		}
	});

	const { data: productsCategory = [] } = useQuery({
		queryKey: ["category"],
		queryFn: () => getProductCategories()
	});

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
