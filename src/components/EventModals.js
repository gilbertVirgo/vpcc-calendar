import React, { useEffect, useState } from "react";
import moment from "moment";

import { useConfirm } from "../contexts/ConfirmModalContext";
import apiFetch from "../utils/apiFetch";

export function CreateEventForm({ date, onCreate, onClose }) {
	const [title, setTitle] = useState("");
	const [visibility, setVisibility] = useState("public");
	const [recursWeekly, setRecursWeekly] = useState(false);
	const [endDate, setEndDate] = useState("");
	const [location, setLocation] = useState("");
	const [description, setDescription] = useState("");
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");
	const [loading, setLoading] = useState(false);
	const [timeError, setTimeError] = useState(null);

	useEffect(() => {
		setTitle("");
		setVisibility("public");
		setRecursWeekly(false);
		setEndDate("");
		setLocation("");
		setDescription("");
		setStartTime("");
		setEndTime("");
	}, [date]);

	function parseTimeToArray(t) {
		if (!t) return null;
		const parts = t.split(":");
		if (parts.length < 2) return null;
		const h = parseInt(parts[0], 10);
		const m = parseInt(parts[1], 10);
		if (Number.isNaN(h) || Number.isNaN(m)) return null;
		return [h, m];
	}

	async function submit(e) {
		e.preventDefault();
		setLoading(true);
		try {
			setTimeError(null);
			// validate time range
			const startArr = parseTimeToArray(startTime);
			const endArr = parseTimeToArray(endTime);
			if (startArr && endArr) {
				const sMin = startArr[0] * 60 + startArr[1];
				const eMin = endArr[0] * 60 + endArr[1];
				if (eMin < sMin) {
					setTimeError("End time cannot be before start time");
					setLoading(false);
					return;
				}
			}
			const token = localStorage.getItem("token");
			const body = {
				title,
				date: date.toDate(),
				visibility,
				recursWeekly,
				// recursionDetails follows the server Event model
				recursionDetails: recursWeekly
					? endDate
						? { endDate: moment(endDate).toDate(), exceptions: [] }
						: { exceptions: [] }
					: undefined,
				time: undefined,
				location,
				description,
			};

			const s = parseTimeToArray(startTime);
			const en = parseTimeToArray(endTime);
			if (s || en) {
				body.time = {};
				if (s) body.time.start = s;
				if (en) body.time.end = en;
			}

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
	const [endDate, setEndDate] = useState(
		event && event.recursionDetails && event.recursionDetails.endDate
			? moment(event.recursionDetails.endDate).format("YYYY-MM-DD")
			: ""
	);
	const [location, setLocation] = useState(event ? event.location : "");
	const [description, setDescription] = useState(
		event ? event.description : ""
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

	// confirm hook (must be called at top-level)
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
		}
	}, [event]);

	function parseTimeToArray(t) {
		if (!t) return null;
		const parts = t.split(":");
		if (parts.length < 2) return null;
		const h = parseInt(parts[0], 10);
		const m = parseInt(parts[1], 10);
		if (Number.isNaN(h) || Number.isNaN(m)) return null;
		return [h, m];
	}
	if (!event) return null;

	async function save(e) {
		e.preventDefault();
		setLoading(true);
		try {
			setTimeError(null);
			// validate time range
			const startArr = parseTimeToArray(startTime);
			const endArr = parseTimeToArray(endTime);
			if (startArr && endArr) {
				const sMin = startArr[0] * 60 + startArr[1];
				const eMin = endArr[0] * 60 + endArr[1];
				if (eMin < sMin) {
					setTimeError("End time cannot be before start time");
					setLoading(false);
					return;
				}
			}
			const token = localStorage.getItem("token");
			// If this is a synthetic recurrence (occurrence of a recurring event),
			// we need to:
			// 1) Add this date to the base event's recursionDetails.exceptions
			// 2) Create a new single event with the edited details (so it appears edited)
			if (event.isRecurrence && event.baseEventId) {
				// patch base event to add exception
				const baseId = event.baseEventId;
				const exceptionDate = event.date;
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
				const createRes = await apiFetch("/.netlify/functions/events", {
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
						time: (() => {
							const s = parseTimeToArray(startTime);
							const en = parseTimeToArray(endTime);
							if (!s && !en) return undefined;
							const t = {};
							if (s) t.start = s;
							if (en) t.end = en;
							return t;
						})(),
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

			// Build update body, include recursionDetails per model
			const updateBody = {
				title,
				visibility,
				recursWeekly,
				location,
				description,
			};

			const timeObj = (() => {
				const s = parseTimeToArray(startTime);
				const en = parseTimeToArray(endTime);
				if (!s && !en) return undefined;
				const t = {};
				if (s) t.start = s;
				if (en) t.end = en;
				return t;
			})();
			if (timeObj) updateBody.time = timeObj;

			// Handle recursionDetails according to recursWeekly and endDate input
			if (recursWeekly) {
				// preserve existing exceptions if present on base event, otherwise leave undefined
				const existingExceptions =
					event &&
					event.recursionDetails &&
					event.recursionDetails.exceptions
						? event.recursionDetails.exceptions
						: undefined;
				updateBody.recursionDetails = {};
				if (endDate)
					updateBody.recursionDetails.endDate =
						moment(endDate).toDate();
				if (existingExceptions)
					updateBody.recursionDetails.exceptions = existingExceptions;
			} else {
				// If user turned off recurrence, clear recursionDetails
				updateBody.recursionDetails = { endDate: null, exceptions: [] };
			}

			const res = await apiFetch(
				`/.netlify/functions/events?id=${event._id}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					body: JSON.stringify(updateBody),
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
		const ok = await confirm({
			title: "Delete event",
			message: "Delete this event?",
			confirmText: "Delete",
			cancelText: "Cancel",
		});
		if (!ok) return;
		if (event.isRecurrence && event.baseEventId) {
			const choice = await confirm({
				title: "Delete recurrence",
				message: "Choose how to delete this recurring event:",
				cancelText: "Cancel",
				choices: [
					{ label: "Delete only this occurrence", value: "one" },
					{
						label: "Delete this and all future occurrences",
						value: "all",
					},
				],
			});
			if (!choice) return;
			setLoading(true);
			try {
				const token = localStorage.getItem("token");
				if (choice === "one") {
					// Add this date to base event's exceptions
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
					if (!res.ok)
						throw new Error(
							"Failed to add exception to base event"
						);
					onDeleted && onDeleted(event);
					onClose && onClose();
					return;
				} else if (choice === "all") {
					// If the base event's own date is the same day as this occurrence,
					// deleting all future occurrences should remove the base event itself.
					if (
						event.baseEvent &&
						moment(event.baseEvent.date).isSame(event.date, "day")
					) {
						const delRes = await apiFetch(
							`/.netlify/functions/events?id=${event.baseEventId}`,
							{
								method: "DELETE",
								headers: {
									...(token
										? { Authorization: `Bearer ${token}` }
										: {}),
								},
							}
						);
						if (delRes.status !== 204) {
							let txt;
							try {
								const j = await delRes.json();
								txt = j.error || JSON.stringify(j);
							} catch (e) {
								txt = await delRes
									.text()
									.catch(() => "(no body)");
							}
							throw new Error(
								`Failed to delete base event: ${delRes.status} - ${txt}`
							);
						}
						onDeleted && onDeleted(event);
						onClose && onClose();
						return;
					}

					// Otherwise set base event's endDate to one week before this date
					// (end of that day) and add this occurrence as an exception.
					// Use startOf('day') to normalize dates and $set/$addToSet
					// so Mongoose treats this as an operator update.
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
									// set endDate to the end of the day one week before
									"recursionDetails.endDate": occurrenceDay
										.clone()
										.subtract(7, "days")
										.endOf("day")
										.toDate(),
								},
							}),
						}
					);

					if (!res.ok)
						throw new Error(
							"Failed to update base event for deletion"
						);

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
			const res = await apiFetch(
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
