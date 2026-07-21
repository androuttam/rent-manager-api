// Monthly electricity bill per tenant.
// status "paid"  -> tenant paid billAmount
// status "waived" -> owner waived it off; waivedAmount = unitsUsed * ratePerUnit
const mongoose = require("mongoose");

const electricityBillSchema = new mongoose.Schema(
  {
    // Owner who owns this record
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
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
    forMonth: { type: Number, required: true, min: 1, max: 12 },
    forYear: { type: Number, required: true },
    unitsUsed: { type: Number, default: 0 },
    ratePerUnit: { type: Number, default: 0 },
    // billAmount is what tenant pays when status = paid
    billAmount: { type: Number, default: 0 },
    // waivedAmount is the value forgiven when status = waived
    waivedAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["paid", "waived", "pending"],
      default: "pending",
    },
    mode: {
      type: String,
      enum: ["cash", "transfer", "none"],
      default: "none",
    },
    paidDate: { type: Date },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

electricityBillSchema.index({ ownerId: 1, tenantId: 1, forYear: 1, forMonth: 1 });

module.exports = mongoose.model("ElectricityBill", electricityBillSchema);
