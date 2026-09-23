// JWT_SECRET is read when requireAuth.js loads, so set it before require.
process.env.JWT_SECRET = "test-secret";

const test = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");
const { requireAuth } = require("./requireAuth");

const token = jwt.sign(
	{ id: "1", username: "admin", role: "admin" },
	"test-secret",
	{ expiresIn: "1h" }
);

test("accepts a bearer header", async () => {
	const r = await requireAuth({
		headers: { authorization: `Bearer ${token}` },
	});
	assert.strictEqual(r.ok, true);
	assert.strictEqual(r.user.role, "admin");
});

test("accepts the vpcc_session cookie when there is no header", async () => {
	const r = await requireAuth({
		headers: { cookie: `other=1; vpcc_session=${token}` },
	});
	assert.strictEqual(r.ok, true);
	assert.strictEqual(r.user.username, "admin");
});

test("rejects a request with no credentials", async () => {
	const r = await requireAuth({ headers: {} });
	assert.strictEqual(r.ok, false);
	assert.strictEqual(r.response.statusCode, 401);
});

test("rejects an invalid cookie token", async () => {
	const r = await requireAuth({
		headers: { cookie: "vpcc_session=not-a-jwt" },
	});
	assert.strictEqual(r.ok, false);
	assert.strictEqual(r.response.statusCode, 401);
});

test("rejects a cookie token signed with another secret", async () => {
	const forged = jwt.sign({ id: "1", role: "admin" }, "wrong-secret");
	const r = await requireAuth({
		headers: { cookie: `vpcc_session=${forged}` },
	});
	assert.strictEqual(r.ok, false);
});

test("a present bearer header takes precedence over the cookie", async () => {
	const r = await requireAuth({
		headers: {
			authorization: "Bearer garbage",
			cookie: `vpcc_session=${token}`,
		},
	});
	assert.strictEqual(r.ok, false);
});
