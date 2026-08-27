// IMPORT STYLES
import "./index.css";
// IMPORT COMPONENTS
import App from "./App.tsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./Component/Context/AuthProvider.tsx";
import { HashRouter } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<HashRouter>
			<AuthProvider>
				<App />
			</AuthProvider>
		</HashRouter>
	</StrictMode>
);
