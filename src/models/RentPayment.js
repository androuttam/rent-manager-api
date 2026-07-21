// A single rent payment made by a tenant for a given month
const mongoose = require("mongoose");

const rentPaymentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      default: null,
    },
    amount: { type: Number, required: true },
    mode: {
      type: String,
      enum: ["cash", "transfer"],
      required: true,
    },
    // The month/year this payment is FOR (not necessarily when it was paid)
    forMonth: { type: Number, required: true, min: 1, max: 12 },
    forYear: { type: Number, required: true },
    paidDate: { type: Date, default: Date.now },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

// Speeds up tenant-wise and month-wise reports
rentPaymentSchema.index({ tenantId: 1, forYear: 1, forMonth: 1 });

module.exports = mongoose.model("RentPayment", rentPaymentSchema);
