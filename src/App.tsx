// IMPORT STYLES
import "./App.css";
// IMPORT HOOKS
import { useContext } from "react";
// IMPORT COMPONENTS
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Header from "./Component/Header/Header";
import AuthContext from "./Component/Context/AuthProvider";
import Login from "./Page/Login/Login";
import Signup from "./Page/Login/Signup";
import NotFound from "./Page/NotFound/NotFound";
import Cashier from "./Page/Cashier/Cashier";
import TransactionHistory from "./Page/TransactionHistory/TransactionHistory";
import ProductCatalog from "./Page/ProductCatalog/ProductCatalog";
import Development from "./Development/Development";
import Report from "./Page/Report/Report";

// =========================================================
// QUERY CLIENT
// =========================================================

const queryClient = new QueryClient();

// =========================================================
// APP
// =========================================================

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ToastContainer
				position="top-right"
				autoClose={3000}
				limit={3}
				hideProgressBar={false}
				newestOnTop={false}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
			/>

			<AppRoutes />
		</QueryClientProvider>
	);
}

// =========================================================
// APP ROUTES
// =========================================================

function AppRoutes() {
	const { loading, session } = useContext(AuthContext);

	// -----------------------------------------------------
	// Supabase is still checking the existing session.
	// -----------------------------------------------------

	if (loading) {
		return <div className="auth-loading">Loading...</div>;
	}

	const isAuthenticated = session !== null;

	return (
		<Routes>
			{/* =================================================
                PUBLIC AUTHENTICATION
            ================================================= */}
			<Route path="/login" element={isAuthenticated ? <Navigate replace to="/cashier" /> : <Login />} />
			<Route path="/signup" element={isAuthenticated ? <Navigate replace to="/cashier" /> : <Signup />} />

			{/* =================================================
                ROOT
            ================================================= */}
			<Route path="/" element={<Navigate replace to={isAuthenticated ? "/cashier" : "/login"} />} />

			{/* =================================================
                HOME
            ================================================= */}
			<Route path="/home" element={<Navigate replace to={isAuthenticated ? "/cashier" : "/login"} />} />

			{/* =================================================
                PROTECTED APPLICATION
            ================================================= */}
			<Route element={isAuthenticated ? <ProtectedLayout /> : <Navigate replace to="/login" />}>
				<Route path="/cashier" element={<Cashier />} />
				<Route path="/transactions" element={<TransactionHistory />} />
				<Route path="/products" element={<ProductCatalog />} />
				{/* =================================================
                DEVELOPMENT ONLY
            	================================================= */}
				<Route path="/dev" element={<Development />} />
			</Route>

			{/* =================================================
                NOT FOUND
            ================================================= */}
			<Route path="/report" element={<Report />} />

			<Route path="*" element={<NotFound />} />
		</Routes>
	);
}

// =========================================================
// PROTECTED LAYOUT
// =========================================================

function ProtectedLayout() {
	return (
		<div className="main-container">
			<Header />

			<div className="main-container__body">
				<Outlet />
			</div>
		</div>
	);
}

export default App;
