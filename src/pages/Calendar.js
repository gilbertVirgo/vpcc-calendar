import { CreateEventForm, EditEventForm } from "../components/EventModals";
import React, { useEffect, useMemo, useState } from "react";

import CalendarGrid from "../components/CalendarGrid";
import moment from "moment";
import { useModal } from "../contexts/ModalContext";

export default function Calendar() {
	const [current, setCurrent] = useState(() => moment());
	const [events, setEvents] = useState([]);

	const startOfMonth = useMemo(
		() => current.clone().startOf("month"),
		[current]
	);
	const endOfMonth = useMemo(() => current.clone().endOf("month"), [current]);

	const startDate = useMemo(
		() => startOfMonth.clone().startOf("week"),
		[startOfMonth]
	);
	const endDate = useMemo(
		() => endOfMonth.clone().endOf("week"),
		[endOfMonth]
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

	const eventsByDate = useMemo(() => {
		const map = {};
		(events || []).forEach((ev) => {
			const d = ev.date ? moment(ev.date).format("YYYY-MM-DD") : null;
			if (!d) return;
			if (!map[d]) map[d] = [];
			map[d].push(ev);
		});
		return map;
	}, [events]);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			const y = current.year();
			const m = current.month() + 1; // 1-based
			try {
				const token = localStorage.getItem("token");
				const headers = token
					? { Authorization: `Bearer ${token}` }
					: {};
				const res = await fetch(
					`/.netlify/functions/events?year=${y}&month=${m}`,
					{ headers }
				);
				if (!res.ok) {
					console.error("Failed to load events", res.status);
					setEvents([]);
					return;
				}
				const data = await res.json();
				if (!cancelled) setEvents(data.events || []);
			} catch (err) {
				if (!cancelled) {
					console.error("Error fetching events", err);
					setEvents([]);
				}
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, [current]);

	function prevMonth() {
		setCurrent((c) => c.clone().subtract(1, "month"));
	}
	function nextMonth() {
		setCurrent((c) => c.clone().add(1, "month"));
	}

	const { showModal } = useModal();

	function handleCreateClick(date) {
		showModal(({ close }) => (
			<CreateEventForm
				date={date}
				onCreate={(ev) => setEvents((p) => [...p, ev])}
				onClose={() => close()}
			/>
		));
	}

	function handleEventClick(ev) {
		showModal(({ close }) => (
			<EditEventForm
				event={ev}
				onSaved={(u) =>
					setEvents((p) => p.map((x) => (x._id === u._id ? u : x)))
				}
				onDeleted={(d) =>
					setEvents((p) => p.filter((x) => x._id !== d._id))
				}
				onClose={() => close()}
			/>
		));
	}

	return (
		<div className="page page--calendar">
			<CalendarGrid
				days={days}
				current={current}
				eventsByDate={eventsByDate}
				onPrev={prevMonth}
				onNext={nextMonth}
				onEventClick={handleEventClick}
				onCreateClick={handleCreateClick}
			/>
		</div>
	);
}
