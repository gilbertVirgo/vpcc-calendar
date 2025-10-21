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

function App() {
	const { user } = useUser();
	return (
		<Router>
			<main className="group--vt--lg">
				<ErrorBanner />

				<Switch>
					<Route
						exact
						path="/"
						render={() => {
							if (!user) return <Redirect to="/login" />;
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
