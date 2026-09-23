// True if the request's Content-Type header starts with application/json.
function isJson(headers) {
	if (!headers) return false;
	const value = headers["content-type"] || headers["Content-Type"];
	return !!value && value.toLowerCase().startsWith("application/json");
}

module.exports = { isJson };
