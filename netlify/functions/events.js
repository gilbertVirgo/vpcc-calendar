const { connect } = require("./utils/db");
const Event = require("./models/Event");
const moment = require("moment");
const { requireAuth } = require("./utils/requireAuth");

exports.handler = async function (event) {
	try {
		const auth = await requireAuth(event);
		if (!auth.ok) return auth.response;

		await connect();

		const method = event.httpMethod;
		const role = auth.user && auth.user.role;

		if (method === "GET") {
			// If id provided, return single event
			const qs = event.queryStringParameters || {};
			if (qs.id) {
				const e = await Event.findById(qs.id).lean().exec();
				if (!e)
					return {
						statusCode: 404,
						body: JSON.stringify({ error: "Not found" }),
					};
				if (e.visibility === "private" && role !== "admin") {
					return {
						statusCode: 403,
						body: JSON.stringify({ error: "Forbidden" }),
					};
				}
				return { statusCode: 200, body: JSON.stringify({ event: e }) };
			}

			// Otherwise expect year & month to return that month's events
			const year = parseInt(qs.year, 10);
			const month = parseInt(qs.month, 10);
			if (!year || !month) {
				return {
					statusCode: 400,
					body: JSON.stringify({
						error: "Provide year and month query params or id",
					}),
				};
			}
			const start = moment({ year: year, month: month - 1, day: 1 })
				.startOf("day")
				.toDate();
			const end = moment(start).endOf("month").endOf("day").toDate();
			const filter = { date: { $gte: start, $lte: end } };
			if (role !== "admin") filter.visibility = "public";
			const events = await Event.find(filter).lean().exec();
			return { statusCode: 200, body: JSON.stringify({ events }) };
		}

		if (method === "POST") {
			if (role !== "admin")
				return {
					statusCode: 403,
					body: JSON.stringify({ error: "Forbidden" }),
				};
			const body = JSON.parse(event.body || "{}");
			const created = await Event.create(body);
			return {
				statusCode: 201,
				body: JSON.stringify({ event: created }),
			};
		}

		if (method === "PUT") {
			if (role !== "admin")
				return {
					statusCode: 403,
					body: JSON.stringify({ error: "Forbidden" }),
				};
			const qs = event.queryStringParameters || {};
			if (!qs.id) {
				return {
					statusCode: 400,
					body: JSON.stringify({
						error: "Missing id query param for PUT",
					}),
				};
			}
			const body = JSON.parse(event.body || "{}");
			const updated = await Event.findByIdAndUpdate(qs.id, body, {
				new: true,
			})
				.lean()
				.exec();
			return {
				statusCode: 200,
				body: JSON.stringify({ event: updated }),
			};
		}

		if (method === "DELETE") {
			if (role !== "admin")
				return {
					statusCode: 403,
					body: JSON.stringify({ error: "Forbidden" }),
				};
			const qs = event.queryStringParameters || {};
			if (!qs.id) {
				return {
					statusCode: 400,
					body: JSON.stringify({
						error: "Missing id query param for DELETE",
					}),
				};
			}
			await Event.findByIdAndDelete(qs.id).exec();
			return { statusCode: 204, body: "" };
		}

		return {
			statusCode: 405,
			body: JSON.stringify({ error: "Method not allowed" }),
		};
	} catch (err) {
		console.error(err);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: err.message || "Internal error" }),
		};
	}
};
