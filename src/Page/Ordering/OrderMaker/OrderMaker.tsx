// IMPORT STYLES
import style from "./OrderMaker.module.css";

// IMPORT HOOKS
import { useCart } from "react-use-cart";
import { useState } from "react";

// IMPORT COMPONENT
import CartIcon from "../../../Component/MediaComponent/CartIcon";
import TrashIcon from "../../../Component/MediaComponent/TrashIcon";
import CartItem from "../../../Component/CartItem/CartItem";

// IMPORT UTILITIES
import { rupiahFormater, dateStringInputFormat } from "../../../Utilities/NumberFormater";
import type { TCreateOrderInput } from "../../../Types/order";

// PROPERTY DEFINITION
export type OrderMakerProps = {
	onCreateOrder: (order: TCreateOrderInput) => void;
	onHeaderClick: () => void;
	headerIsOpen: boolean;
	isSubmitting?: boolean;
};

type FieldErrors = {
	customerName?: string;
	dueDate?: string;
	items?: string;
};

const OrderMaker = ({ onCreateOrder, onHeaderClick, headerIsOpen, isSubmitting = false }: OrderMakerProps) => {
	const { items: cartItems, isEmpty, updateItemQuantity, removeItem, emptyCart } = useCart();

	const [customerName, setCustomerName] = useState("");
	const [customerAddress, setCustomerAddress] = useState("");
	const [dueDate, setDueDate] = useState(() => dateStringInputFormat(new Date()));
	const [notes, setNotes] = useState("");
	const [errors, setErrors] = useState<FieldErrors>({});

	const estimatedValue = cartItems.reduce((total, item) => total + item.price * (item.quantity ?? 0), 0);

	const validate = (): boolean => {
		const nextErrors: FieldErrors = {};

		if (!customerName.trim()) {
			nextErrors.customerName = "Nama pelanggan wajib diisi";
		}

		if (!dueDate) {
			nextErrors.dueDate = "Tanggal jatuh tempo wajib diisi";
		}

		if (isEmpty) {
			nextErrors.items = "Tambahkan minimal satu produk";
		}

		setErrors(nextErrors);

		return Object.keys(nextErrors).length === 0;
	};

	const handleSubmit = () => {
		if (!validate()) return;

		const order: TCreateOrderInput = {
			customerName: customerName.trim(),
			customerAddress: customerAddress.trim() || undefined,
			dueDate,
			notes: notes.trim() || undefined,
			items: cartItems.map((item) => ({
				productId: Number(item.id),
				quantityOrdered: item.quantity ?? 0,
				unitPrice: item.price,
				unitCostLabor: item.costLabor ?? 0,
				unitCostIngredient: item.costIngredient ?? 0,
				unitCostUtilities: item.costUtilities ?? 0,
				unitCostPackaging: item.costPackaging ?? 0
			}))
		};

		onCreateOrder(order);
	};

	let itemsContent;

	if (isEmpty) {
		itemsContent = (
			<div className={`${style.emptyItems} ${style.itemList}`}>
				<CartIcon type="arrow-down" />
				<strong>Belum ada produk dipilih</strong>
			</div>
		);
	} else {
		itemsContent = (
			<div className={style.itemList}>
				{cartItems.map((item) => (
					<CartItem
						key={item.id}
						onIncrease={() => updateItemQuantity(item.id, (item.quantity ?? 0) + 1)}
						onDecrease={() => updateItemQuantity(item.id, (item.quantity ?? 0) - 1)}
						onDelete={() => removeItem(item.id)}
						{...item}
					/>
				))}
			</div>
		);
	}

	return (
		<section className={`${style.orderMakerSection} ${headerIsOpen ? style.open : ""}`}>
			<div className={style.orderMakerHeader} onClick={() => onHeaderClick()}>
				<div className={style.headerTitle}>
					<CartIcon />
					<h1>Detail Pesanan</h1>
				</div>

				{!isEmpty && (
					<div className={style.totalItem}>
						<strong>{cartItems.length} Produk</strong>
					</div>
				)}
			</div>

			<div className={style.body}>
				<div className={style.formFields}>
					<div className={style.field}>
						<label htmlFor="order-customer-name">Nama pelanggan</label>
						<input
							id="order-customer-name"
							type="text"
							placeholder="Bu Sari"
							value={customerName}
							onChange={(event) => setCustomerName(event.target.value)}
							className={errors.customerName ? style.inputInvalid : ""}
						/>
						{errors.customerName && <span className={style.fieldError}>{errors.customerName}</span>}
					</div>

					<div className={style.field}>
						<label htmlFor="order-customer-address">Alamat</label>
						<input
							id="order-customer-address"
							type="text"
							placeholder="Opsional"
							value={customerAddress}
							onChange={(event) => setCustomerAddress(event.target.value)}
						/>
					</div>

					<div className={style.field}>
						<label htmlFor="order-due-date">Tanggal jatuh tempo</label>
						<input
							id="order-due-date"
							type="date"
							value={dueDate}
							onChange={(event) => setDueDate(event.target.value)}
							className={errors.dueDate ? style.inputInvalid : ""}
						/>
						{errors.dueDate && <span className={style.fieldError}>{errors.dueDate}</span>}
					</div>

					<div className={style.field}>
						<label htmlFor="order-notes">Catatan</label>
						<input
							id="order-notes"
							type="text"
							placeholder="Opsional"
							value={notes}
							onChange={(event) => setNotes(event.target.value)}
						/>
					</div>
				</div>

				{itemsContent}
				{errors.items && <span className={style.fieldError}>{errors.items}</span>}

				<div className={style.orderSummary}>
					<div className={style.totalRow}>
						<span>Estimasi nilai</span>
						<strong>{rupiahFormater(estimatedValue)}</strong>
					</div>

					<button
						type="button"
						className={style.processButton}
						disabled={isSubmitting}
						onClick={handleSubmit}
					>
						<span>Buat Pesanan</span>
					</button>

					<button
						type="button"
						className={style.clearButton}
						onClick={() => {
							emptyCart();
							setErrors({});
						}}
					>
						<TrashIcon />
						<span>Kosongkan Pesanan</span>
					</button>
				</div>
			</div>
		</section>
	);
};

export default OrderMaker;
