// This function is intended for local development only.
// It will only perform a disconnect when the DEV_DISCONNECT env var is set to 'true'.
// When not enabled it returns a 404 to avoid exposing the endpoint in prod.

exports.handler = async function (event, context) {
	const enabled =
		String(process.env.DEV_DISCONNECT || "").toLowerCase() === "true";
	console.log("[runtime/disconnect] invoked", {
		enabled,
		method: event.httpMethod,
		path: event.path,
	});

	if (!enabled) {
		return {
			statusCode: 404,
			body: JSON.stringify({ ok: false, error: "not found" }),
		};
	}

	// require lazily so we don't load db code in production environments
	const { disconnect } = require("../utils/db");

	try {
		await disconnect();
		return {
			statusCode: 200,
			body: JSON.stringify({ ok: true, message: "disconnected" }),
		};
	} catch (err) {
		console.error(
			"[runtime/disconnect] error",
			err && err.message ? err.message : err
		);
		return {
			statusCode: 500,
			body: JSON.stringify({
				ok: false,
				error: err && err.message ? err.message : String(err),
			}),
		};
	}
};
