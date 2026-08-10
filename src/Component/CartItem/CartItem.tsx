import TrashIcon from "../../Component/MediaComponent/TrashIcon";
import style from "./CartItem.module.css";

export type TCartItem = {
	productId: string;
	productName: string;
	productImageUrl?: string;
	quantity: number;
	price: number;

	variant?: "cart" | "history";

	onIncrease?: () => void;
	onDecrease?: () => void;
	onDelete?: () => void;
};

const CartItem = ({
	// productId,
	productName,
	productImageUrl,
	quantity,
	price,
	variant = "cart",
	onIncrease,
	onDecrease,
	onDelete
}: TCartItem) => {
	const isHistory = variant === "history";

	const subtotal = quantity * price;

	return (
		<div className={`${style.cartItem} ${isHistory ? style.historyItem : style.cartVariant}`}>
			{/* Product image */}
			<div className={style.productImageContainer}>
				{productImageUrl ? (
					<img src={productImageUrl} alt={productName} className={style.productImage} />
				) : (
					<div className={style.imageFallback} aria-label="No product image">
						<span>IMG</span>
					</div>
				)}
			</div>

			{/* Product information */}
			<div className={style.productInfo}>
				<span className={style.productName}>{productName}</span>

				{isHistory && <span className={style.productPrice}>Rp {price.toLocaleString("id-ID")}</span>}
			</div>

			{isHistory ? (
				<>
					{/* History quantity */}
					<span className={style.historyQuantity}>{quantity} ×</span>

					{/* History subtotal */}
					<span className={style.historySubtotal}>Rp {subtotal.toLocaleString("id-ID")}</span>
				</>
			) : (
				<>
					{/* Cart quantity controls */}
					<div className={style.quantityControl}>
						<button
							type="button"
							className={style.quantityButton}
							onClick={onDecrease}
							disabled={!onDecrease}
							aria-label={`Decrease ${productName}`}
						>
							−
						</button>

						<span className={style.quantity}>{quantity}</span>

						<button
							type="button"
							className={style.quantityButton}
							onClick={onIncrease}
							disabled={!onIncrease}
							aria-label={`Increase ${productName}`}
						>
							+
						</button>
					</div>

					{/* Delete */}
					<button
						type="button"
						className={style.deleteButton}
						onClick={onDelete}
						disabled={!onDelete}
						aria-label={`Remove ${productName}`}
					>
						<TrashIcon />
					</button>
				</>
			)}
		</div>
	);
};

export default CartItem;
