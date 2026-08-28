// IMPORT STYLES
import style from "./ProductSection.module.css";

// IMPORT TYPES
import { type ProductInfoProps } from "../ProductItem/ProductItem";

// IMPORT HOOKS
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

// IMPORT COMPONENTS
import GridIcon from "../MediaComponent/GridIcon";
import ListIcon from "../MediaComponent/ListIcon";
import ProductItem from "../ProductItem/ProductItem";

// IMPORT SERVICES
import { getProductImageUrl, getProducts } from "../../Services/supabase/productService";
import AddProductIcon from "../MediaComponent/AddProductIcon";

export type TProductSectionProps = {
	mode: "Cashier" | "Catalog";
	categories: string[];
	onItemAdjusted?: (prod: ProductInfoProps) => void;
	onItemAdd?: (prod: ProductInfoProps) => void;
	onEditProduct?: (prod: ProductInfoProps) => void;
	onAddProduct?: () => void;
};

const ProductSection = ({
	mode,
	categories,
	onItemAdd,
	onEditProduct,
	onItemAdjusted,
	onAddProduct
}: TProductSectionProps) => {
	const [view, setView] = useState<"grid" | "list">("grid");
	const [selectedCategory, setSelectedCategory] = useState("Semua");
	const [searchTerm, setSearchTerm] = useState("");

	const { data: products = [] } = useQuery({
		queryKey: ["products"],
		queryFn: () => getProducts(mode === "Cashier" ? true : null)
	});

	const productInfos: ProductInfoProps[] = products.map((product) => ({
		id: product.productId.toString(),
		productCode: product.productCode,
		price: product.productPrice,
		quantity: 0,
		productName: product.productName,
		productImageUrl: getProductImageUrl(product.productCode),
		productCategory: product.productCategory ?? "",
		description: product.description ?? "",
		availableStock: product.stockQuantity,
		isActive: product.isActive
	}));

	const productCategory = ["Semua", ...categories];

	const filteredProducts = useMemo(() => {
		return productInfos.filter((product) => {
			const matchesCategory = selectedCategory === "Semua" || product.productCategory === selectedCategory;
			const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase());

			return matchesCategory && matchesSearch;
		});
	}, [productInfos, selectedCategory, searchTerm]);

	return (
		<section className={style.productSection}>
			<div className={style.productHeader}>
				<div className={style.searchContainer}>
					<label htmlFor="product-search">Search Product</label>

					<input
						id="product-search"
						type="search"
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						placeholder="Cari produk..."
						className={style.searchInput}
					/>
				</div>

				<div className={style.viewSelector}>
					<button
						type="button"
						aria-label="Grid view"
						aria-pressed={view === "grid"}
						className={`${style.viewButton} ${view === "grid" ? style.viewButtonActive : ""}`}
						onClick={() => setView("grid")}
					>
						<GridIcon />
					</button>

					<button
						type="button"
						aria-label="List view"
						aria-pressed={view === "list"}
						className={`${style.viewButton} ${view === "list" ? style.viewButtonActive : ""}`}
						onClick={() => setView("list")}
					>
						<ListIcon />
					</button>
				</div>
				{mode === "Catalog" && (
					<button
						className={style.addProductButton}
						onClick={() => {
							onAddProduct?.();
						}}
					>
						<AddProductIcon className={style.addProductIcon} />
						<span>Add Product</span>
					</button>
				)}
			</div>

			<div className={style.productCategoryFilter}>
				{productCategory.map((category) => (
					<button
						key={category}
						type="button"
						className={`${style.buttonCategory} ${
							selectedCategory === category ? style.buttonCategoryActive : ""
						}`}
						onClick={() => setSelectedCategory(category)}
					>
						{category}
					</button>
				))}
			</div>

			<div
				className={`${style.productCollection} ${
					view === "list" ? style.productCollectionList : style.productCollectionGrid
				}`}
			>
				{filteredProducts.map((product) => {
					return (
						<ProductItem
							key={product.id}
							variant={view}
							mode={mode}
							onAdd={() => {
								onItemAdd?.(product);
							}}
							onAdjustStock={() => {
								onItemAdjusted?.(product);
							}}
							onEdit={() => {
								onEditProduct?.(product);
							}}
							{...product}
						/>
					);
				})}
			</div>
		</section>
	);
};

export default ProductSection;
