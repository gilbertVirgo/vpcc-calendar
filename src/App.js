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

import React, { useState } from "react";
import { useUser } from "./contexts/UserContext";
import { useError } from "./contexts/ErrorContext";

function App() {
	const { user, logout } = useUser();
	const { setError, clearError } = useError();
	const [loggingOut, setLoggingOut] = useState(false);

	async function handleLogout() {
		setLoggingOut(true);
		try {
			await logout();
			clearError();
		} catch (err) {
			console.error(err);
			setError("Couldn't log out. Please try again.");
		} finally {
			setLoggingOut(false);
		}
	}

	return (
		<Router>
			<main className="group--vt--lg">
				<ul className="nav__wrapper">
					<li>
						{user ? (
							<button
								type="button"
								className="button--sm"
								onClick={handleLogout}
								disabled={loggingOut}
							>
								Logout
							</button>
						) : (
							<Link to="/login" className="button button--sm">
								Login
							</Link>
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
			</main>
		</Router>
	);
}

export default App;
