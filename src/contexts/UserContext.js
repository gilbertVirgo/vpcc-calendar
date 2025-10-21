import React, { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

const UserContext = createContext();

export function UserProvider({ children }) {
	const [user, setUser] = useState(null);
	const [refreshToken, setRefreshToken] = useState(0);

	useEffect(() => {
		const token = localStorage.getItem("token");
		if (token) {
			try {
				const decoded = jwtDecode(token);
				setUser(decoded);
			} catch (error) {
				console.error("Invalid token", error);
				localStorage.removeItem("token");
			}
		} else {
			setUser(null);
		}
	}, [refreshToken]);

	const logout = () => {
		localStorage.removeItem("token");
		setUser(null);
	};

	const refreshUser = () => {
		setRefreshToken((prev) => prev + 1);
	};

	return (
		<UserContext.Provider value={{ user, logout, refreshUser }}>
			{children}
		</UserContext.Provider>
	);
}

export function useUser() {
	return useContext(UserContext);
}
