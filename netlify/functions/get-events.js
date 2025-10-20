const moment = require("moment");
const { connect } = require("./utils/db");
const Event = require("./models/Event");
const { requireAuth } = require("./utils/requireAuth");

exports.handler = async function (event) {
	try {
		const auth = await requireAuth(event);
		if (!auth.ok) return auth.response;
		const role = auth.user && auth.user.role;
		const qs = event.queryStringParameters || {};
		const year = parseInt(qs.year, 10);
		const month = parseInt(qs.month, 10); // 1-based (1 = Jan)

		if (!year || !month || month < 1 || month > 12) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					error: "Invalid or missing 'year' or 'month' query parameters",
				}),
			};
		}

		await connect();

		const start = moment({ year: year, month: month - 1, day: 1 })
			.startOf("day")
			.toDate();
		const end = moment(start).endOf("month").endOf("day").toDate();

		const filter = { date: { $gte: start, $lte: end } };
		// non-admins only see public events
		if (role !== "admin") {
			filter.visibility = "public";
		}

		const events = await Event.find(filter).lean().exec();

		return {
			statusCode: 200,
			body: JSON.stringify({ events }),
		};
	} catch (err) {
		console.error(err);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: err.message || "Internal error" }),
		};
	}
};
