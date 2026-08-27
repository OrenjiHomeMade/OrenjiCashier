// IMPORT STYLES
import styles from "./Header.module.css";
// IMPORT HOOKS
import { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
// IMPORT COMPONENTS
import AuthContext from "../Context/AuthProvider";
import CashierIcon from "../MediaComponent/CashierIcon";
import TransactionIcon from "../MediaComponent/TransactionIcon";
import CatalogIcon from "../MediaComponent/CatalogIcon";
import CheerfulLogo from "../../assets/OrenjiSquareLogo.svg";
import CircleUser from "../../assets/circle-user.svg";
import LogoutIcon from "../MediaComponent/LogoutIcon";

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
	const navigate = useNavigate();

	const { user, logout } = useContext(AuthContext);

	async function handleLogout() {
		try {
			await logout();

			navigate("/login", {
				replace: true
			});
		} catch (error) {
			console.error("Failed to logout:", error);
		}
	}

	return (
		<header className={styles["header-section"]}>
			{/* =================================================
                LOGO
            ================================================= */}

			<NavLink to="/" className={styles["logo-link"]}>
				<img src={CheerfulLogo} alt="Orenji" className={styles["orenji-logo-home"]} />
			</NavLink>

			{/* =================================================
                NAVIGATION
            ================================================= */}

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

			{/* =================================================
                USER
            ================================================= */}

			<div className={styles["user-box"]}>
				<div className={styles["user-info"]}>
					<h3 className={styles["user-name"]}>{user?.username ?? "User"}</h3>
				</div>

				<img src={CircleUser} alt="User" className={styles["user-icon"]} />

				<button type="button" onClick={handleLogout} className={styles["logout-button"]}>
					<LogoutIcon />
				</button>
			</div>
		</header>
	);
};

export default Header;
