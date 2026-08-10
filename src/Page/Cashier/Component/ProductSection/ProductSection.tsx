import { useMemo, useState } from "react";
import GridIcon from "../../../../Component/MediaComponent/GridIcon";
import ListIcon from "../../../../Component/MediaComponent/ListIcon";
import style from "./ProductSection.module.css";
import ProductItem, { type TProductInfo } from "../../../../Component/ProductItem/ProductItem";

const categoryExample = ["Semua", "Gorengan", "Dimsum", "Orenji-Cookies"];

const productExample: TProductInfo[] = [
	{
		productName: "Dimsum Ayam",
		productImageUrl: "",
		productQuantity: 20,
		category: "Dimsum"
	},
	{
		productName: "Dimsum Udang",
		productImageUrl: "",
		productQuantity: 15,
		category: "Dimsum"
	},
	{
		productName: "Bakwan",
		productImageUrl: "",
		productQuantity: 30,
		category: "Gorengan"
	},
	{
		productName: "Cireng",
		productImageUrl: "",
		productQuantity: 25,
		category: "Gorengan"
	},
	{
		productName: "Cookies Coklat",
		productImageUrl: "",
		productQuantity: 12,
		category: "Orenji-Cookies"
	}
];

const ProductSection = () => {
	const [view, setView] = useState<"grid" | "list">("grid");
	const [selectedCategory, setSelectedCategory] = useState("Semua");
	const [searchTerm, setSearchTerm] = useState("");

	const filteredProducts = useMemo(() => {
		return productExample.filter((product) => {
			const matchesCategory = selectedCategory === "Semua" || product.category === selectedCategory;

			const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase());

			return matchesCategory && matchesSearch;
		});
	}, [selectedCategory, searchTerm]);

	const handleProductClick = (product: TProductInfo) => {
		console.log("Add to cart:", product.productName);
	};

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
				{categoryExample.map((category) => (
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
				{filteredProducts.map((product) => (
					<ProductItem
						key={product.productName}
						{...product}
						variant={view}
						onAdd={() => handleProductClick(product)}
					/>
				))}
			</div>
		</section>
	);
};

export default ProductSection;
