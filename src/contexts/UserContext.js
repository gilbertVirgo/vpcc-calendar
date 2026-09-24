import React, { createContext, useContext, useEffect, useState } from "react";
import { AUTH_HUB_URL, clearToken, getToken } from "../utils/apiFetch";
import { useError } from "./ErrorContext";
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
	const { setError } = useError();

	useEffect(() => {
		const token = getToken();
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
						clearToken();
						setUser(null);
						return;
					}
					// schedule auto-logout when token expires
					const msUntilExpiry = decoded.exp * 1000 - Date.now();
					expiryTimer = setTimeout(() => {
						clearToken();
						setUser(null);
					}, msUntilExpiry);
				}
				setUser(decoded);
			} catch (error) {
				console.error("Invalid token", error);
				clearToken();
			}
		} else {
			setUser(null);
			// No local token: check for an auth hub session cookie. Plain fetch
			// (not apiFetch) so a 401 leaves public visitors on the public view.
			// 401 just means "not signed in"; anything else is a real failure.
			fetch("/.netlify/functions/me", { credentials: "include" })
				.then((res) => {
					if (res.status === 401) return null;
					if (!res.ok) throw new Error(`Status ${res.status}`);
					return res.json();
				})
				.then((data) => {
					if (!cancelled && data && data.user) setUser(data.user);
				})
				.catch((err) => {
					console.error("Session check failed", err);
					if (!cancelled)
						setError(
							"Couldn't check whether you're signed in. Try reloading the page."
						);
				});
		}

		return () => {
			cancelled = true;
			if (expiryTimer) clearTimeout(expiryTimer);
		};
	}, [refreshToken, setError]);

	// Clears the hub's shared vpcc_session cookie, then local state. Throws if
	// the hub didn't confirm, so the UI never pretends to be logged out while
	// the cookie would log the user straight back in via /me.
	const logout = async () => {
		// The hub answers 415 (and keeps the cookie) unless the body is JSON.
		const res = await fetch(`${AUTH_HUB_URL}/api/logout`, {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: "{}",
		});
		if (!res.ok) throw new Error(`Hub logout failed: ${res.status}`);
		clearToken();
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
