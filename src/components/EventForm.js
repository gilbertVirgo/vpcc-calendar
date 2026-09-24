import React, { useEffect, useRef, useState } from "react";
import moment from "moment";
import { useConfirm } from "../contexts/ConfirmModalContext";
import { useError } from "../contexts/ErrorContext";
import { apiJson, authHeaders } from "../utils/apiFetch";

const EVENTS = "/.netlify/functions/events";
const CREATE_ERROR = "Couldn't create the event. Please try again.";
const SAVE_ERROR = "Couldn't save the event. Please try again.";
const DELETE_ERROR = "Couldn't delete the event. Please try again.";

function send(url, method, body, message) {
	return apiJson(
		url,
		{
			method,
			headers: authHeaders(body ? { "Content-Type": "application/json" } : {}),
			body: body ? JSON.stringify(body) : undefined,
		},
		message
	);
}

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
	const [formError, setFormError] = useState(null);
	const { setError } = useError();

	// confirm modal hook (must be called at top-level of component)
	const confirm = useConfirm();

	// A confirm dialog replaces this form in the single modal slot, so after
	// one the form is gone and errors must go to the global banner instead.
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	function showFailure(err) {
		if (err.redirecting) return; // 401: already on the way to the hub
		console.error(err);
		if (mounted.current) setFormError(err.message);
		else setError(err.message);
	}

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
		if (loading) return;
		setLoading(true);
		try {
			setFormError(null);
			// validate time range when both present
			const s = parseTimeToArray(startTime);
			const en = parseTimeToArray(endTime);
			if (s && en) {
				const sMin = s[0] * 60 + s[1];
				const eMin = en[0] * 60 + en[1];
				if (eMin < sMin) {
					setFormError("End time cannot be before start time");
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
			showFailure(err);
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
			showFailure(err);
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

				<label>
					Description
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
				</label>

				{formError ? (
					<div className="form-error" role="alert">
						{formError}
					</div>
				) : null}

				<div className="group--hz--sm">
					<button
						type="submit"
						className="button--primary"
						disabled={loading}
					>
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
		const result = await send(
			EVENTS,
			"POST",
			{ ...data, date: date.toDate() },
			CREATE_ERROR
		);
		onCreate && onCreate(result && result.event);
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

	// Recurring occurrences: exclude this day from the base series, and
	// optionally ("future"/"all") end the series the week before.
	function exceptionUpdate(endSeries) {
		const day = moment(event.date).startOf("day");
		const update = {
			$addToSet: { "recursionDetails.exceptions": day.toDate() },
		};
		if (endSeries) {
			update.$set = {
				"recursionDetails.endDate": day
					.clone()
					.subtract(7, "days")
					.endOf("day")
					.toDate(),
			};
		}
		return update;
	}

	async function handleSubmit(data) {
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

			const baseUrl = `${EVENTS}?id=${event.baseEventId}`;
			if (choice === "one" || choice === "future") {
				const future = choice === "future";
				// "one": add exception to base, then create a single edited event.
				// "future": split the series, ending the original before this
				// occurrence and starting a new recurring event here.
				await send(baseUrl, "PUT", exceptionUpdate(future), SAVE_ERROR);
				let created;
				try {
					created = await send(
						EVENTS,
						"POST",
						future
							? {
									...data,
									date: moment(event.date).startOf("day").toDate(),
									recursWeekly: true,
							  }
							: { ...data, date: event.date, recursWeekly: false },
						SAVE_ERROR
					);
				} finally {
					// Refresh even if the POST failed: the PUT already changed the series.
					onSaved && onSaved(created && created.event);
				}
				onClose && onClose();
				return;
			}
		}

		const result = await send(
			`${EVENTS}?id=${event._id}`,
			"PUT",
			data,
			SAVE_ERROR
		);
		onSaved && onSaved(result && result.event);
		onClose && onClose();
	}

	async function handleDelete() {
		// If this is a recurrence occurrence, ask user whether to delete just this occurrence or all future occurrences
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
			await send(
				`${EVENTS}?id=${event.baseEventId}`,
				"PUT",
				exceptionUpdate(choice === "all"),
				DELETE_ERROR
			);
		} else {
			await send(`${EVENTS}?id=${event._id}`, "DELETE", null, DELETE_ERROR);
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
