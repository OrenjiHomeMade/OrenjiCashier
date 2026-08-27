// IMPORT STYLES
import style from "./ProductInfo.module.css";
// IMPORT TYPES
import type { TProduct } from "../../Types/product";
// IMPORT HOOKS
import { useState } from "react";
// IMPORT UTILITIES
import { rupiahFormater } from "../../Utilities/NumberFormater";
// IMPORT COMPONENTS
import EmptyImage from "../MediaComponent/EmptyImage";
import EditIcon from "../MediaComponent/EditIcon";
import { ArrowUpDown } from "lucide-react";

export interface ProductInfoProps extends TProduct {
	availableStock: number;
	variant?: "grid" | "list";
	onAdd?: () => void;
	onAdjustStock?: () => void;
	onEdit?: () => void;
}

const ProductItem = ({
	productName,
	price,
	productImageUrl,
	availableStock,
	mode = "Cashier",
	variant = "grid",
	onAdd,
	onAdjustStock,
	onEdit
}: ProductInfoProps) => {
	const [imageError, setImageError] = useState(false);

	const isOutOfStock = availableStock <= 0;

	const inCashierMode = mode === "Cashier";

	const disabledAddItem = inCashierMode && isOutOfStock;

	const handleAdd = () => {
		if (isOutOfStock) return;

		onAdd?.();
	};

	const imageContent =
		productImageUrl && !imageError ? (
			<img
				src={productImageUrl}
				alt={productName}
				className={style.productImage}
				onError={() => setImageError(true)}
			/>
		) : (
			<div className={style.imageFallback}>
				<EmptyImage className={style.fallbackIcon} />
				<span>No Image</span>
			</div>
		);

	/* ==================================================
	   LIST
	   ================================================== */

	if (variant === "list") {
		return (
			<div className={`${style.productItem} ${style.listItem} ${disabledAddItem ? style.outOfStock : ""}`}>
				<div className={style.listImage}>{imageContent}</div>
				<div className={style.listInfo}>
					<span className={style.productName}>{productName}</span>
				</div>
				<div className={style.priceInfo}>
					<strong className={style.price}>{rupiahFormater(price)}</strong>
					<span className={style.stock}>Stock: {availableStock}</span>
				</div>
				{inCashierMode && (
					<button type="button" className={style.addButton} disabled={disabledAddItem} onClick={handleAdd}>
						<span>+</span>
						Add
					</button>
				)}

				{!inCashierMode && (
					<div className={style.actionButtons}>
						<button
							type="button"
							className={style.adjustButton}
							onClick={onAdjustStock}
							aria-label={`Adjust stock for ${productName}`}
							title="Adjust stock"
						>
							<ArrowUpDown className={style.actionIcon} />

							{/* <span className={style.actionText}>Adjust Stock</span> */}
						</button>

						<button
							type="button"
							className={style.editButton}
							onClick={onEdit}
							aria-label={`Edit ${productName}`}
							title="Edit product"
						>
							<EditIcon />
						</button>
					</div>
				)}
			</div>
		);
	}

	/* ==================================================
	   GRID — CASHIER
	   ================================================== */

	if (inCashierMode) {
		return (
			<button
				type="button"
				className={`${style.productItem} ${style.gridItem} ${style.gridClick} ${
					disabledAddItem ? style.outOfStock : ""
				}`}
				disabled={disabledAddItem}
				onClick={handleAdd}
			>
				<div className={style.gridImage}>{imageContent}</div>

				<div className={style.gridInfo}>
					<span className={style.productName}>{productName}</span>

					<strong className={style.price}>{rupiahFormater(price)}</strong>

					<span className={style.stock}>Stock: {availableStock}</span>
				</div>
			</button>
		);
	}
	/* ==================================================
	   GRID — CATALOG
	   ================================================== */
	return (
		<div className={`${style.productItem} ${style.gridItem} ${disabledAddItem ? style.outOfStock : ""}`}>
			<div className={style.gridImage}>
				{imageContent}

				<button
					type="button"
					className={style.editButton}
					onClick={onEdit}
					aria-label={`Edit ${productName}`}
					title="Edit product"
				>
					<EditIcon />
				</button>
			</div>

			<div className={style.gridInfo}>
				<span className={style.productName}>{productName}</span>

				<strong className={style.price}>{rupiahFormater(price)}</strong>

				<div className={style.stockRow}>
					<span className={style.stock}>
						Stock: <strong>{availableStock}</strong>
					</span>

					<button
						type="button"
						className={style.adjustButton}
						onClick={onAdjustStock}
						aria-label={`Adjust stock for ${productName}`}
						title="Adjust stock"
					>
						<ArrowUpDown className={style.actionIcon} />
					</button>
				</div>
			</div>
		</div>
	);
};

export default ProductItem;
