// IMPORT STYLES
import style from "./ProductInfo.module.css";
// IMPORT TYPES
import type { TProduct } from "../../Types/product";
// IMPORT HOOKS
import { useState } from "react";
// IMPORT COMPONENTS
import EmptyImage from "../MediaComponent/EmptyImage";
import { rupiahFormater } from "../../Utilities/NumberFormater";

export interface TProductInfo extends TProduct {
	availableStock: number;
	variant?: "grid" | "list";
	onAdd?: () => void;
}

const ProductItem = ({
	productName,
	price,
	productImageUrl,
	availableStock,
	variant = "grid",
	onAdd
}: TProductInfo) => {
	const [imageError, setImageError] = useState(false);

	const isOutOfStock = availableStock <= 0;

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

	if (variant === "list") {
		return (
			<div className={`${style.productItem} ${style.listItem} ${isOutOfStock ? style.outOfStock : ""}`}>
				<div className={style.listImage}>{imageContent}</div>

				<div className={style.listInfo}>
					<span className={style.productName}>{productName}</span>

					<span className={style.stock}>Stock: {availableStock}</span>
				</div>
				<div className={style.priceInfo}>
					<strong className={style.price}>{rupiahFormater(price)}</strong>
				</div>
				<button type="button" className={style.addButton} disabled={isOutOfStock} onClick={handleAdd}>
					<span>+</span>
					Add
				</button>
			</div>
		);
	}

	return (
		<button
			type="button"
			className={`${style.productItem} ${style.gridItem} ${isOutOfStock ? style.outOfStock : ""}`}
			disabled={isOutOfStock}
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
};

export default ProductItem;
