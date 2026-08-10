import { useState } from "react";
import style from "./ProductInfo.module.css";

export type TProductInfo = {
	productCode: string;
	productName: string;
	productImageUrl: string;
	productQuantity: number;
	category: string;
	variant?: "grid" | "list";
	onAdd?: () => void;
};

const ProductItem = ({ productName, productImageUrl, productQuantity, variant = "grid", onAdd }: TProductInfo) => {
	const [imageError, setImageError] = useState(false);

	// TODO: Add out of stock logic
	// const isOutOfStock = productQuantity <= 0;
	const isOutOfStock = false;

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
				<svg viewBox="0 0 48 48" aria-hidden="true" className={style.fallbackIcon}>
					<path
						d="M9 12.5A3.5 3.5 0 0 1 12.5 9h23a3.5 3.5 0 0 1 3.5 3.5v23a3.5 3.5 0 0 1-3.5 3.5h-23A3.5 3.5 0 0 1 9 35.5v-23Z"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
					/>
					<circle cx="17" cy="17" r="3" fill="currentColor" />
					<path
						d="m12 34 8.5-9 6 6 4-4L38 34"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>

				<span>No Image</span>
			</div>
		);

	if (variant === "list") {
		return (
			<div className={`${style.productItem} ${style.listItem} ${isOutOfStock ? style.outOfStock : ""}`}>
				<div className={style.listImage}>{imageContent}</div>

				<div className={style.listInfo}>
					<span className={style.productName}>{productName}</span>

					<span className={style.stock}>Stock: {productQuantity}</span>
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

				<span className={style.stock}>Stock: {productQuantity}</span>
			</div>
		</button>
	);
};

export default ProductItem;
