import moment from "moment";

function toYMD(d) {
	return moment(d).format("YYYY-MM-DD");
}

// Expand recurring weekly events into individual occurrences within a view window
export function expandRecurringEvents(events = [], viewStart, viewEnd) {
	const start = moment(viewStart).startOf("day");
	const end = moment(viewEnd).endOf("day");

	const out = [];

	// index events by id for quick lookup
	const byId = {};
	events.forEach((e) => {
		if (e && e._id) byId[e._id] = e;
	});

	events.forEach((ev) => {
		// normalize date
		if (!ev.date) return;
		const baseDate = moment(ev.date).startOf("day");

		if (!ev.recursWeekly) {
			// simple event, include as-is (ensure date is ISO string)
			out.push({ ...ev, date: moment(ev.date).toISOString() });
			return;
		}

		// recurring weekly event
		const recursion = ev.recursionDetails || {};
		const endDate = recursion.endDate
			? moment(recursion.endDate).endOf("day")
			: null;
		const exceptions = (recursion.exceptions || []).map((d) => toYMD(d));

		// generate occurrences starting from the later of baseDate and viewStart - one week back to cover edge cases
		let cur = baseDate.clone();

		// advance cur to the first occurrence on/after start
		if (cur.isBefore(start, "day")) {
			const diffDays = start.diff(cur, "days");
			const weeks = Math.floor(diffDays / 7);
			cur.add(weeks * 7, "days");
			while (cur.isBefore(start, "day")) cur.add(7, "days");
		}

		while (cur.isSameOrBefore(end, "day")) {
			// stop if beyond configured endDate
			if (endDate && cur.isAfter(endDate, "day")) break;

			const ymd = toYMD(cur);

			// skip if occurrence is in exceptions
			if (!exceptions.includes(ymd)) {
				// If this occurrence matches the original event date and the original event was returned
				// by the backend (i.e., base date within view range), prefer the DB object to avoid dupes.
				const isBaseDate = cur.isSame(baseDate, "day");
				if (
					isBaseDate &&
					ev.date &&
					moment(ev.date).isSame(baseDate, "day")
				) {
					// include db object (already included later when non-recurring branch), but to be safe include ev
					out.push({ ...ev, date: moment(ev.date).toISOString() });
				} else {
					// synthetic occurrence
					out.push({
						// synthetic id to allow UI operations without conflicting with DB ids
						_id: `${ev._id}::${ymd}`,
						baseEventId: ev._id,
						isRecurrence: true,
						date: cur.toISOString(),
						title: ev.title,
						visibility: ev.visibility,
						recursWeekly: ev.recursWeekly,
						recursionDetails: ev.recursionDetails,
						location: ev.location,
						description: ev.description,
						// include original event for editing/deleting operations
						baseEvent: ev,
					});
				}
			}

			cur.add(7, "days");
		}
	});

	// dedupe by _id in case of overlap
	const seen = new Set();
	const deduped = [];
	out.forEach((o) => {
		if (!seen.has(o._id)) {
			seen.add(o._id);
			deduped.push(o);
		}
	});

	// sort by date asc
	deduped.sort((a, b) => moment(a.date).diff(moment(b.date)));
	return deduped;
}

export default expandRecurringEvents;
