const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../..", ".env") });

// Support multiple common env names
const MONGO_URI =
	process.env.MONGODB_URI ||
	process.env.MONGO_URL ||
	process.env.MONGO_CONNECTION;

// Cached connection for serverless environments
if (!global._mongoMongoose) {
	global._mongoMongoose = {
		conn: null,
		promise: null,
		listenersAttached: false,
	};
}

function maskUri(uri) {
	if (!uri) return "(none)";
	// remove user:pass@ portion
	return uri.replace(/:\/\/.*@/, "://****@");
}

async function connect() {
	// If we already have a connected mongoose instance, return it
	if (
		global._mongoMongoose.conn &&
		global._mongoMongoose.conn.connection &&
		global._mongoMongoose.conn.connection.readyState === 1
	) {
		return global._mongoMongoose.conn;
	}

	if (!MONGO_URI) {
		throw new Error(
			"Missing MongoDB connection string. Set MONGODB_URI (or MONGO_URL / MONGO_CONNECTION) in env"
		);
	}

	if (!global._mongoMongoose.promise) {
		// disable mongoose buffering of commands to fail fast when disconnected
		mongoose.set("bufferCommands", false);

		const opts = {
			// Fail fast if the server selection cannot be made
			serverSelectionTimeoutMS: 10000,
			connectTimeoutMS: 10000,
			socketTimeoutMS: 45000,
			useNewUrlParser: true,
			useUnifiedTopology: true,
			family: 4,
		};

		console.log("[db] connecting to", maskUri(MONGO_URI));

		// Attach connection event listeners only once to avoid duplicate logs
		if (!global._mongoMongoose.listenersAttached) {
			mongoose.connection.on("error", (err) => {
				console.error(
					"[db] connection error:",
					err && err.message ? err.message : err
				);
			});
			mongoose.connection.on("disconnected", () => {
				console.log("[db] disconnected");
			});
			mongoose.connection.on("reconnected", () => {
				console.log("[db] reconnected");
			});
			global._mongoMongoose.listenersAttached = true;
		}

		global._mongoMongoose.promise = mongoose
			.connect(MONGO_URI, opts)
			.then((mongooseInstance) => {
				console.log(
					"[db] connected successfully (readyState=",
					mongooseInstance.connection.readyState,
					")"
				);
				return mongooseInstance;
			})
			.catch((err) => {
				// clear the cached promise so future attempts can retry
				global._mongoMongoose.promise = null;
				console.error(
					"[db] connection failed:",
					err && err.message ? err.message : err
				);
				throw err;
			});
	}

	global._mongoMongoose.conn = await global._mongoMongoose.promise;
	return global._mongoMongoose.conn;
}

async function disconnect() {
	try {
		if (global._mongoMongoose && global._mongoMongoose.conn) {
			await mongoose.disconnect();
			global._mongoMongoose.conn = null;
			global._mongoMongoose.promise = null;
			console.log("[db] disconnected via helper");
		}
	} catch (err) {
		console.error(
			"[db] error during disconnect",
			err && err.message ? err.message : err
		);
	}
}

module.exports = { connect, disconnect };
