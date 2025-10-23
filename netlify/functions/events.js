const { connect } = require("./utils/db");
const Event = require("./models/Event");
const moment = require("moment");
const { requireAuth } = require("./utils/requireAuth");

exports.handler = async function (event) {
	try {
		// Log incoming request for debugging
		console.log("[events] incoming request", {
			method: event.httpMethod,
			path: event.path,
			qs: event.queryStringParameters,
		});
		// Allow unauthenticated GET requests so public calendars can be viewed
		// without a token. For non-GET methods require authentication.
		let role = null;
		const method = event.httpMethod;

		// If a token is present, validate and set role. For non-GET methods
		// authentication is mandatory.
		const hasAuthHeader =
			event.headers &&
			(event.headers.Authorization || event.headers.authorization);

		if (method !== "GET") {
			const auth = await requireAuth(event);
			if (!auth.ok) return auth.response;
			role = auth.user && auth.user.role;
			console.log("[events] authenticated user role", { role });
		} else if (hasAuthHeader) {
			const auth = await requireAuth(event);
			if (auth.ok) role = auth.user && auth.user.role;
			console.log("[events] optional auth header present, role set to", {
				role,
			});
		}

		await connect();
		console.log("[events] DB connected");

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
			console.log("[events] query range", {
				start: start.toISOString(),
				end: end.toISOString(),
				year,
				month,
			});

			// Get all events that could affect this month:
			// 1. Events with date within current month
			// 2. Recurring events that started before current month (they'll be expanded on frontend)
			const filter = {
				$or: [
					// Events within current month (both recurring and non-recurring)
					{ date: { $gte: start, $lte: end } },
					// Recurring events that started before current month
					{
						recursWeekly: true,
						date: { $lt: start },
						$or: [
							{ "recursionDetails.endDate": { $exists: false } },
							{ "recursionDetails.endDate": null },
							{ "recursionDetails.endDate": { $gte: start } },
						],
					},
				],
			};
			if (role !== "admin") filter.visibility = "public";
			const events = await Event.find(filter).lean().exec();
			console.log("[events] returning events count", {
				count: events.length,
			});
			return { statusCode: 200, body: JSON.stringify({ events }) };
		}

		if (method === "POST") {
			if (role !== "admin")
				return {
					statusCode: 403,
					body: JSON.stringify({ error: "Forbidden" }),
				};
			const body = JSON.parse(event.body || "{}");
			console.log("[events] POST body", body);
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
			console.log("[events] PUT qs", qs);
			if (!qs.id) {
				return {
					statusCode: 400,
					body: JSON.stringify({
						error: "Missing id query param for PUT",
					}),
				};
			}
			const body = JSON.parse(event.body || "{}");
			console.log("[events] PUT body", { id: qs.id, body });
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
			console.log("[events] DELETE qs", qs);
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
		console.error(
			"[events] error",
			err && (err.stack || err.message || err)
		);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: err.message || "Internal error" }),
		};
	}
};
