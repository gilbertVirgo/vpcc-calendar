const test = require("node:test");
const assert = require("node:assert");
const { getCookie } = require("./cookies");

test("returns null for missing or empty header", () => {
	assert.strictEqual(getCookie(undefined, "vpcc_session"), null);
	assert.strictEqual(getCookie("", "vpcc_session"), null);
});

test("finds the named cookie among others", () => {
	assert.strictEqual(
		getCookie("foo=1; vpcc_session=abc.def.ghi; bar=2", "vpcc_session"),
		"abc.def.ghi"
	);
});

test("returns null when the cookie is absent", () => {
	assert.strictEqual(getCookie("foo=1; bar=2", "vpcc_session"), null);
});

test("does not match a cookie whose name only ends with the name", () => {
	assert.strictEqual(getCookie("xvpcc_session=nope", "vpcc_session"), null);
});

test("keeps '=' characters inside the value", () => {
	assert.strictEqual(getCookie("a=b=c", "a"), "b=c");
});

test("url-decodes the value", () => {
	assert.strictEqual(getCookie("a=hello%20world", "a"), "hello world");
});
