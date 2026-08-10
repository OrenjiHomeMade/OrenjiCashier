import style from "./CartSection.module.css";
import CartIcon from "../../../../Component/MediaComponent/CartIcon";
import { useRef, useState } from "react";
import TrashIcon from "../../../../Component/MediaComponent/TrashIcon";
import BankNoteDownIcon from "../../../../Component/MediaComponent/BankNoteDownIcon";
import type { TCartItem } from "../../../../Component/CartItem/CartItem";
import CartItem from "../../../../Component/CartItem/CartItem";

const cartItems: TCartItem[] = [
	{
		productName: "Dimsum Ayam",
		productImageUrl: "",
		quantity: 2
	},
	{
		productName: "Dimsum Udang",
		productImageUrl: "",
		quantity: 1
	},
	{
		productName: "Bakwan",
		productImageUrl: "",
		quantity: 3
	},
	{
		productName: "Cookies Coklat",
		productImageUrl: "",
		quantity: 2
	}
];

const CartSection = () => {
	const [isOpen, setIsOpen] = useState(false);
	const startY = useRef(0);

	const handlePointerDown = (event: React.PointerEvent) => {
		console.log("Pointer down", event.clientY);
		startY.current = event.clientY;
	};

	// const handlePointerMove = (event: React.PointerEvent) => {
	// 	// Optional: track movement here
	// 	// console.log(event);
	// };

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

	return (
		<section className={`${style.cartSection} ${isOpen ? style.open : ""}`}>
			<div
				className={style.cartHeader}
				onPointerUp={handlePointerUp}
				onPointerDown={handlePointerDown}
				// onPointerMove={handlePointerMove}
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

			<div className={style.cartList}>
				{cartItems.map((item) => {
					return <CartItem {...item} />;
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

				<button type="button" className={style.clearButton}>
					<TrashIcon />
					<span>Kosongkan Keranjang</span>
				</button>
			</div>
		</section>
	);
};

export default CartSection;
