// Owner's expense/investment (paint, plumbing, repair, etc.)
// Can be general or tied to a specific tenant/flat
const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    // Owner who owns this record
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Optional: expense on a specific tenant / flat, else it's a general expense
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      default: null,
    },
    category: {
      type: String,
      enum: ["paint", "plumbing", "electrical", "repair", "furniture", "other"],
      default: "other",
    },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

expenseSchema.index({ ownerId: 1, tenantId: 1, date: -1 });

module.exports = mongoose.model("Expense", expenseSchema);
