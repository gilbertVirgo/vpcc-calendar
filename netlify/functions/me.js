const { requireAuth } = require("./utils/requireAuth");

exports.handler = async function (event) {
	try {
		const auth = await requireAuth(event);
		if (!auth.ok) return auth.response;
		const { id, username, role } = auth.user;
		return {
			statusCode: 200,
			body: JSON.stringify({ user: { id, username, role } }),
		};
	} catch (err) {
		console.error(err);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: err.message || "Internal error" }),
		};
	}
};
