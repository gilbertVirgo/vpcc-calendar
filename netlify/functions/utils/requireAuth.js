const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

function unauthorized() {
	return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
}

async function requireAuth(event) {
	if (!JWT_SECRET) throw new Error("JWT_SECRET not configured");
	const auth =
		event.headers &&
		(event.headers.Authorization || event.headers.authorization);
	if (!auth) return { ok: false, response: unauthorized() };
	const m = auth.match(/^Bearer\s+(.+)$/i);
	if (!m) return { ok: false, response: unauthorized() };
	const token = m[1];
	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		return { ok: true, user: decoded };
	} catch (err) {
		return { ok: false, response: unauthorized() };
	}
}

module.exports = { requireAuth };
