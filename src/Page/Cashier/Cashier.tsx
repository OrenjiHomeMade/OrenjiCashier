import CartSection from "./Component/CartSection/CartSection";
import ProductSection from "./Component/ProductSection/ProductSection";
import style from "./Cashier.module.css";

const Cashier = () => {
	return (
		<div id="cashier-layout" className={`page ${style.cashierLayout}`}>
			<ProductSection />
			<CartSection />
		</div>
	);
};

export default Cashier;
