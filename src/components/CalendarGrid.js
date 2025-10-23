import React from "react";
import moment from "moment";

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
	eventsByDate = {},
	onPrev,
	onNext,
	showCreate = false,
	onCreateClick,
	onEventClick,
}) {
	return (
		<div className="calendar group--vt--md">
			<div className="calendar__header group--hz--md">
				<button onClick={onPrev} aria-label="Previous month">
					◀
				</button>
				<h3 className="calendar__header-title">
					{current.format("MMMM YYYY")}
				</h3>
				<button onClick={onNext} aria-label="Next month">
					▶
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
						!isCurrentMonth || (!eventsByDate[key] && !showCreate);
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

							{eventsByDate[key] && (
								<div className="calendar__event group--vt--xs">
									{(eventsByDate[key] || []).map((ev) => (
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
