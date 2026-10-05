const { connect } = require("./utils/db");
const Event = require("./models/Event");
const { toICS } = require("./utils/ics");

// Unauthenticated iCalendar feed for "subscribe" in calendar apps, which
// can't send our session cookie or bearer token. Public events only — never
// widen this filter.
exports.handler = async function () {
	try {
		await connect();
		// ponytail: sends every public event ever created; filter out old
		// non-recurring ones if the feed gets heavy.
		const events = await Event.find({ visibility: "public" }).lean().exec();
		return {
			statusCode: 200,
			headers: { "Content-Type": "text/calendar; charset=utf-8" },
			body: toICS(events),
		};
	} catch (err) {
		console.error(
			"[calendar] error",
			err && (err.stack || err.message || err)
		);
		return { statusCode: 500, body: "Internal error" };
	}
};
