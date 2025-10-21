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
	global._mongoMongoose = { conn: null, promise: null };
}

function maskUri(uri) {
	if (!uri) return "(none)";
	// remove user:pass@ portion
	return uri.replace(/:\/\/.*@/, "://****@");
}

async function connect() {
	if (global._mongoMongoose.conn) {
		return global._mongoMongoose.conn;
	}

	if (!MONGO_URI) {
		throw new Error(
			"Missing MongoDB connection string. Set MONGODB_URI (or MONGO_URL / MONGO_CONNECTION) in env"
		);
	}

	if (!global._mongoMongoose.promise) {
		const opts = {
			// Fail fast if the server selection cannot be made
			serverSelectionTimeoutMS: 10000,
			connectTimeoutMS: 10000,
			socketTimeoutMS: 45000,
		};

		console.log("[db] connecting to", maskUri(MONGO_URI));

		global._mongoMongoose.promise = mongoose
			.connect(MONGO_URI, opts)
			.then((mongooseInstance) => {
				mongooseInstance.connection.on("error", (err) => {
					console.error(
						"[db] connection error:",
						err && err.message ? err.message : err
					);
				});
				mongooseInstance.connection.on("disconnected", () => {
					console.log("[db] disconnected");
				});
				mongooseInstance.connection.on("reconnected", () => {
					console.log("[db] reconnected");
				});
				console.log("[db] connected successfully");
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

module.exports = { connect };
