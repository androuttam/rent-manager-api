const mongoose = require('mongoose');

const electricityBillSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
    },
    billDate: { type: Date, default: Date.now },
    forMonth: { type: Number, min: 1, max: 12 },
    forYear: { type: Number },

    // New meter reading fields
    startUnit: { type: Number, required: true, min: 0 },
    endUnit: { type: Number, required: true, min: 0 },

    // Auto-calculated: endUnit - startUnit
    unitsUsed: { type: Number, default: 0, min: 0 },

    ratePerUnit: { type: Number, required: true, min: 0 },
    amount: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ['paid', 'waived', 'pending'],
      default: 'pending',
    },
    waivedAmount: { type: Number, default: 0 },
    paidOn: { type: Date },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

// Auto-calculate consumption and amounts before every save
electricityBillSchema.pre('validate', function (next) {
  if (this.endUnit < this.startUnit) {
    return next(new Error('End unit cannot be less than start unit'));
  }

  this.unitsUsed = Number((this.endUnit - this.startUnit).toFixed(2));
  this.amount = Number((this.unitsUsed * this.ratePerUnit).toFixed(2));

  // Waived bills are counted as loss to the owner
  this.waivedAmount = this.status === 'waived' ? this.amount : 0;

  if (this.status !== 'paid') {
    this.paidOn = undefined;
  } else if (!this.paidOn) {
    this.paidOn = new Date();
  }

  next();
});

module.exports = mongoose.model('ElectricityBill', electricityBillSchema);