import ProductSection from "../Component/ProductSection/ProductSection";
// import StockAdjustmentDrawer from "../Page/ProductCatalog/StockAdjustmentDrawer/StockAdjustmentDrawer";

const Development = () => {
	return (
		<div className="page">
			{/* <StockAdjustmentDrawer /> */}
			<ProductSection mode="Cashier" />
		</div>
	);
};

export default Development;
