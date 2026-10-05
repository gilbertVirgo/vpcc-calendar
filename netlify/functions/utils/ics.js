// Events store a calendar day (local midnight in the admin's browser) plus
// wall-clock [hour, minute] times with no zone, so the feed pins everything
// to one zone. Changing TZ means replacing VTIMEZONE to match.
const TZ = "Europe/London";

const VTIMEZONE = [
	"BEGIN:VTIMEZONE",
	`TZID:${TZ}`,
	"BEGIN:DAYLIGHT",
	"TZOFFSETFROM:+0000",
	"TZOFFSETTO:+0100",
	"TZNAME:BST",
	"DTSTART:19700329T010000",
	"RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
	"END:DAYLIGHT",
	"BEGIN:STANDARD",
	"TZOFFSETFROM:+0100",
	"TZOFFSETTO:+0000",
	"TZNAME:GMT",
	"DTSTART:19701025T020000",
	"RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
	"END:STANDARD",
	"END:VTIMEZONE",
];

// en-CA formats as YYYY-MM-DD
const dayFormat = new Intl.DateTimeFormat("en-CA", {
	timeZone: TZ,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

// Calendar day in TZ as YYYYMMDD
function ymd(date) {
	return dayFormat.format(new Date(date)).replace(/-/g, "");
}

// [hour, minute] as HHMMSS
function hms(t) {
	const pad = (n) => String(n || 0).padStart(2, "0");
	return `${pad(t[0])}${pad(t[1])}00`;
}

function hasTime(t) {
	return Array.isArray(t) && t.length > 0;
}

function escapeText(s) {
	return String(s)
		.replace(/\\/g, "\\\\")
		.replace(/([;,])/g, "\\$1")
		.replace(/\r?\n/g, "\\n");
}

// ponytail: folds by character, not octet, so lines of multi-byte text can
// exceed the 75-octet limit. Calendar apps tolerate it; fold on bytes if one
// ever doesn't.
function fold(line) {
	return line.match(/.{1,74}/gu).join("\r\n ");
}

function vevent(ev) {
	const time = ev.time || {};
	const timed = hasTime(time.start);
	// Date property value: timed events carry the start time, others are all-day
	const on = (date) =>
		timed
			? `;TZID=${TZ}:${ymd(date)}T${hms(time.start)}`
			: `;VALUE=DATE:${ymd(date)}`;

	const out = [
		"BEGIN:VEVENT",
		`UID:${ev._id}@vpcc-calendar`,
		`DTSTAMP:${new Date(ev.updatedAt || Date.now())
			.toISOString()
			.replace(/[-:]|\.\d{3}/g, "")}`,
		`DTSTART${on(ev.date)}`,
	];
	if (timed && hasTime(time.end)) {
		out.push(`DTEND;TZID=${TZ}:${ymd(ev.date)}T${hms(time.end)}`);
	}

	if (ev.recursWeekly) {
		const { endDate, exceptions = [] } = ev.recursionDetails || {};
		// ponytail: UNTIL must be UTC for timed events; end-of-day UTC is up to
		// an hour past end-of-day London in BST. Only matters for an event
		// starting 00:00–00:59 the day after endDate.
		const until = endDate
			? `;UNTIL=${ymd(endDate)}${timed ? "T235959Z" : ""}`
			: "";
		out.push(`RRULE:FREQ=WEEKLY${until}`);
		exceptions.forEach((d) => out.push(`EXDATE${on(d)}`));
	}

	out.push(`SUMMARY:${escapeText(ev.title)}`);
	if (ev.location) out.push(`LOCATION:${escapeText(ev.location)}`);
	if (ev.description) out.push(`DESCRIPTION:${escapeText(ev.description)}`);
	out.push("END:VEVENT");
	return out;
}

// iCalendar (RFC 5545) feed for Event documents.
function toICS(events) {
	return (
		[
			"BEGIN:VCALENDAR",
			"VERSION:2.0",
			"PRODID:-//VPCC//Calendar//EN",
			"CALSCALE:GREGORIAN",
			"X-WR-CALNAME:VPCC Calendar",
			`X-WR-TIMEZONE:${TZ}`,
			...VTIMEZONE,
			...events.flatMap(vevent),
			"END:VCALENDAR",
		]
			.map(fold)
			.join("\r\n") + "\r\n"
	);
}

module.exports = { toICS };
