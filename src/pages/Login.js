import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AUTH_HUB_URL } from "../utils/apiFetch";

export default function Login() {
	const location = useLocation();

	useEffect(() => {
		const returnTo = new URLSearchParams(location.search).get("returnTo");
		// Old-style relative returnTo values (e.g. "/admin") become absolute so
		// the hub can validate the host and send the user back here.
		const target = new URL(returnTo || "/", window.location.origin).href;
		window.location.replace(
			`${AUTH_HUB_URL}/?returnTo=${encodeURIComponent(target)}`
		);
	}, [location.search]);

	return <p>Redirecting to login…</p>;
}
