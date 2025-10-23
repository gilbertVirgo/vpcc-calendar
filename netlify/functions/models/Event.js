const mongoose = require("mongoose");

const { Schema } = mongoose;

const eventSchema = new Schema(
	{
		title: { type: String, required: true },
		date: { type: Date, required: true },
		time: {
			start: [Number, Number], // hour, minute
			end: [Number, Number], // hour, minute
		},
		visibility: {
			type: String,
			enum: ["public", "private"],
			default: "public",
		},
		recursWeekly: { type: Boolean, default: false },
		recursionDetails: {
			endDate: { type: Date },
			exceptions: { type: [Date] },
		},
		location: { type: String },
		description: { type: String },
	},
	{ timestamps: true }
);

// In serverless environments, models may be reloaded — reuse if exists
const Event =
	mongoose.models && mongoose.models.Event
		? mongoose.models.Event
		: mongoose.model("Event", eventSchema, "events");

module.exports = Event;
