// A flat/unit owned by the owner
const mongoose = require("mongoose");

const flatSchema = new mongoose.Schema(
  {
    flatNumber: { type: String, required: true, trim: true },
    floor: { type: String, trim: true },
    // Default rent for this flat (tenant may have an agreed rent that differs)
    rentAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["occupied", "vacant"],
      default: "vacant",
    },
    // Currently assigned tenant, if any
    currentTenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Flat", flatSchema);
