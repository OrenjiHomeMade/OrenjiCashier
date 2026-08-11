// IMPORT STYLE
import style from "./Cashier.module.css";

// IMPORT HOOKS
import { CartProvider } from "react-use-cart";

// IMPORT COMPONENT
import ProductSection from "../../Component/ProductSection/ProductSection";
import CartSection from "./CartSection/CartSection";

// IMPORT SERVICES

const Cashier = () => {
	return (
		<div id="cashier-layout" className={`page ${style.cashierLayout}`}>
			<CartProvider>
				<ProductSection />
				<CartSection />
			</CartProvider>
		</div>
	);
};

export default Cashier;
