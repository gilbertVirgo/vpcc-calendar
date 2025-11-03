import React, { useMemo } from "react";
import moment from "moment";
import expandRecurringEvents from "../utils/eventUtils";

function formatTime(arrOrObj) {
	if (!arrOrObj) return null;
	let arr = null;
	if (Array.isArray(arrOrObj)) arr = arrOrObj;
	else if (arrOrObj.start && Array.isArray(arrOrObj.start))
		arr = arrOrObj.start;
	if (!arr) return null;
	const h = Number(arr[0]);
	const m = Number(arr[1] || 0);
	if (Number.isNaN(h) || Number.isNaN(m)) return null;
	const fmt = m === 0 ? "ha" : "h:mma";
	return moment({ hour: h, minute: m }).format(fmt);
}

// CalendarGrid is a presentational component used by Calendar and EditCalendar.
// Props:
// - days: array of moment days to render (in order)
// - current: moment for selected month
// - eventsByDate: { 'YYYY-MM-DD': [event] }
// - onPrev, onNext: navigation handlers
// - showCreate: boolean to show + button in cells
// - onCreateClick(dateMoment): called when + clicked
export default function CalendarGrid({
	days,
	current,
	eventsByDate = null,
	events = [],
	expandRecurrences = true,
	onPrev,
	onNext,
	showCreate = false,
	onCreateClick,
	onEventClick,
}) {
	// Compute grouped events. Priority:
	// 1) if eventsByDate provided, use it
	// 2) otherwise take raw events, optionally expand recurrences for the visible window,
	//    then group by YYYY-MM-DD
	const grouped = useMemo(() => {
		if (eventsByDate) return eventsByDate;

		let list = events || [];

		if (expandRecurrences && list && list.length && days && days.length) {
			const viewStart = days[0].toISOString();
			const viewEnd = days[days.length - 1].toISOString();
			try {
				list = expandRecurringEvents(list, viewStart, viewEnd);
			} catch (err) {
				console.error(
					"[CalendarGrid] expandRecurringEvents error",
					err
				);
			}
		}

		const map = {};
		(list || []).forEach((ev) => {
			if (!ev || !ev.date) return;
			const k = moment(ev.date).format("YYYY-MM-DD");
			if (!map[k]) map[k] = [];
			map[k].push(ev);
		});

		// Sort events in each day by start time (earlier first). Events without a
		// start time are placed after timed events.
		Object.keys(map).forEach((k) => {
			map[k].sort((a, b) => {
				function startMinutes(ev) {
					const t = ev && (ev.time || ev.start);
					let arr = null;
					if (!t) return Number.POSITIVE_INFINITY;
					if (Array.isArray(t)) arr = t;
					else if (Array.isArray(t.start)) arr = t.start;
					else return Number.POSITIVE_INFINITY;
					const h = Number(arr[0]) || 0;
					const m = Number(arr[1]) || 0;
					if (Number.isNaN(h) || Number.isNaN(m))
						return Number.POSITIVE_INFINITY;
					return h * 60 + m;
				}

				const sa = startMinutes(a);
				const sb = startMinutes(b);
				if (sa === sb) {
					// Tie-breaker: shorter title first, then id
					if (a.title && b.title)
						return a.title.localeCompare(b.title);
					return (a._id || "").localeCompare(b._id || "");
				}
				return sa - sb;
			});
		});
		return map;
	}, [eventsByDate, events, days, expandRecurrences]);

	// prevent navigating to months before current real-world month
	const todayStart = moment().startOf("month");
	const canGoPrev =
		current && current.clone().startOf("month").isAfter(todayStart);

	return (
		<div className="calendar group--vt--md">
			<div className="calendar__header group--hz--md">
				<button
					onClick={() => canGoPrev && onPrev && onPrev()}
					aria-label="Previous month"
					disabled={!canGoPrev}
					title={
						canGoPrev
							? "Previous month"
							: "Cannot navigate to past months"
					}
				>
					←
				</button>
				<h2 className="calendar__header-title">
					{current.format("MMMM YYYY")}
				</h2>
				<button onClick={onNext} aria-label="Next month">
					→
				</button>
			</div>

			<div className="calendar__grid">
				{Array.from({ length: 7 }).map((_, i) => (
					<div key={i} className="calendar__week-name hide--sm-down">
						{moment().day(i).format("ddd")}
					</div>
				))}
				{days.map((day) => {
					const isCurrentMonth = day.month() === current.month();
					const key = day.format("YYYY-MM-DD");

					let shouldHideOnMobile =
						!isCurrentMonth || (!grouped[key] && !showCreate);
					return (
						<div
							key={key}
							className={`calendar__cell group--vt--sm ${
								!isCurrentMonth
									? "calendar__cell--not-current-month"
									: ""
							}
						${shouldHideOnMobile ? "hide--sm-down" : ""}`}
						>
							<p
								className="hide--sm-down"
								style={{ textAlign: "right" }}
							>
								{day.format("D")}
							</p>
							<p className="hide--sm-up">
								{day.format("dddd D MMMM")}
							</p>

							{grouped[key] && (
								<div className="calendar__event group--vt--xs">
									{(grouped[key] || []).map((ev) => (
										<div
											key={ev._id}
											className="calendar__event-item group--vt--xs"
											role={
												onEventClick
													? "button"
													: undefined
											}
											tabIndex={
												onEventClick ? 0 : undefined
											}
											onClick={() =>
												onEventClick && onEventClick(ev)
											}
											onKeyPress={(e) => {
												if (
													onEventClick &&
													(e.key === "Enter" ||
														e.key === " ")
												) {
													onEventClick(ev);
												}
											}}
										>
											<h3>{ev.title}</h3>
											{ev.location && (
												<p>{ev.location}</p>
											)}
											{(ev.time ||
												ev.start ||
												ev.time?.start) && (
												<p className="small">
													{formatTime(
														ev.time ||
															ev.start ||
															(ev.time &&
																ev.time.start)
													)}
													-
													{formatTime(
														ev.time?.end ||
															ev.end ||
															(ev.time &&
																ev.time.end)
													)}
												</p>
											)}

											{/* {ev.description && (
												<p className="small">
													{ev.description}
												</p>
											)} */}
										</div>
									))}
								</div>
							)}

							{showCreate && isCurrentMonth && (
								<button
									onClick={() =>
										onCreateClick && onCreateClick(day)
									}
									aria-label={`Add event ${key}`}
								>
									+
								</button>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
