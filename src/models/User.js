// User account for login (owner or tenant)
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["owner", "tenant"],
      required: true,
    },
    languagePref: {
      type: String,
      enum: ["hi", "en"],
      default: "en",
    },
    // Which owner this account belongs to.
    // Owners have no parent owner (null); tenant logins are linked to their owner.
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    // Linked tenant record when role is "tenant"
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
