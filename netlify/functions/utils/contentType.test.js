const test = require("node:test");
const assert = require("node:assert");
const { isJson } = require("./contentType");

test("accepts application/json", () => {
	assert.strictEqual(isJson({ "content-type": "application/json" }), true);
});

test("accepts application/json with charset", () => {
	assert.strictEqual(
		isJson({ "content-type": "application/json; charset=utf-8" }),
		true
	);
});

test("rejects text/plain", () => {
	assert.strictEqual(isJson({ "content-type": "text/plain" }), false);
});

test("rejects missing header", () => {
	assert.strictEqual(isJson({}), false);
	assert.strictEqual(isJson(undefined), false);
});
