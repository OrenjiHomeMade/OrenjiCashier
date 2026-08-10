import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import { AuthProvider } from "./Component/Context/AuthProvider.tsx";
import App from "./App.tsx";
import { HashRouter } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<AuthProvider>
			<HashRouter>
				<App />
			</HashRouter>
		</AuthProvider>
	</StrictMode>
);
