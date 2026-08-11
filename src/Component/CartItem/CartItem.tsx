// IMPORT STYLES
import style from "./CartItem.module.css";
// IMPORT TYPES
import type { Item } from "react-use-cart";
// IMPORT COMPONENTS
import TrashIcon from "../../Component/MediaComponent/TrashIcon";
import { rupiahFormater } from "../../Utilities/NumberFormater";

export interface TCartItem extends Item {
	variant?: "cart" | "history";
	onIncrease?: () => void;
	onDecrease?: () => void;
	onDelete?: () => void;
}

const CartItem = ({
	id,
	name,
	quantity,
	price,
	productImageUrl,
	variant = "cart",
	onIncrease,
	onDecrease,
	onDelete
}: TCartItem) => {
	const isHistory = variant === "history";

	const subtotal = (quantity ?? 0) * price;

	return (
		<div id={id} className={`${style.cartItem} ${isHistory ? style.historyItem : style.cartVariant}`}>
			{/* Product image */}
			<div className={style.productImageContainer}>
				{productImageUrl ? (
					<img src={productImageUrl} alt={name} className={style.productImage} />
				) : (
					<div className={style.imageFallback} aria-label="No product image">
						<span>IMG</span>
					</div>
				)}
			</div>

			{/* Product information */}
			<div className={style.productInfo}>
				<span className={style.productName}>{name}</span>

				<span className={style.productPrice}>{rupiahFormater(subtotal)}</span>
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
							aria-label={`Decrease ${name}`}
						>
							−
						</button>

						<span className={style.quantity}>{quantity}</span>

						<button
							type="button"
							className={style.quantityButton}
							onClick={onIncrease}
							disabled={!onIncrease}
							aria-label={`Increase ${name}`}
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
						aria-label={`Remove ${name}`}
					>
						<TrashIcon />
					</button>
				</>
			)}
		</div>
	);
};

export default CartItem;
