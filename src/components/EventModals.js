import React, { useEffect, useState } from "react";

import moment from "moment";

export function CreateEventForm({ date, onCreate, onClose }) {
	const [title, setTitle] = useState("");
	const [visibility, setVisibility] = useState("public");
	const [recursWeekly, setRecursWeekly] = useState(false);
	const [endDate, setEndDate] = useState("");
	const [location, setLocation] = useState("");
	const [description, setDescription] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		setTitle("");
		setVisibility("public");
		setRecursWeekly(false);
		setEndDate("");
		setLocation("");
		setDescription("");
	}, [date]);

	async function submit(e) {
		e.preventDefault();
		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			const body = {
				title,
				date: date.toDate(),
				visibility,
				recursWeekly,
				endDate: endDate || undefined,
				location,
				description,
			};

			const res = await fetch("/.netlify/functions/events", {
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
			const data = await res.json();
			onCreate && onCreate(data.event);
			onClose && onClose();
		} catch (err) {
			console.error(err);
			alert("Failed to create event: " + (err.message || ""));
		} finally {
			setLoading(false);
		}
	}

	return (
		<div>
			<h3>Create event for {date.format("YYYY-MM-DD")}</h3>
			<form onSubmit={submit}>
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
					Description
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
				</label>

				<div className="group--hz--sm">
					<button type="submit" disabled={loading}>
						Create
					</button>
					<button type="button" onClick={onClose}>
						Cancel
					</button>
				</div>
			</form>
		</div>
	);
}

export function EditEventForm({ event, onSaved, onDeleted, onClose }) {
	const [title, setTitle] = useState(event ? event.title : "");
	const [visibility, setVisibility] = useState(
		event ? event.visibility : "public"
	);
	const [recursWeekly, setRecursWeekly] = useState(
		event ? !!event.recursWeekly : false
	);
	const [endDate, setEndDate] = useState(event ? event.endDate || "" : "");
	const [location, setLocation] = useState(event ? event.location : "");
	const [description, setDescription] = useState(
		event ? event.description : ""
	);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (event) {
			setTitle(event.title || "");
			setVisibility(event.visibility || "public");
			setRecursWeekly(!!event.recursWeekly);
			setEndDate(event.endDate || "");
			setLocation(event.location || "");
			setDescription(event.description || "");
		}
	}, [event]);
	if (!event) return null;

	async function save(e) {
		e.preventDefault();
		setLoading(true);
		try {
			const token = localStorage.getItem("token");
			// If this is a synthetic recurrence (occurrence of a recurring event),
			// we need to:
			// 1) Add this date to the base event's recursionDetails.exceptions
			// 2) Create a new single event with the edited details (so it appears edited)
			if (event.isRecurrence && event.baseEventId) {
				// patch base event to add exception
				const baseId = event.baseEventId;
				const exceptionDate = event.date;
				const addExceptionRes = await fetch(
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
								"recursionDetails.exceptions": exceptionDate,
							},
						}),
					}
				);
				if (!addExceptionRes.ok)
					throw new Error(
						"Failed to update base event for exception"
					);
				// create new single event for edited occurrence
				const createRes = await fetch("/.netlify/functions/events", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					body: JSON.stringify({
						title,
						date: event.date,
						visibility,
						recursWeekly: false,
						location,
						description,
					}),
				});
				if (!createRes.ok)
					throw new Error("Failed to create edited occurrence");
				const created = await createRes.json();
				onSaved && onSaved(created.event);
				onClose && onClose();
				setLoading(false);
				return;
			}

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
		// If this is a recurrence occurrence, ask whether to delete just this occurrence or all future
		if (!window.confirm("Delete this event?")) return;
		if (event.isRecurrence && event.baseEventId) {
			const choice = window.prompt(
				"Type 'one' to delete only this occurrence, or 'all' to delete this and all future occurrences:",
				"one"
			);
			if (!choice) return;
			setLoading(true);
			try {
				const token = localStorage.getItem("token");
				if (choice === "one") {
					// Add this date to base event's exceptions
					const res = await fetch(
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
									"recursionDetails.exceptions": event.date,
								},
							}),
						}
					);
					if (!res.ok)
						throw new Error(
							"Failed to add exception to base event"
						);
					onDeleted && onDeleted(event);
					onClose && onClose();
					return;
				} else if (choice === "all") {
					// Set base event's endDate to this date (so future occurrences are removed)
					const res = await fetch(
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
								recursionDetails: { endDate: event.date },
							}),
						}
					);
					if (!res.ok)
						throw new Error("Failed to set base event endDate");
					onDeleted && onDeleted(event);
					onClose && onClose();
					return;
				} else {
					alert("Unrecognized choice");
					return;
				}
			} catch (err) {
				console.error(err);
				alert("Failed to delete: " + (err.message || ""));
			} finally {
				setLoading(false);
			}
		}

		// Non-recurring or base-event deletion
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
		<>
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
							onChange={(e) => setRecursWeekly(e.target.checked)}
						/>
					</label>
				</div>
				{recursWeekly && (
					<div>
						<label>
							End Date
							<input
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
							/>
						</label>
					</div>
				)}
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
				<div className="group--hz--sm">
					<button type="submit" disabled={loading}>
						Save
					</button>
					<button type="button" onClick={onClose}>
						Cancel
					</button>
					<button type="button" onClick={remove} disabled={loading}>
						Delete
					</button>
				</div>
			</form>
		</>
	);
}
