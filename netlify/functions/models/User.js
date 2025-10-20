const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const { Schema } = mongoose;

const userSchema = new Schema(
	{
		username: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		role: { type: String, enum: ["general", "admin"], default: "general" },
	},
	{ timestamps: true }
);

// Hash password before save if modified
userSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();
	try {
		// If the password already looks like a bcrypt hash, skip hashing
		// bcrypt hashes typically start with $2a$, $2b$, or $2y$ and are 60 chars
		if (
			typeof this.password === "string" &&
			/^\$2[aby]\$\d{2}\$/.test(this.password)
		) {
			return next();
		}
		const salt = await bcrypt.genSalt(10);
		this.password = await bcrypt.hash(this.password, salt);
		return next();
	} catch (err) {
		return next(err);
	}
});

// instance method to compare password
// Compare password with legacy support: if stored password is plain text, compare directly,
// then migrate to bcrypt by hashing & saving the user document.
userSchema.methods.comparePassword = async function (candidatePassword) {
	if (!this.password) return false;

	const isBcrypt =
		typeof this.password === "string" &&
		/^\$2[aby]\$\d{2}\$/.test(this.password);
	if (isBcrypt) {
		return bcrypt.compare(candidatePassword, this.password);
	}

	// legacy plaintext stored
	if (candidatePassword === this.password) {
		// migrate: hash and save (do not await to avoid blocking, but attempt)
		try {
			const salt = await bcrypt.genSalt(10);
			this.password = await bcrypt.hash(candidatePassword, salt);
			// save without running other hooks
			await this.save();
		} catch (err) {
			// log but do not fail authentication
			console.error(
				"Failed to migrate plaintext password to bcrypt",
				err
			);
		}
		return true;
	}

	return false;
};

const User =
	mongoose.models && mongoose.models.User
		? mongoose.models.User
		: mongoose.model("User", userSchema, "users");

module.exports = User;
