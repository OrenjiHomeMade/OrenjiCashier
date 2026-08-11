// IMPORT STYLE
import style from "./Cashier.module.css";

// IMPORT HOOKS
import { CartProvider, useCart } from "react-use-cart";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

// IMPORT COMPONENT
import ProductSection from "../../Component/ProductSection/ProductSection";
import CartSection from "./CartSection/CartSection";
import LoadingModal from "../../Component/LoadingModal/LoadingModal";

// IMPORT SERVICES
import { createTransaction } from "../../Services/supabase/transactionService";

const CashierContent = () => {
	const { emptyCart } = useCart();
	const [cartIsOpenOnPhone, setCartIsOpenOnPhone] = useState(false);

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
		}
	});
	return (
		<>
			<ProductSection />
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
