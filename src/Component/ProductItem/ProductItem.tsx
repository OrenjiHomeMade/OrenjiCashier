// IMPORT STYLES
import style from "./ProductInfo.module.css";

// IMPORT TYPES
import type { TProductItem, TProductMode } from "../../Types/product";

// IMPORT HOOKS
import { useState } from "react";

// IMPORT UTILITIES
import { rupiahFormater } from "../../Utilities/NumberFormater";

// IMPORT COMPONENTS
import EmptyImage from "../MediaComponent/EmptyImage";
import EditIcon from "../MediaComponent/EditIcon";
import { ArrowUpDown } from "lucide-react";

export interface ProductInfoProps extends TProductItem {
	availableStock: number;
	mode?: TProductMode;
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
	isActive,
	mode = "Cashier",
	variant = "grid",
	onAdd,
	onAdjustStock,
	onEdit
}: ProductInfoProps) => {
	const [imageError, setImageError] = useState(false);

	const isOutOfStock = availableStock <= 0;
	const isInactive = !isActive;

	const inCashierMode = mode === "Cashier";
	const inOrderMode = mode === "Order";

	/*
	 * Cashier mode fulfils from live stock, so it stays disabled when
	 * out of stock. Order mode is explicitly allowed to demand a
	 * product that isn't in stock yet — that demand is the whole
	 * point (see get_product_demand_overview) — so it's never
	 * disabled by stock.
	 */
	const disabledAddItem = inCashierMode && isOutOfStock;

	const showAddAffordance = inCashierMode || inOrderMode;

	const handleAdd = () => {
		if (disabledAddItem) return;

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

	const stockLabel =
		inOrderMode && isOutOfStock ? (
			<span className={`${style.stock} ${style.demandStock}`}>Out of stock — adds demand</span>
		) : (
			<span className={style.stock}>Stock: {availableStock}</span>
		);

	/* ==================================================
	   LIST
	   ================================================== */

	if (variant === "list") {
		return (
			<div
				className={`${style.productItem} ${style.listItem} ${
					disabledAddItem ? style.outOfStock : ""
				} ${isInactive ? style.inactive : ""}`}
			>
				<div className={style.listImage}>
					{imageContent}

					{isInactive && <span className={style.inactiveBadge}>Inactive</span>}
				</div>

				<div className={style.listInfo}>
					<span className={style.productName}>{productName}</span>
				</div>

				<div className={style.priceInfo}>
					<strong className={style.price}>{rupiahFormater(price)}</strong>
					{stockLabel}
				</div>

				{showAddAffordance && (
					<button type="button" className={style.addButton} disabled={disabledAddItem} onClick={handleAdd}>
						<span>+</span>
						{inOrderMode ? "Add demand" : "Add"}
					</button>
				)}

				{mode === "Catalog" && (
					<div className={style.actionButtons}>
						<button
							type="button"
							className={style.adjustButton}
							onClick={onAdjustStock}
							aria-label={`Adjust stock for ${productName}`}
							title="Adjust stock"
						>
							<ArrowUpDown className={style.actionIcon} />
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
	   GRID — CASHIER / ORDER
	   Both are a single clickable card. Cashier disables it
	   when out of stock; Order never does — the card stays
	   clickable and the stock line explains why.
	   ================================================== */

	if (showAddAffordance) {
		return (
			<button
				type="button"
				className={`${style.productItem} ${style.gridItem} ${style.gridClick} ${
					disabledAddItem ? style.outOfStock : ""
				} ${isInactive ? style.inactive : ""}`}
				disabled={disabledAddItem}
				onClick={handleAdd}
			>
				<div className={style.gridImage}>
					{imageContent}

					{isInactive && <span className={style.inactiveBadge}>Inactive</span>}
				</div>

				<div className={style.gridInfo}>
					<span className={style.productName}>{productName}</span>

					<strong className={style.price}>{rupiahFormater(price)}</strong>

					{stockLabel}
				</div>
			</button>
		);
	}

	/* ==================================================
	   GRID — CATALOG
	   ================================================== */

	return (
		<div
			className={`${style.productItem} ${style.gridItem} ${
				disabledAddItem ? style.outOfStock : ""
			} ${isInactive ? style.inactive : ""}`}
		>
			<div className={style.gridImage}>
				{imageContent}

				{isInactive && <span className={style.inactiveBadge}>Inactive</span>}

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
