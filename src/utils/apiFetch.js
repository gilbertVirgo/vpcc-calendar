export default async function apiFetch(input, init) {
	const res = await fetch(input, init);
	if (res.status === 401 || res.status === 403) {
		// Immediately redirect to login for unauthorized responses
		// Preserve current location so user can be redirected back after login if desired
		const returnTo = encodeURIComponent(
			window.location.pathname + window.location.search
		);
		window.location.href = `/login?returnTo=${returnTo}`;
		// Throw to stop further handling
		throw new Error("Unauthorized");
	}
	return res;
}
