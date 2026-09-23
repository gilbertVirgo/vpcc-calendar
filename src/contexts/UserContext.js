import React, { createContext, useContext, useEffect, useState } from "react";
// Small JWT payload decoder (avoid external dependency differences)
function decodeJwt(token) {
	try {
		const parts = token.split(".");
		if (parts.length < 2) return null;
		const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		const padded = payload.padEnd(
			payload.length + ((4 - (payload.length % 4)) % 4),
			"="
		);
		const json = decodeURIComponent(
			atob(padded)
				.split("")
				.map(function (c) {
					return (
						"%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
					);
				})
				.join("")
		);
		return JSON.parse(json);
	} catch (e) {
		return null;
	}
}

const UserContext = createContext();

export function UserProvider({ children }) {
	const [user, setUser] = useState(null);
	const [refreshToken, setRefreshToken] = useState(0);

	useEffect(() => {
		const token = localStorage.getItem("token");
		let expiryTimer = null;
		let cancelled = false;
		if (token) {
			try {
				const decoded = decodeJwt(token);
				// If token has an exp claim (seconds since epoch), check expiry
				if (decoded && decoded.exp) {
					const nowSec = Date.now() / 1000;
					if (nowSec >= decoded.exp) {
						console.info("Token expired, removing");
						localStorage.removeItem("token");
						setUser(null);
						return;
					}
					// schedule auto-logout when token expires
					const msUntilExpiry = decoded.exp * 1000 - Date.now();
					expiryTimer = setTimeout(() => {
						localStorage.removeItem("token");
						setUser(null);
					}, msUntilExpiry);
				}
				setUser(decoded);
			} catch (error) {
				console.error("Invalid token", error);
				localStorage.removeItem("token");
			}
		} else {
			setUser(null);
			// No local token: check for an auth hub session cookie. Plain fetch
			// (not apiFetch) so a 401 leaves public visitors on the public view.
			fetch("/.netlify/functions/me", { credentials: "include" })
				.then((res) => (res.ok ? res.json() : null))
				.then((data) => {
					if (!cancelled && data && data.user) setUser(data.user);
				})
				.catch((err) => console.error("Session check failed", err));
		}

		return () => {
			cancelled = true;
			if (expiryTimer) clearTimeout(expiryTimer);
		};
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
