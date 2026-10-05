const test = require("node:test");
const assert = require("node:assert");
const { toICS } = require("./ics");

// Unfolded content lines of the feed for the given events.
function lines(events) {
	return toICS(events).replace(/\r\n /g, "").split("\r\n");
}

const base = {
	_id: "abc123",
	title: "Sunday Service",
	// Local midnight in London during BST, as the admin's browser stores it
	date: new Date("2026-07-04T23:00:00.000Z"),
	updatedAt: new Date("2026-06-01T09:30:00.000Z"),
	time: { start: [10, 30], end: [12, 0] },
};

test("wraps events in a CRLF-delimited VCALENDAR", () => {
	const ics = toICS([base]);
	assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
	assert.ok(ics.endsWith("END:VEVENT\r\nEND:VCALENDAR\r\n"));
	assert.ok(!/[^\r]\n/.test(ics), "bare LF found");
});

test("timed event uses the London calendar day and wall-clock times", () => {
	const out = lines([base]);
	assert.ok(out.includes("UID:abc123@vpcc-calendar"));
	assert.ok(out.includes("DTSTAMP:20260601T093000Z"));
	assert.ok(out.includes("DTSTART;TZID=Europe/London:20260705T103000"));
	assert.ok(out.includes("DTEND;TZID=Europe/London:20260705T120000"));
	assert.ok(out.includes("SUMMARY:Sunday Service"));
});

test("event without a start time is all-day", () => {
	// Mongoose defaults the unset time arrays to []
	const out = lines([{ ...base, time: { start: [], end: [] } }]);
	assert.ok(out.includes("DTSTART;VALUE=DATE:20260705"));
	assert.ok(!out.some((l) => l.startsWith("DTEND")));
});

test("weekly recurrence emits RRULE with UNTIL and EXDATEs", () => {
	const out = lines([
		{
			...base,
			recursWeekly: true,
			recursionDetails: {
				endDate: new Date("2026-08-01T23:00:00.000Z"), // 2 Aug in London
				exceptions: [new Date("2026-07-11T23:00:00.000Z")], // 12 Jul
			},
		},
	]);
	assert.ok(out.includes("RRULE:FREQ=WEEKLY;UNTIL=20260802T235959Z"));
	assert.ok(out.includes("EXDATE;TZID=Europe/London:20260712T103000"));
});

test("open-ended recurrence has no UNTIL; non-recurring has no RRULE", () => {
	const recurring = lines([{ ...base, recursWeekly: true }]);
	assert.ok(recurring.includes("RRULE:FREQ=WEEKLY"));
	// VTIMEZONE has yearly RRULEs of its own, so match the weekly one
	assert.ok(!lines([base]).some((l) => l.startsWith("RRULE:FREQ=WEEKLY")));
});

test("escapes text and omits empty optional fields", () => {
	const out = lines([
		{
			...base,
			title: "Tea, cake; chat",
			location: "",
			description: "Line one\nLine two \\ end",
		},
	]);
	assert.ok(out.includes("SUMMARY:Tea\\, cake\\; chat"));
	assert.ok(out.includes("DESCRIPTION:Line one\\nLine two \\\\ end"));
	assert.ok(!out.some((l) => l.startsWith("LOCATION")));
});

test("folds long lines to 75 characters", () => {
	const description = "x".repeat(300);
	const ics = toICS([{ ...base, description }]);
	assert.ok(ics.split("\r\n").every((l) => l.length <= 75));
	assert.ok(lines([{ ...base, description }]).includes(`DESCRIPTION:${description}`));
});
