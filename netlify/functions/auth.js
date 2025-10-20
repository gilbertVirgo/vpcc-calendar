const { connect } = require("./utils/db");
const User = require("./models/User");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

exports.handler = async function (event) {
	try {
		if (event.httpMethod !== "POST") {
			return {
				statusCode: 405,
				body: JSON.stringify({ error: "Method not allowed" }),
			};
		}

		const body = event.body ? JSON.parse(event.body) : {};
		const { username, password } = body;
		if (!username || !password) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					error: "username and password required",
				}),
			};
		}

		await connect();

		console.log("Looking for user:", username);

		const user = await User.findOne({ username }).exec();

		console.log({ user });

		if (!user) {
			return {
				statusCode: 401,
				body: JSON.stringify({ error: "Invalid credentials" }),
			};
		}

		const match = await user.comparePassword(password);
		if (!match) {
			return {
				statusCode: 401,
				body: JSON.stringify({ error: "Invalid credentials" }),
			};
		}

		if (!JWT_SECRET) {
			console.error("JWT_SECRET is not set");
			return {
				statusCode: 500,
				body: JSON.stringify({ error: "Server misconfiguration" }),
			};
		}

		const token = jwt.sign(
			{ id: user._id, username: user.username, role: user.role },
			JWT_SECRET,
			{ expiresIn: "7d" }
		);

		return {
			statusCode: 200,
			body: JSON.stringify({
				user: {
					id: user._id,
					username: user.username,
					role: user.role,
				},
				token,
			}),
		};
	} catch (err) {
		console.error(err);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: err.message || "Internal error" }),
		};
	}
};
