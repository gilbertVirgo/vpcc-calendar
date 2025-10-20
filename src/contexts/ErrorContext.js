import React, { createContext, useCallback, useContext, useState } from "react";

// ErrorContext provides a simple app-wide error state and helpers.
// Value shape: { error: string|null, setError: (msg) => void, clearError: () => void }
const ErrorContext = createContext(null);

export function ErrorProvider({ children }) {
	const [error, setErrorState] = useState(null);

	const setError = useCallback((msg) => {
		// accept either string or Error
		if (msg instanceof Error) setErrorState(msg.message);
		else setErrorState(msg);
	}, []);

	const clearError = useCallback(() => setErrorState(null), []);

	const value = {
		error,
		setError,
		clearError,
	};

	return (
		<ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>
	);
}

// Hook for components to access the error context
export function useError() {
	const ctx = useContext(ErrorContext);
	if (!ctx) {
		throw new Error("useError must be used within an ErrorProvider");
	}
	return ctx;
}

export default ErrorContext;
