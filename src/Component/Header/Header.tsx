// IMPORT STYLES
import styles from "./Header.module.css";
// IMPORT HOOKS
import { useContext, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
// IMPORT COMPONENTS
import AuthContext from "../Context/AuthProvider";
import CashierIcon from "../MediaComponent/CashierIcon";
import TransactionIcon from "../MediaComponent/TransactionIcon";
import CatalogIcon from "../MediaComponent/CatalogIcon";
import CheerfulLogo from "../../assets/OrenjiSquareLogo.svg";
import CircleUser from "../../assets/circle-user.svg";
import LogoutIcon from "../MediaComponent/LogoutIcon";
import FinanceIcon from "../MediaComponent/FinanceIcon";
import OrderingIcon from "../MediaComponent/OrderingIcon";

const menuList = [
	{
		label: "Cashier",
		path: "/cashier",
		icon: CashierIcon
	},
	{
		label: "Order",
		path: "/orders",
		icon: OrderingIcon
	},
	{
		label: "Transactions",
		path: "/transactions",
		icon: TransactionIcon
	},
	{
		label: "Catalog",
		path: "/products",
		icon: CatalogIcon
	},
	{
		label: "Finance",
		path: "/finance",
		icon: FinanceIcon
	}
];

const Header = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const { user, logout } = useContext(AuthContext);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsMenuOpen(false);
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

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

	const currentMenu = menuList.find((menu) => location.pathname.startsWith(menu.path));
	const CurrentMenuIcon = currentMenu?.icon;

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

			<div className={styles["mobile-current-page"]}>
				{currentMenu && CurrentMenuIcon && (
					<>
						<span className={styles["menu-icon"]}>
							<CurrentMenuIcon />
						</span>
						<span className={styles["menu-label"]}>{currentMenu.label}</span>
					</>
				)}
			</div>

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

				<button
					type="button"
					className={styles["menu-button"]}
					onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
					aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
					aria-expanded={isMenuOpen}
					aria-controls="mobile-navigation"
				>
					<span />
					<span />
					<span />
				</button>
			</div>

			{isMenuOpen && (
				<div
					className={styles["mobile-navigation-overlay"]}
					onMouseDown={(event) => {
						if (event.target === event.currentTarget) {
							setIsMenuOpen(false);
						}
					}}
				>
					<nav id="mobile-navigation" className={styles["mobile-navigation"]} aria-label="Mobile navigation">
						<div className={styles["mobile-navigation-header"]}>
							<h2>Menu</h2>
							<button
								type="button"
								className={styles["mobile-navigation-close"]}
								onClick={() => setIsMenuOpen(false)}
								aria-label="Close navigation menu"
							>
								×
							</button>
						</div>

						<div className={styles["mobile-navigation-links"]}>
							{menuList.map((menu) => {
								const Icon = menu.icon;

								return (
									<NavLink
										key={menu.path}
										to={menu.path}
										onClick={() => setIsMenuOpen(false)}
										className={({ isActive }) =>
											`${styles["mobile-menu-link"]} ${isActive ? styles["mobile-menu-link-active"] : ""}`
										}
									>
										<span className={styles["menu-icon"]}>
											<Icon />
										</span>
										<span>{menu.label}</span>
									</NavLink>
								);
							})}
						</div>
					</nav>
				</div>
			)}
		</header>
	);
};

export default Header;
