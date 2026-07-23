const mongoose = require("mongoose");

const electricityBillSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    flat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
    },

    // Meter reading
    startUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    endUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    unitsUsed: {
      type: Number,
      default: 0,
    },

    ratePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      default: 0,
    },

    forMonth: { type: Number, required: true }, // 1-12
    forYear: { type: Number, required: true },

    status: {
      type: String,
      enum: ["paid", "waived", "pending"],
      default: "pending",
    },
    waivedAmount: {
      type: Number,
      default: 0,
    },

    paidOn: { type: Date },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

// Auto-calculate consumption and amount before every save
electricityBillSchema.pre("validate", function (next) {
  if (this.endUnit != null && this.startUnit != null) {
    const used = Number(this.endUnit) - Number(this.startUnit);
    this.unitsUsed = used > 0 ? used : 0;
  }

  const rate = Number(this.ratePerUnit) || 0;
  this.amount = this.unitsUsed * rate;

  if (this.status === "waived") {
    this.waivedAmount = this.amount;
  } else {
    this.waivedAmount = 0;
  }

  next();
});

// Block end reading lower than start reading
electricityBillSchema.pre("validate", function (next) {
  if (
    this.startUnit != null &&
    this.endUnit != null &&
    Number(this.endUnit) < Number(this.startUnit)
  ) {
    return next(new Error("End unit cannot be less than start unit"));
  }
  next();
});

module.exports = mongoose.model("ElectricityBill", electricityBillSchema);