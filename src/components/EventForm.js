import React, { useEffect, useState } from "react";

import moment from "moment";

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
	const [endDate, setEndDate] = useState(event ? event.endDate || "" : "");
	const [location, setLocation] = useState(event ? event.location || "" : "");
	const [description, setDescription] = useState(
		event ? event.description || "" : ""
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

	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);
		try {
			let body = {
				title,
				visibility,
				recursWeekly,
				location,
				description,
			};

			if (recursWeekly && endDate) body.recursionDetails = { endDate };

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
		if (!window.confirm("Delete this event?")) return;
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
	async function handleSubmit(data) {
		const token = localStorage.getItem("token");
		// If this is a recurrence occurrence, we need to add an exception to the base
		// event and then create a new single event with the edited details.
		if (event.isRecurrence && event.baseEventId) {
			// add exception to base event
			const baseRes = await fetch(
				`/.netlify/functions/events?id=${event.baseEventId}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					body: JSON.stringify({
						$addToSet: {
							"recursionDetails.exceptions": event.date,
						},
					}),
				}
			);
			if (!baseRes.ok) {
				let txt;
				try {
					const j = await baseRes.json();
					txt = j.error || JSON.stringify(j);
				} catch (e) {
					txt = await baseRes.text().catch(() => "(no body)");
				}
				throw new Error(
					`Failed to update base event: ${baseRes.status} - ${txt}`
				);
			}

			// create new single event with edited details
			const createRes = await fetch(`/.netlify/functions/events`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({ ...data, date: event.date }),
			});
			if (!createRes.ok) {
				let txt;
				try {
					const j = await createRes.json();
					txt = j.error || JSON.stringify(j);
				} catch (e) {
					txt = await createRes.text().catch(() => "(no body)");
				}
				throw new Error(
					`Failed to create edited occurrence: ${createRes.status} - ${txt}`
				);
			}
			const created = await createRes.json();
			onSaved && onSaved(created.event);
			onClose && onClose();
			return;
		}

		const res = await fetch(`/.netlify/functions/events?id=${event._id}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify(data),
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
			const choice = window.prompt(
				"Type 'one' to delete only this occurrence, or 'all' to delete this and all future occurrences:",
				"one"
			);
			if (!choice) return;
			if (choice === "one") {
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

		const res = await fetch(`/.netlify/functions/events?id=${event._id}`, {
			method: "DELETE",
			headers: {
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		});
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
