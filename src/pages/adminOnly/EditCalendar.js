import { CreateEventForm, EditEventForm } from "../../components/EventModals";
import React, { useEffect, useMemo, useState } from "react";

import CalendarGrid from "../../components/CalendarGrid";
import moment from "moment";
import { useModal } from "../../contexts/ModalContext";

// Using ModalContext and EventModals instead of local modal components

function EditModal({ open, event, onClose, onSaved, onDeleted }) {
	const [title, setTitle] = useState(event ? event.title : "");
	const [visibility, setVisibility] = useState(
		event ? event.visibility : "public"
	);
	const [recursWeekly, setRecursWeekly] = useState(
		event ? !!event.recursWeekly : false
	);
	const [location, setLocation] = useState(event ? event.location : "");
	const [description, setDescription] = useState(
		event ? event.description : ""
	);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (open && event) {
			setTitle(event.title || "");
			setVisibility(event.visibility || "public");
			setRecursWeekly(!!event.recursWeekly);
			setLocation(event.location || "");
			setDescription(event.description || "");
		}
	}, [open, event]);

	if (!open || !event) return null;

	async function save(e) {
		e.preventDefault();
		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(
				`/.netlify/functions/events?id=${event._id}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					body: JSON.stringify({
						title,
						visibility,
						recursWeekly,
						location,
						description,
					}),
				}
			);
			if (!res.ok) throw new Error("Failed to update");
			const data = await res.json();
			onSaved && onSaved(data.event);
			onClose && onClose();
		} catch (err) {
			console.error(err);
			alert("Failed to save: " + (err.message || ""));
		} finally {
			setLoading(false);
		}
	}

	async function remove() {
		if (!window.confirm("Delete this event?")) return;
		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(
				`/.netlify/functions/events?id=${event._id}`,
				{
					method: "DELETE",
					headers: {
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
				}
			);
			if (res.status !== 204) throw new Error("Failed to delete");
			onDeleted && onDeleted(event);
			onClose && onClose();
		} catch (err) {
			console.error(err);
			alert("Failed to delete: " + (err.message || ""));
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="modal-overlay">
			<div className="modal">
				<h3>Edit event</h3>
				<form onSubmit={save}>
					<div>
						<label>
							Title
							<input
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								required
							/>
						</label>
					</div>
					<div>
						<label>
							Visibility
							<select
								value={visibility}
								onChange={(e) => setVisibility(e.target.value)}
							>
								<option value="public">public</option>
								<option value="private">private</option>
							</select>
						</label>
					</div>
					<div>
						<label>
							Recurs weekly
							<input
								type="checkbox"
								checked={recursWeekly}
								onChange={(e) =>
									setRecursWeekly(e.target.checked)
								}
							/>
						</label>
					</div>
					<div>
						<label>
							Location
							<input
								value={location}
								onChange={(e) => setLocation(e.target.value)}
							/>
						</label>
					</div>
					<div>
						<label>
							Description
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</label>
					</div>
					<div>
						<button type="submit" disabled={loading}>
							Save
						</button>
						<button type="button" onClick={onClose}>
							Cancel
						</button>
						<button
							type="button"
							onClick={remove}
							disabled={loading}
						>
							Delete
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export default function EditCalendar() {
	const [current, setCurrent] = useState(() => moment());

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

	const [events, setEvents] = useState([]);
	const [modalDate, setModalDate] = useState(null);
	const [editEvent, setEditEvent] = useState(null);
	const { showModal, closeModal } = useModal();

	useEffect(() => {
		let cancelled = false;
		async function load() {
			const y = current.year();
			const m = current.month() + 1;
			try {
				const token = localStorage.getItem("token");
				const headers = token
					? { Authorization: `Bearer ${token}` }
					: {};
				const res = await fetch(
					`/.netlify/functions/events?year=${y}&month=${m}`,
					{ headers }
				);
				if (!res.ok) throw new Error(`Status ${res.status}`);
				const data = await res.json();
				if (!cancelled) setEvents(data.events || []);
			} catch (err) {
				console.error("Failed loading events", err);
				if (!cancelled) setEvents([]);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, [current]);

	const eventsByDate = useMemo(() => {
		const map = {};
		events.forEach((ev) => {
			if (!ev.date) return;
			const key = moment(ev.date).format("YYYY-MM-DD");
			if (!map[key]) map[key] = [];
			map[key].push(ev);
		});
		return map;
	}, [events]);

	function prevMonth() {
		setCurrent((s) => s.clone().subtract(1, "month"));
	}
	function nextMonth() {
		setCurrent((s) => s.clone().add(1, "month"));
	}

	function handleCreateClick(date) {
		setModalDate(date);
		showModal(({ close }) => (
			<CreateEventForm
				date={date}
				onCreate={(ev) => handleCreate(ev)}
				onClose={() => close()}
			/>
		));
	}

	function handleCreate(event) {
		// refresh events by reloading current month
		setEvents((prev) => [...prev, event]);
	}

	function handleEventClick(ev) {
		setEditEvent(ev);
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
		setEvents((prev) =>
			prev.map((p) => (p._id === updated._id ? updated : p))
		);
	}

	function handleDeleted(deleted) {
		setEvents((prev) => prev.filter((p) => p._id !== deleted._id));
	}

	return (
		<div>
			<CalendarGrid
				days={days}
				current={current}
				eventsByDate={eventsByDate}
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
