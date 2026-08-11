// IMPORT STYLES
import style from "./CartSection.module.css";
// IMPORT TYPES

// IMPORT HOOKS
import { useCart } from "react-use-cart";
import { useRef, useState } from "react";

// IMPORT COMPONENT
import CartIcon from "../../../Component/MediaComponent/CartIcon";
import TrashIcon from "../../../Component/MediaComponent/TrashIcon";
import BankNoteDownIcon from "../../../Component/MediaComponent/BankNoteDownIcon";
import CartItem from "../../../Component/CartItem/CartItem";

const CartSection = () => {
	const [isOpen, setIsOpen] = useState(false);
	const startY = useRef(0);
	const { items: cartItems, isEmpty, updateItemQuantity, removeItem, emptyCart } = useCart();

	const handlePointerDown = (event: React.PointerEvent) => {
		console.log("Pointer down", event.clientY);
		startY.current = event.clientY;
	};

	const handlePointerUp = (event: React.PointerEvent) => {
		console.log("Pointer up", event.clientY);
		const deltaY = event.clientY - startY.current;

		console.log("Swipe distance:", deltaY);

		if (deltaY < -30) {
			setIsOpen(true);
		} else if (deltaY > 30) {
			setIsOpen(false);
		}
	};

	const handleHeaderClick = () => {
		if (isOpen) {
			setIsOpen(false);
		} else {
			setIsOpen(true);
		}
	};

	console.log("cartItems: ", cartItems);

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
								key={item.productName}
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
						<strong>Rp. 1.000.000,-</strong>
					</div>

					<div className={style.paymentRow}>
						<select className={style.paymentSelect} defaultValue="qris">
							<option value="qris">QRIS</option>
							<option value="cash">CASH</option>
						</select>

						<input className={style.paymentInput} type="text" placeholder="Nominal pembayaran" />
					</div>

					<button type="button" className={style.processButton}>
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
		<section className={`${style.cartSection} ${isOpen ? style.open : ""}`}>
			<div
				className={style.cartHeader}
				onPointerUp={handlePointerUp}
				onPointerDown={handlePointerDown}
				onClick={handleHeaderClick}
			>
				<div className={style.cartTitle}>
					<CartIcon />
					<h1>Keranjang</h1>
				</div>

				<select className={style.cartSelect} defaultValue="default">
					<option value="default">Pilih Pelanggan</option>
					<option value="customer-1">Pelanggan 1</option>
					<option value="customer-2">Pelanggan 2</option>
				</select>
			</div>
			{cartContent}
		</section>
	);
};

export default CartSection;
