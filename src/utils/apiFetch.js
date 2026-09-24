export const AUTH_HUB_URL =
	process.env.REACT_APP_AUTH_HUB_URL || "https://auth.vpcc.church";

// localStorage throws (SecurityError) when storage is blocked; treat that as
// "no stored token" instead of crashing the app.
export function getToken() {
	try {
		return localStorage.getItem("token");
	} catch (err) {
		return null;
	}
}

export function clearToken() {
	try {
		localStorage.removeItem("token");
	} catch (err) {
		// storage blocked: nothing stored to clear
	}
}

export function authHeaders(extra = {}) {
	const token = getToken();
	return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

export default async function apiFetch(input, init) {
	// Send the hub's vpcc_session cookie; callers still add a Bearer header
	// themselves when a localStorage token exists.
	const res = await fetch(input, { credentials: "include", ...init });
	if (res.status === 401) {
		// A stale bearer token would otherwise send us right back into a
		// login loop, so clear it before redirecting to the hub.
		clearToken();
		// Send the user to the auth hub, which redirects back here after login
		window.location.href = `${AUTH_HUB_URL}/?returnTo=${encodeURIComponent(
			window.location.href
		)}`;
		// Throw to stop further handling; callers skip the error UI for this.
		const err = new Error("Unauthorized");
		err.redirecting = true;
		throw err;
	}
	return res;
}

// apiFetch + ok check + JSON parse. Network, HTTP and parse failures all throw
// Error(message) so callers can show it as-is; details go to the console.
export async function apiJson(input, init, message) {
	let res;
	try {
		res = await apiFetch(input, init);
	} catch (err) {
		if (err.redirecting) throw err;
		console.error(message, err);
		throw new Error(message);
	}
	if (!res.ok) {
		console.error(message, res.status, await res.text().catch(() => ""));
		throw new Error(message);
	}
	if (res.status === 204) return null;
	try {
		return await res.json();
	} catch (err) {
		console.error(message, err);
		throw new Error(message);
	}
}
