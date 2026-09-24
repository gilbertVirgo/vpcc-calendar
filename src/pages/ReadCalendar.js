import React, { useEffect, useMemo, useState } from "react";

import CalendarGrid from "../components/CalendarGrid";
import moment from "moment";
import { apiJson, authHeaders } from "../utils/apiFetch";
import { useError } from "../contexts/ErrorContext";

const LOAD_ERROR = "Couldn't load events. Please try again.";

export default function Calendar() {
	const [current, setCurrent] = useState(() => moment());
	const [events, setEvents] = useState([]);
	const [loading, setLoading] = useState(true);
	// Month whose events are on screen; a same-month reload keeps them visible.
	const [loadedMonth, setLoadedMonth] = useState(null);
	const { setError, clearError } = useError();

	const startOfMonth = useMemo(
		() => current.clone().startOf("month"),
		[current],
	);
	const endOfMonth = useMemo(() => current.clone().endOf("month"), [current]);

	const startDate = useMemo(
		() => startOfMonth.clone().startOf("isoWeek"),
		[startOfMonth],
	);
	const endDate = useMemo(
		() => endOfMonth.clone().endOf("isoWeek"),
		[endOfMonth],
	);

	const days = useMemo(() => {
		const d = [];
		const m = startDate.clone();
		while (m.isSameOrBefore(endDate, "day")) {
			d.push(m.clone());
			m.add(1, "day");
		}
		return d;
	}, [startDate, endDate]);

	useEffect(() => {
		let cancelled = false;
		const y = current.year();
		const m = current.month() + 1; // 1-based
		const key = current.format("YYYY-MM");
		setLoading(true);
		apiJson(
			`/.netlify/functions/events?year=${y}&month=${m}`,
			{ headers: authHeaders() },
			LOAD_ERROR,
		)
			.then((data) => {
				if (cancelled) return;
				setEvents((data && data.events) || []);
				setLoading(false);
				setLoadedMonth(key);
				clearError(LOAD_ERROR);
			})
			.catch((err) => {
				if (cancelled || err.redirecting) return;
				setEvents([]);
				setLoading(false);
				setLoadedMonth(key);
				setError(err.message);
			});
		return () => {
			cancelled = true;
		};
	}, [current, setError, clearError]);

	function prevMonth() {
		setCurrent((c) => c.clone().subtract(1, "month"));
	}
	function nextMonth() {
		setCurrent((c) => c.clone().add(1, "month"));
	}

	return (
		<div className="page page--calendar">
			<CalendarGrid
				days={days}
				current={current}
				events={events}
				loading={loading}
				skeleton={loading && loadedMonth !== current.format("YYYY-MM")}
				onPrev={prevMonth}
				onNext={nextMonth}
			/>
		</div>
	);
}
