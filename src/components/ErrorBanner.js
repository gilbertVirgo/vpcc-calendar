import React from "react";
import { useError } from "../contexts/ErrorContext";

export default function ErrorBanner() {
	const { error, clearError } = useError();

	if (!error) return null;

	return (
		<div className="error-banner" role="alert">
			<div>{error}</div>
			<button className="button--ghost" onClick={clearError}>
				Clear
			</button>
		</div>
	);
}
