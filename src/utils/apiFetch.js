export const AUTH_HUB_URL =
	process.env.REACT_APP_AUTH_HUB_URL || "https://auth.vpcc.church";

export default async function apiFetch(input, init) {
	// Send the hub's vpcc_session cookie; callers still add a Bearer header
	// themselves when a localStorage token exists.
	const res = await fetch(input, { credentials: "include", ...init });
	if (res.status === 401) {
		// A stale bearer token would otherwise send us right back into a
		// login loop, so clear it before redirecting to the hub.
		localStorage.removeItem("token");
		// Send the user to the auth hub, which redirects back here after login
		window.location.href = `${AUTH_HUB_URL}/?returnTo=${encodeURIComponent(
			window.location.href
		)}`;
		// Throw to stop further handling
		throw new Error("Unauthorized");
	}
	return res;
}
