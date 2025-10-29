import React, { useEffect, useState } from "react";
import moment from "moment";
import { useConfirm } from "../contexts/ConfirmModalContext";
import apiFetch from "../utils/apiFetch";

// Shared Event Form Component
function EventForm({
	event,
	date,
	onSubmit,
	onDelete,
	onClose,
	submitLabel = "Save",
	showDelete = false,
}) {
	const [title, setTitle] = useState(event ? event.title || "" : "");
	const [visibility, setVisibility] = useState(
		event ? event.visibility || "public" : "public"
	);
	const [recursWeekly, setRecursWeekly] = useState(
		event ? !!event.recursWeekly : false
	);
	const [endDate, setEndDate] = useState(
		event && event.recursionDetails && event.recursionDetails.endDate
			? moment(event.recursionDetails.endDate).format("YYYY-MM-DD")
			: ""
	);
	const [location, setLocation] = useState(event ? event.location || "" : "");
	const [description, setDescription] = useState(
		event ? event.description || "" : ""
	);
	const [startTime, setStartTime] = useState(
		event && event.time && event.time.start
			? `${String(event.time.start[0]).padStart(2, "0")}:${String(
					event.time.start[1]
			  ).padStart(2, "0")}`
			: ""
	);
	const [endTime, setEndTime] = useState(
		event && event.time && event.time.end
			? `${String(event.time.end[0]).padStart(2, "0")}:${String(
					event.time.end[1]
			  ).padStart(2, "0")}`
			: ""
	);
	const [loading, setLoading] = useState(false);
	const [timeError, setTimeError] = useState(null);

	// confirm modal hook (must be called at top-level of component)
	const confirm = useConfirm();

	useEffect(() => {
		if (event) {
			setTitle(event.title || "");
			setVisibility(event.visibility || "public");
			setRecursWeekly(!!event.recursWeekly);
			setEndDate(
				event &&
					event.recursionDetails &&
					event.recursionDetails.endDate
					? moment(event.recursionDetails.endDate).format(
							"YYYY-MM-DD"
					  )
					: ""
			);
			setLocation(event.location || "");
			setDescription(event.description || "");
			setStartTime(
				event.time && event.time.start
					? `${String(event.time.start[0]).padStart(2, "0")}:${String(
							event.time.start[1]
					  ).padStart(2, "0")}`
					: ""
			);
			setEndTime(
				event.time && event.time.end
					? `${String(event.time.end[0]).padStart(2, "0")}:${String(
							event.time.end[1]
					  ).padStart(2, "0")}`
					: ""
			);
		} else if (date) {
			// Reset for create mode
			setTitle("");
			setVisibility("public");
			setRecursWeekly(false);
			setEndDate("");
			setLocation("");
			setDescription("");
		}
	}, [event, date]);

	function parseTimeToArray(t) {
		if (!t) return null;
		// expect 'HH:MM'
		const parts = t.split(":");
		if (parts.length < 2) return null;
		const h = parseInt(parts[0], 10);
		const m = parseInt(parts[1], 10);
		if (Number.isNaN(h) || Number.isNaN(m)) return null;
		return [h, m];
	}

	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);
		try {
			setTimeError(null);
			// validate time range when both present
			const s = parseTimeToArray(startTime);
			const en = parseTimeToArray(endTime);
			if (s && en) {
				const sMin = s[0] * 60 + s[1];
				const eMin = en[0] * 60 + en[1];
				if (eMin < sMin) {
					setTimeError("End time cannot be before start time");
					setLoading(false);
					return;
				}
			}
			let body = {
				title,
				visibility,
				recursWeekly,
				time: undefined,
				location,
				description,
			};

			if (s || en) {
				body.time = {};
				if (s) body.time.start = s;
				if (en) body.time.end = en;
			}

			// Always include recursionDetails so PUT/POST will update/clear it per model
			if (recursWeekly) {
				body.recursionDetails = endDate
					? { endDate: moment(endDate).toDate(), exceptions: [] }
					: { exceptions: [] };
			} else {
				body.recursionDetails = { endDate: undefined, exceptions: [] };
			}

			await onSubmit(body);
		} catch (err) {
			console.error(err);
			alert(
				`Failed to ${event ? "save" : "create"} event: ` +
					(err.message || "")
			);
		} finally {
			setLoading(false);
		}
	}

	async function handleDelete() {
		const ok = await confirm({
			title: "Delete event",
			message: "Delete this event?",
			confirmText: "Delete",
			cancelText: "Cancel",
		});
		if (!ok) return;
		setLoading(true);
		try {
			await onDelete();
		} catch (err) {
			console.error(err);
			alert("Failed to delete: " + (err.message || ""));
		} finally {
			setLoading(false);
		}
	}

	const formTitle = event
		? "Edit event"
		: `Create event for ${date.format("YYYY-MM-DD")}`;

	return (
		<div>
			<h3>{formTitle}</h3>
			<form onSubmit={handleSubmit}>
				<label>
					Title
					<input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						required
					/>
				</label>

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

				<label>
					Recurs weekly
					<input
						type="checkbox"
						checked={recursWeekly}
						onChange={(e) => setRecursWeekly(e.target.checked)}
					/>
				</label>

				{recursWeekly && (
					<label>
						End Date
						<input
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
						/>
					</label>
				)}

				<label>
					Location
					<input
						value={location}
						onChange={(e) => setLocation(e.target.value)}
					/>
				</label>

				<label>
					Start time
					<input
						type="time"
						value={startTime}
						onChange={(e) => setStartTime(e.target.value)}
					/>
				</label>

				<label>
					End time
					<input
						type="time"
						value={endTime}
						onChange={(e) => setEndTime(e.target.value)}
					/>
				</label>

				{timeError ? (
					<div style={{ color: "#c00", marginTop: "0.4rem" }}>
						{timeError}
					</div>
				) : null}

				<label>
					Description
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
				</label>

				<div className="group--hz--sm">
					<button type="submit" disabled={loading}>
						{submitLabel}
					</button>
					{showDelete && (
						<button
							type="button"
							onClick={handleDelete}
							disabled={loading}
						>
							Delete
						</button>
					)}
					<button type="button" onClick={onClose}>
						Cancel
					</button>
				</div>
			</form>
		</div>
	);
}

