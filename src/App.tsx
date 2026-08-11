import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
// import { useContext } from "react";

import "./App.css";
import Header from "./Component/Header/Header";
import NotFound from "./Page/NotFound/NotFound";
import { Navigate, Route, Routes } from "react-router-dom";
import Cashier from "./Page/Cashier/Cashier";
import TransactionHistory from "./Page/TransactionHistory/TransactionHistory";
import ProductCatalog from "./Page/ProductCatalog/ProductCatalog";
// import AuthContext, { type TUserContext } from "./Component/Context/AuthProvider";
// import { Navigate, Route, Routes } from "react-router-dom";

function App() {
	// const { user } = useContext(AuthContext);
	const queryClient = new QueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			<div className="main-container">
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
				<Header />
				<div className="main-container__body">
					<AppRoutes />
				</div>
			</div>
		</QueryClientProvider>
	);
}

function AppRoutes() {
	// const { currentUser } = props;
	// 	if (currentUser) {
	return (
		<Routes>
			<Route path="/" element={<Navigate replace to="/cashier"></Navigate>} />
			<Route path="/cashier" element={<Cashier />} />
			<Route path="/transactions" element={<TransactionHistory />} />
			<Route path="/products" element={<ProductCatalog />} />
			<Route path="/*" element={<NotFound />} />
		</Routes>
	);
}

export default App;
