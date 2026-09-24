import { CreateEventForm, EditEventForm } from "../../components/EventForm";
import React, { useEffect, useMemo, useState } from "react";

import CalendarGrid from "../../components/CalendarGrid";
import moment from "moment";
import { useModal } from "../../contexts/ModalContext";
import { apiJson, authHeaders } from "../../utils/apiFetch";
import { useError } from "../../contexts/ErrorContext";

const LOAD_ERROR = "Couldn't load events. Please try again.";

// Using ModalContext and EventForm components

export default function EditCalendar() {
	const [current, setCurrent] = useState(() => moment());

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

	const [events, setEvents] = useState([]);
	const [loading, setLoading] = useState(true);
	// Month whose events are on screen; a same-month reload keeps them visible.
	const [loadedMonth, setLoadedMonth] = useState(null);
	const { showModal } = useModal();
	const { setError, clearError } = useError();

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
		setCurrent((s) => s.clone().subtract(1, "month"));
	}
	function nextMonth() {
		setCurrent((s) => s.clone().add(1, "month"));
	}

	function handleCreateClick(date) {
		showModal(({ close }) => (
			<CreateEventForm
				date={date}
				onCreate={(ev) => handleCreate(ev)}
				onClose={() => close()}
			/>
		));
	}

	function handleCreate(event) {
		// reload from server to ensure recurring/exception state is fresh
		// by updating current (same month) we trigger the effect to load
		setCurrent((s) => s.clone());
	}

	function handleEventClick(ev) {
		showModal(({ close }) => (
			<EditEventForm
				event={ev}
				onSaved={(u) => handleSaved(u)}
				onDeleted={(d) => handleDeleted(d)}
				onClose={() => close()}
			/>
		));
	}

	function handleSaved(updated) {
		// reload to pick up changes (could be base-event updates or new occurrences)
		setCurrent((s) => s.clone());
	}

	function handleDeleted(deleted) {
		// reload events after deletion
		setCurrent((s) => s.clone());
	}

	return (
		<div>
			<CalendarGrid
				days={days}
				current={current}
				events={events}
				loading={loading}
				skeleton={loading && loadedMonth !== current.format("YYYY-MM")}
				onPrev={prevMonth}
				onNext={nextMonth}
				showCreate
				onCreateClick={handleCreateClick}
				onEventClick={handleEventClick}
			/>
			{/* Modals are handled by ModalContext via showModal */}
		</div>
	);
}
