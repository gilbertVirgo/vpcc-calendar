import React, { useState } from "react";

import { useError } from "../contexts/ErrorContext";
import { useHistory } from "react-router-dom";

export default function Login() {
	// username is hidden from the UI but exists in state; default 'general'
	const [username, setUsername] = useState("general");
	const [password, setPassword] = useState("");
	const { error, setError, clearError } = useError();
	const [success, setSuccess] = useState(null);

	const history = useHistory();

	async function handleSubmit(e) {
		e.preventDefault();
		clearError();
		setSuccess(null);
		try {
			const res = await fetch("/.netlify/functions/auth", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, password }),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error || "Login failed");
				return;
			}
			// store token and redirect to calendar
			if (data.token) {
				localStorage.setItem("token", data.token);
			}
			setSuccess(
				`Logged in as ${data.user.username} (${data.user.role})`
			);
			history.push("/");
			setPassword("");
		} catch (err) {
			console.error(err);
			setError(err.message || "Network error");
		}
	}

	function toggleRole(e) {
		e.preventDefault();
		setUsername((u) => (u === "admin" ? "general" : "admin"));
	}

	return (
		<div>
			<h2>Login</h2>

			<form onSubmit={handleSubmit}>
				{/* hidden username field */}
				<input type="hidden" name="username" value={username} />

				<div>
					<label>
						Password
						<input
							type="password"
							name="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</label>
				</div>

				<div>
					<button type="submit">Log in</button>
				</div>
			</form>

			<div style={{ marginTop: "0.5rem" }}>
				<a href="#" onClick={toggleRole}>
					{username === "admin"
						? "Log in as a general user"
						: "Log in as admin"}
				</a>
			</div>
		</div>
	);
}
