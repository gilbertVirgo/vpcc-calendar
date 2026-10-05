import React, { useState } from "react";

// Public iCalendar feed (netlify/functions/calendar.js)
const PATH = "/.netlify/functions/calendar";
const FEED_URL = `${window.location.origin}${PATH}`;
// webcal:// hands the feed to whichever calendar app the device has registered
const WEBCAL = `webcal://${window.location.host}${PATH}`;

// Native <details> dropdown, so toggling and keyboard support come for free.
export default function SubscribeMenu() {
	// null | "copied" | "failed"
	const [copy, setCopy] = useState(null);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(FEED_URL);
			setCopy("copied");
		} catch (err) {
			// Clipboard blocked or unavailable: show the link to copy by hand
			setCopy("failed");
		}
	}

	return (
		<details className="subscribe" onToggle={() => setCopy(null)}>
			<summary className="button button--sm">Subscribe</summary>
			<ul className="subscribe__menu">
				<li>
					{/* Google Calendar has no webcal:// handler on most devices */}
					<a
						href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(
							WEBCAL,
						)}`}
						target="_blank"
						rel="noreferrer"
					>
						Add to Google
					</a>
				</li>
				<li>
					<a href={WEBCAL}>Add to Apple / Outlook</a>
				</li>
				<li>
					{/* For apps with no webcal:// handler: paste into "subscribe by URL" */}
					{copy === "failed" ? (
						<input
							readOnly
							autoFocus
							aria-label="Calendar link"
							value={FEED_URL}
							onFocus={(e) => e.target.select()}
						/>
					) : (
						<button type="button" onClick={copyLink}>
							{copy === "copied" ? "Link copied" : "Copy link"}
						</button>
					)}
				</li>
			</ul>
		</details>
	);
}
