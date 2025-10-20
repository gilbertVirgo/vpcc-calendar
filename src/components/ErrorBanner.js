import React from "react";
import { useError } from "../contexts/ErrorContext";

export default function ErrorBanner() {
	const { error, clearError } = useError();

	if (!error) return null;

	return (
		<div>
			<div>{error}</div>
			<button onClick={clearError}>Clear</button>
		</div>
	);
}
