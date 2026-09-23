import {
	Link,
	Route,
	BrowserRouter as Router,
	Switch,
	Redirect,
} from "react-router-dom";

import ReadCalendar from "./pages/ReadCalendar";
import EditCalendar from "./pages/adminOnly/EditCalendar";
import ErrorBanner from "./components/ErrorBanner";
import Login from "./pages/Login";

import React from "react";
import { UserProvider, useUser } from "./contexts/UserContext";
import { AUTH_HUB_URL } from "./utils/apiFetch";

async function logout(e) {
	e.preventDefault();
	try {
		// Clear the shared vpcc_session cookie on the hub
		await fetch(`${AUTH_HUB_URL}/api/logout`, {
			method: "POST",
			credentials: "include",
		});
	} catch (err) {
		console.error("Hub logout failed", err);
	}
	localStorage.removeItem("token");
	window.location.href = "/";
}

function App() {
	const { user } = useUser();
	return (
		<Router>
			<main className="group--vt--lg">
				<ul className="nav__wrapper">
					<li>
						{user ? (
							<Link to="/" onClick={logout}>
								Logout
							</Link>
						) : (
							<Link to="/login">Login</Link>
						)}
					</li>
				</ul>

				<ErrorBanner />

				<Switch>
					<Route
						exact
						path="/"
						render={() => {
							// If not logged in, show the public ReadCalendar view.
							if (!user) return <ReadCalendar />;
							return user.role === "admin" ? (
								<EditCalendar />
							) : (
								<ReadCalendar />
							);
						}}
					/>
					<Route
						path="/login"
						render={() => {
							if (user) return <Redirect to="/" />;
							return <Login />;
						}}
					/>
					<Route
						path="/admin"
						render={() => {
							if (!user || user.role !== "admin")
								return <Redirect to="/" />;
							return <EditCalendar />;
						}}
					/>
				</Switch>
				<p>
					Designed by{" "}
					<a href="mailto:gilbertjvirgo@gmail.com">Gilbert Virgo</a>
				</p>
			</main>
		</Router>
	);
}

export default App;
