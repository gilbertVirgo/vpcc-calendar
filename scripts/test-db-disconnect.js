// Quick test script to exercise connect/disconnect cycles using the serverless db helper.
// Run with: node scripts/test-db-disconnect.js

const { connect, disconnect } = require("../netlify/functions/utils/db");

async function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

async function runCycles(count = 5, delayMs = 500) {
	console.log(
		`Running ${count} connect/disconnect cycles with ${delayMs}ms delay`
	);

	for (let i = 1; i <= count; i++) {
		console.log(`\nCycle ${i}: connecting...`);
		try {
			const conn = await connect();
			console.log(`Connected (readyState=${conn.connection.readyState})`);
		} catch (err) {
			console.error(
				`Connect failed: ${err && err.message ? err.message : err}`
			);
		}

		console.log(`Cycle ${i}: waiting ${delayMs}ms...`);
		await sleep(delayMs);

		console.log(`Cycle ${i}: disconnecting...`);
		try {
			await disconnect();
			console.log("Disconnected");
		} catch (err) {
			console.error(
				`Disconnect failed: ${err && err.message ? err.message : err}`
			);
		}

		// give a small pause so sockets/handles can close
		await sleep(100);
	}

	console.log("All cycles complete");
}

// If run directly, execute with default params or values from env
if (require.main === module) {
	const cycles = parseInt(process.env.DB_CYCLES || "5", 10);
	const delay = parseInt(process.env.DB_DELAY_MS || "500", 10);
	runCycles(cycles, delay).catch((err) => {
		console.error("Test script error:", err);
		process.exit(1);
	});
}
