import { Link, Route, BrowserRouter as Router, Switch } from "react-router-dom";

import Calendar from "./pages/Calendar";
import EditCalendar from "./pages/adminOnly/EditCalendar";
import ErrorBanner from "./components/ErrorBanner";
import Login from "./pages/Login";
import React from "react";

function App() {
	return (
		<Router>
			<main className="group--vt--lg">
				<ErrorBanner />

				<nav>
					<Link to="/">Calendar</Link>
					{" | "}
					<Link to="/login">Login</Link>
					{" | "}
					<Link to="/admin">Admin</Link>
				</nav>

				<Switch>
					<Route exact path="/" component={Calendar} />
					<Route path="/login" component={Login} />
					<Route path="/admin" component={EditCalendar} />
				</Switch>
			</main>
		</Router>
	);
}

export default App;
