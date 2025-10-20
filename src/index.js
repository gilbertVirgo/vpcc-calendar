import "./index.scss";

import App from "./App";
import { ErrorProvider } from "./contexts/ErrorContext";
import { ModalProvider } from "./contexts/ModalContext";
import React from "react";
import ReactDOM from "react-dom/client";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
	<ErrorProvider>
		<ModalProvider>
			<App />
		</ModalProvider>
	</ErrorProvider>
);
