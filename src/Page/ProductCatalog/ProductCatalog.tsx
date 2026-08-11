import ProductSection from "../../Component/ProductSection/ProductSection";
import style from "./ProductCatalog.module.css";
const ProductCatalog = () => {
	return (
		<div className={`page ${style.productCatalog}`}>
			<ProductSection />
		</div>
	);
};

export default ProductCatalog;
