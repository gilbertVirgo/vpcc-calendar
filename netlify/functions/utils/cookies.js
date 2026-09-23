// Parse a single cookie value out of a raw Cookie header.
function getCookie(cookieHeader, name) {
	if (!cookieHeader) return null;
	for (const part of cookieHeader.split(";")) {
		const i = part.indexOf("=");
		if (i === -1) continue;
		if (part.slice(0, i).trim() !== name) continue;
		const value = part.slice(i + 1).trim();
		try {
			return decodeURIComponent(value);
		} catch (err) {
			return value;
		}
	}
	return null;
}

module.exports = { getCookie };