export function CreateEventForm({ date, onCreate, onClose }) {
	async function handleSubmit(data) {
		const token = localStorage.getItem("token");
		const body = {
			...data,
			date: date.toDate(),
		};

		const res = await apiFetch("/.netlify/functions/events", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify(body),
		});
		if (!res.ok) {
			let txt;
			try {
				const j = await res.json();
				txt = j.error || JSON.stringify(j);
			} catch (e) {
				txt = await res.text().catch(() => "(no body)");
			}
			throw new Error(
				`Failed to create: ${res.status} ${res.statusText} - ${txt}`
			);
		}
		const result = await res.json();
		onCreate && onCreate(result.event);
		onClose && onClose();
	}

	return (
		<EventForm
			date={date}
			onSubmit={handleSubmit}
			onClose={onClose}
			submitLabel="Create"
		/>
	);
}

export function EditEventForm({ event, onSaved, onDeleted, onClose }) {
	// confirm hook for this component
	const confirm = useConfirm();
	async function handleSubmit(data) {
		const token = localStorage.getItem("token");
		// If this is a recurrence occurrence, ask the user whether to apply
		// changes only to this occurrence or to this and all future occurrences.
		if (event.isRecurrence && event.baseEventId) {
			const choice = await confirm({
				title: "Edit recurring event",
				message:
					"Apply changes only to this occurrence, or to this and all future occurrences?",
				cancelText: "Cancel",
				choices: [
					{ label: "Only this occurrence", value: "one" },
					{
						label: "This and all future occurrences",
						value: "future",
					},
				],
			});
			if (!choice) return;

			const baseId = event.baseEventId;
			const occurrenceDay = moment(event.date).startOf("day");

			if (choice === "one") {
				// Add exception to base, then create a single event with edited details
				const addExceptionRes = await apiFetch(
					`/.netlify/functions/events?id=${baseId}`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							...(token
								? { Authorization: `Bearer ${token}` }
								: {}),
						},
						body: JSON.stringify({
							$addToSet: {
								"recursionDetails.exceptions":
									occurrenceDay.toDate(),
							},
						}),
					}
				);
				if (!addExceptionRes.ok)
					throw new Error("Failed to update base event");

				const createRes = await apiFetch("/.netlify/functions/events", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					body: JSON.stringify({
						...data,
						date: event.date,
						recursWeekly: false,
					}),
				});
				if (!createRes.ok)
					throw new Error("Failed to create edited occurrence");
				const created = await createRes.json();
				onSaved && onSaved(created.event);
				onClose && onClose();
				return;
			}

			if (choice === "future") {
				// Split the series: end the original base before the occurrence,
				// and create a new recurring event starting at the occurrence with the updated data.
				const updateBaseRes = await apiFetch(
					`/.netlify/functions/events?id=${baseId}`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							...(token
								? { Authorization: `Bearer ${token}` }
								: {}),
						},
						body: JSON.stringify({
							$addToSet: {
								"recursionDetails.exceptions":
									occurrenceDay.toDate(),
							},
							$set: {
								"recursionDetails.endDate": occurrenceDay
									.clone()
									.subtract(7, "days")
									.endOf("day")
									.toDate(),
							},
						}),
					}
				);
				if (!updateBaseRes.ok)
					throw new Error(
						"Failed to update original recurring event"
					);

				// Create new recurring event starting at occurrence date. Use data supplied by form
				const newEventBody = {
					...data,
					date: occurrenceDay.toDate(),
					recursWeekly: true,
				};
				const createNewRes = await apiFetch(
					"/.netlify/functions/events",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...(token
								? { Authorization: `Bearer ${token}` }
								: {}),
						},
						body: JSON.stringify(newEventBody),
					}
				);
				if (!createNewRes.ok)
					throw new Error("Failed to create new recurring event");
				const createdNew = await createNewRes.json();
				onSaved && onSaved(createdNew.event);
				onClose && onClose();
				return;
			}
		}

		const res = await apiFetch(
			`/.netlify/functions/events?id=${event._id}`,
			{
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify(data),
			}
		);
		if (!res.ok) {
			let txt;
			try {
				const j = await res.json();
				txt = j.error || JSON.stringify(j);
			} catch (e) {
				txt = await res.text().catch(() => "(no body)");
			}
			throw new Error(
				`Failed to update: ${res.status} ${res.statusText} - ${txt}`
			);
		}
		const result = await res.json();
		onSaved && onSaved(result.event);
		onClose && onClose();
	}

	async function handleDelete() {
		// If this is a recurrence occurrence, ask user whether to delete just this occurrence or all future occurrences
		const token = localStorage.getItem("token");
		if (event.isRecurrence && event.baseEventId) {
			const choice = await confirm({
				title: "Delete recurrence",
				message: "How would you like to delete this recurring event?",
				cancelText: "Cancel",
				choices: [
					{ label: "Only this event", value: "one" },
					{ label: "All future occurrences", value: "all" },
				],
			});
			if (!choice) return;
			if (choice === "one") {
				const res = await apiFetch(
					`/.netlify/functions/events?id=${event.baseEventId}`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							...(token
								? { Authorization: `Bearer ${token}` }
								: {}),
						},
						body: JSON.stringify({
							$addToSet: {
								"recursionDetails.exceptions": moment(
									event.date
								)
									.startOf("day")
									.toDate(),
							},
						}),
					}
				);
				if (!res.ok) {
					let txt;
					try {
						const j = await res.json();
						txt = j.error || JSON.stringify(j);
					} catch (e) {
						txt = await res.text().catch(() => "(no body)");
					}
					throw new Error(
						`Failed to add exception: ${res.status} - ${txt}`
					);
				}
				onDeleted && onDeleted(event);
				onClose && onClose();
				return;
			} else if (choice === "all") {
				// normalize occurrence day and set both exception and endDate (one week before)
				const occurrenceDay = moment(event.date).startOf("day");
				const res = await apiFetch(
					`/.netlify/functions/events?id=${event.baseEventId}`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							...(token
								? { Authorization: `Bearer ${token}` }
								: {}),
						},
						body: JSON.stringify({
							$addToSet: {
								"recursionDetails.exceptions":
									occurrenceDay.toDate(),
							},
							$set: {
								"recursionDetails.endDate": occurrenceDay
									.clone()
									.subtract(7, "days")
									.endOf("day")
									.toDate(),
							},
						}),
					}
				);
				if (!res.ok) {
					let txt;
					try {
						const j = await res.json();
						txt = j.error || JSON.stringify(j);
					} catch (e) {
						txt = await res.text().catch(() => "(no body)");
					}
					throw new Error(
						`Failed to set endDate: ${res.status} - ${txt}`
					);
				}
				onDeleted && onDeleted(event);
				onClose && onClose();
				return;
			} else {
				throw new Error("Unrecognized choice");
			}
		}

		const res = await apiFetch(
			`/.netlify/functions/events?id=${event._id}`,
			{
				method: "DELETE",
				headers: {
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
			}
		);
		if (res.status !== 204) {
			let txt;
			try {
				const j = await res.json();
				txt = j.error || JSON.stringify(j);
			} catch (e) {
				txt = await res.text().catch(() => "(no body)");
			}
			throw new Error(
				`Failed to delete: ${res.status} ${res.statusText} - ${txt}`
			);
		}
		onDeleted && onDeleted(event);
		onClose && onClose();
	}

	return (
		<EventForm
			event={event}
			onSubmit={handleSubmit}
			onDelete={handleDelete}
			onClose={onClose}
			submitLabel="Save"
			showDelete={true}
		/>
	);
}
