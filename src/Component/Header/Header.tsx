import { NavLink } from "react-router-dom";
import styles from "./Header.module.css";
import CashierIcon from "../MediaComponent/CashierIcon";
import TransactionIcon from "../MediaComponent/TransactionIcon";
import CatalogIcon from "../MediaComponent/CatalogIcon";
// import CheerfulLogo from "../../assets/orenji_cheerful_logo_transparent.png";
import CheerfulLogo from "../../assets/OrenjiSquareLogo.svg";
import CircleUser from "../../assets/circle-user.svg";

const menuList = [
	{
		label: "Cashier",
		path: "/cashier",
		icon: CashierIcon
	},
	{
		label: "Transaction History",
		path: "/transactions",
		icon: TransactionIcon
	},
	{
		label: "Product Catalog",
		path: "/products",
		icon: CatalogIcon
	}
];

const Header = () => {
	return (
		<header className={styles["header-section"]}>
			{/* Logo */}
			<NavLink to="/" className={styles["logo-link"]}>
				<img src={CheerfulLogo} alt="Orenji" className={styles["orenji-logo-home"]} />
			</NavLink>

			{/* Navigation */}
			<nav className={styles["header-menu-section"]}>
				{menuList.map((menu) => {
					const Icon = menu.icon;
					return (
						<NavLink
							key={menu.path}
							to={menu.path}
							className={({ isActive }) =>
								`${styles["menu-link"]} ${isActive ? styles["menu-link-active"] : ""}`
							}
						>
							<span className={styles["menu-icon"]}>
								<Icon />
							</span>

							<span className={styles["menu-label"]}>{menu.label}</span>
						</NavLink>
					);
				})}
			</nav>

			{/* User */}
			<div className={styles["user-box"]}>
				<h3 className={styles["user-name"]}>User Name</h3>

				<img src={CircleUser} alt="User" className={styles["user-icon"]} />
			</div>
		</header>
	);
};

export default Header;
