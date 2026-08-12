// IMPORT STYLES
import style from "./CartSection.module.css";

// IMPORT HOOKS
import { useCart } from "react-use-cart";
import { useContext, useState } from "react";

// IMPORT COMPONENT
import CartIcon from "../../../Component/MediaComponent/CartIcon";
import TrashIcon from "../../../Component/MediaComponent/TrashIcon";
import BankNoteDownIcon from "../../../Component/MediaComponent/BankNoteDownIcon";
import CartItem from "../../../Component/CartItem/CartItem";

// IMPORT UTILITIES
import { generateTransactionCode, getLocalTimestamp, rupiahFormater } from "../../../Utilities/NumberFormater";
import type { TCreateTransactionInput } from "../../../Services/supabase/transactionService";
import AuthContext from "../../../Component/Context/AuthProvider";

export type CartProps = {
	onExecutePayment: (entry: TCreateTransactionInput) => void;
	onCartHeaderClick: () => void;
	cartHeaderIsOpen: boolean;
};

const CartSection = ({ onExecutePayment, onCartHeaderClick, cartHeaderIsOpen }: CartProps) => {
	// const [isOpen, setIsOpen] = useState(false);

	const [paymentMethod, setPaymentMethod] = useState<"qris" | "cash">("qris");
	const [paymentAmount, setPaymentAmount] = useState<number>(0);

	const { items: cartItems, isEmpty, cartTotal, totalItems, updateItemQuantity, removeItem, emptyCart } = useCart();
	const { user } = useContext(AuthContext);

	const handleProcessPayment = () => {
		console.log("process");
		if (!isPaymentValid) {
			console.log("out");
			return;
		}

		const cashierName = user?.username || "SYSTEM";
		const transactionTime = new Date();

		const transaction = {
			transaction_code: generateTransactionCode(cashierName, transactionTime),
			transaction_time: getLocalTimestamp(transactionTime),
			payment_method: paymentMethod,
			transaction_amount: paymentMethod === "cash" ? paymentAmount - cartTotal : cartTotal,
			cashier: cashierName,
			items: cartItems.map((item) => ({
				product_id: item.id,
				quantity: item.quantity ?? 0,
				unit_price: item.price,
				subtotal: item.itemTotal ?? 0
			}))
		};

		onExecutePayment(transaction);
	};

	const actualPayment = paymentMethod === "qris" ? cartTotal : paymentAmount;

	const change = Math.max(actualPayment - cartTotal, 0);

	const isPaymentValid = actualPayment >= cartTotal;

	let cartContent;

	if (isEmpty) {
		cartContent = (
			<div className={`${style.emptyCart} ${style.cartList}`}>
				<CartIcon type="arrow-down" />
				<strong>Keranjang Kosong</strong>
			</div>
		);
	} else {
		cartContent = (
			<>
				<div className={style.cartList}>
					{cartItems.map((item) => {
						return (
							<CartItem
								key={item.id}
								onIncrease={() => updateItemQuantity(item.id, (item.quantity ?? 0) + 1)}
								onDecrease={() => updateItemQuantity(item.id, (item.quantity ?? 0) - 1)}
								onDelete={() => removeItem(item.id)}
								{...item}
							/>
						);
					})}
				</div>
				<div className={style.cartSummary}>
					<div className={style.totalRow}>
						<span>Total Tagihan</span>
						<strong>{rupiahFormater(cartTotal)}</strong>
					</div>

					<div className={style.paymentRow}>
						<select
							className={style.paymentSelect}
							value={paymentMethod}
							onChange={(event) => {
								if (event.target.value === "cash") {
									setPaymentAmount(0);
									setPaymentMethod("cash");
								} else {
									setPaymentAmount(cartTotal);
									setPaymentMethod("qris");
								}
							}}
						>
							<option value="qris">QRIS</option>
							<option value="cash">CASH</option>
						</select>
						<input
							className={`${style.paymentInput} ${isPaymentValid ? "" : style.paymentInputInvalid}`}
							type="text"
							inputMode="numeric"
							placeholder="Nominal pembayaran"
							value={
								paymentMethod === "qris"
									? rupiahFormater(cartTotal)
									: paymentAmount === 0
										? ""
										: rupiahFormater(paymentAmount)
							}
							disabled={paymentMethod === "qris"}
							onChange={(event) => {
								const numericValue = event.target.value.replace(/\D/g, "");
								setPaymentAmount(numericValue === "" ? 0 : Number(numericValue));
							}}
						/>
					</div>
					{paymentMethod === "cash" && (
						<div className={style.changeRow}>
							<span>Kembalian</span>
							<span>{rupiahFormater(change)}</span>
						</div>
					)}

					<button
						type="button"
						className={style.processButton}
						disabled={!isPaymentValid}
						onClick={handleProcessPayment}
					>
						<BankNoteDownIcon />
						<span>Proses Pembayaran</span>
					</button>

					<button type="button" className={style.clearButton} onClick={() => emptyCart()}>
						<TrashIcon />
						<span>Kosongkan Keranjang</span>
					</button>
				</div>
			</>
		);
	}
	return (
		<section className={`${style.cartSection} ${cartHeaderIsOpen ? style.open : ""}`}>
			<div className={style.cartHeader} onClick={() => onCartHeaderClick()}>
				<div className={style.cartTitle}>
					<CartIcon />
					<h1>Keranjang</h1>
				</div>

				{/* <select className={style.cartSelect} defaultValue="default">
					<option value="default">Pilih Pelanggan</option>
					<option value="customer-1">Pelanggan 1</option>
					<option value="customer-2">Pelanggan 2</option>
				</select> */}
				{!isEmpty && (
					<div className={style.totalItem}>
						<strong>{totalItems} Items</strong>
					</div>
				)}
			</div>
			{cartContent}
		</section>
	);
};

export default CartSection;
