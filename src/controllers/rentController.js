// Rent payment CRUD (scoped to the logged-in owner)
const RentPayment = require("../models/RentPayment");
const Tenant = require("../models/Tenant");

// @route POST /api/rent  (owner)
const createRent = async (req, res) => {
  try {
    const { tenantId, amount, mode, forMonth, forYear, paidDate, note } = req.body;
    if (!tenantId || !amount || !mode || !forMonth || !forYear) {
      return res.status(400).json({
        success: false,
        message: "tenantId, amount, mode, forMonth and forYear are required",
      });
    }
    // Tenant must belong to this owner
    const tenant = await Tenant.findOne({ _id: tenantId, ownerId: req.user._id });
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }
    const payment = await RentPayment.create({
      ownerId: req.user._id,
      tenantId,
      flatId: tenant.flatId || null,
      amount,
      mode,
      forMonth,
      forYear,
      paidDate: paidDate || Date.now(),
      note,
    });
    return res.status(201).json({ success: true, payment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/rent  (owner)  filters: ?tenantId= &month= &year=
const getRents = async (req, res) => {
  try {
    const filter = { ownerId: req.user._id };
    if (req.query.tenantId) filter.tenantId = req.query.tenantId;
    if (req.query.month) filter.forMonth = Number(req.query.month);
    if (req.query.year) filter.forYear = Number(req.query.year);
    const payments = await RentPayment.find(filter)
      .populate("tenantId", "name mobile")
      .sort({ forYear: -1, forMonth: -1, paidDate: -1 });
    return res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/rent/:id  (owner)
const updateRent = async (req, res) => {
  try {
    const { amount, mode, forMonth, forYear, paidDate, note } = req.body;
    const payment = await RentPayment.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { amount, mode, forMonth, forYear, paidDate, note },
      { new: true, runValidators: true }
    );
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }
    return res.json({ success: true, payment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route DELETE /api/rent/:id  (owner)
const deleteRent = async (req, res) => {
  try {
    const payment = await RentPayment.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }
    return res.json({ success: true, message: "Payment deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createRent, getRents, updateRent, deleteRent };
