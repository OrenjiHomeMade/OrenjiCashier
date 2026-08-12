// IMPORT STYLES
import style from "./ProductSection.module.css";
// IMPORT TYPES
import { type TProductInfo } from "../ProductItem/ProductItem";
// IMPORT HOOKS
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "react-use-cart";
// IMPORT COMPONENTS
import GridIcon from "../MediaComponent/GridIcon";
import ListIcon from "../MediaComponent/ListIcon";
import ProductItem from "../ProductItem/ProductItem";
// IMPORT SERVICES
import { getProductImageUrl, getProducts } from "../../Services/supabase/productService";

const ProductSection = () => {
	const { addItem } = useCart();
	const [view, setView] = useState<"grid" | "list">("grid");
	const [selectedCategory, setSelectedCategory] = useState("Semua");
	const [searchTerm, setSearchTerm] = useState("");

	const { data: products = [] } = useQuery({
		queryKey: ["products"],
		queryFn: getProducts
	});

	const productInfos: TProductInfo[] = products.map((product) => ({
		id: product.product_id,
		price: product.product_price,
		quantity: 0,
		productName: product.product_name,
		productImageUrl: getProductImageUrl(product.product_code),
		category: product.product_category,
		description: product.description ?? "",
		availableStock: product.stock_quantity
	}));

	const categories = useMemo(() => {
		const uniqueCategories = new Set(productInfos.map((product) => product.category));

		return ["Semua", ...uniqueCategories];
	}, [productInfos]);

	const filteredProducts = useMemo(() => {
		return productInfos.filter((product) => {
			const matchesCategory = selectedCategory === "Semua" || product.category === selectedCategory;

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
			</div>

			<div className={style.productCategoryFilter}>
				{categories.map((category) => (
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
							onAdd={() => {
								const item = {
									id: product.id,
									price: product.price,
									quantity: product.quantity,
									name: product.productName,
									productImageUrl: product.productImageUrl
								};
								console.log(item);
								addItem(item, 1);
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
