const jwt = require("jsonwebtoken");
const { getCookie } = require("./cookies");

const JWT_SECRET = process.env.JWT_SECRET;

function unauthorized() {
	return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
}

async function requireAuth(event) {
	if (!JWT_SECRET) throw new Error("JWT_SECRET not configured");
	const headers = event.headers || {};
	const auth = headers.Authorization || headers.authorization;
	let token;
	if (auth) {
		const m = auth.match(/^Bearer\s+(.+)$/i);
		if (!m) return { ok: false, response: unauthorized() };
		token = m[1];
	} else {
		// No bearer header: fall back to the auth hub's shared session cookie
		token = getCookie(headers.cookie || headers.Cookie, "vpcc_session");
		if (!token) return { ok: false, response: unauthorized() };
	}
	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		return { ok: true, user: decoded };
	} catch (err) {
		return { ok: false, response: unauthorized() };
	}
}

module.exports = { requireAuth };
