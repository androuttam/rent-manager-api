// Electricity bill CRUD (scoped to the logged-in owner).
// status "paid"   -> tenant paid billAmount
// status "waived" -> owner waived; waivedAmount auto = unitsUsed * ratePerUnit
const ElectricityBill = require("../models/ElectricityBill");
const Tenant = require("../models/Tenant");

// Helper: compute amounts based on status
const buildAmounts = (status, unitsUsed = 0, ratePerUnit = 0, billAmount) => {
  const computed = Number(unitsUsed) * Number(ratePerUnit);
  if (status === "waived") {
    return { billAmount: 0, waivedAmount: computed };
  }
  // paid or pending: billAmount is either given or computed from units*rate
  return {
    billAmount: billAmount != null ? Number(billAmount) : computed,
    waivedAmount: 0,
  };
};

// @route POST /api/electricity  (owner)
const createBill = async (req, res) => {
  try {
    const {
      tenantId, forMonth, forYear, unitsUsed, ratePerUnit,
      billAmount, status, mode, paidDate, note,
    } = req.body;

    if (!tenantId || !forMonth || !forYear) {
      return res.status(400).json({
        success: false,
        message: "tenantId, forMonth and forYear are required",
      });
    }
    // Tenant must belong to this owner
    const tenant = await Tenant.findOne({ _id: tenantId, ownerId: req.user._id });
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }

    const st = status || "pending";
    const amounts = buildAmounts(st, unitsUsed, ratePerUnit, billAmount);

    const bill = await ElectricityBill.create({
      ownerId: req.user._id,
      tenantId,
      flatId: tenant.flatId || null,
      forMonth,
      forYear,
      unitsUsed: unitsUsed || 0,
      ratePerUnit: ratePerUnit || 0,
      billAmount: amounts.billAmount,
      waivedAmount: amounts.waivedAmount,
      status: st,
      mode: mode || "none",
      paidDate: st === "paid" ? paidDate || Date.now() : null,
      note,
    });
    return res.status(201).json({ success: true, bill });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/electricity  (owner)  filters: ?tenantId= &year= &month=
const getBills = async (req, res) => {
  try {
    const filter = { ownerId: req.user._id };
    if (req.query.tenantId) filter.tenantId = req.query.tenantId;
    if (req.query.year) filter.forYear = Number(req.query.year);
    if (req.query.month) filter.forMonth = Number(req.query.month);
    const bills = await ElectricityBill.find(filter)
      .populate("tenantId", "name mobile")
      .sort({ forYear: -1, forMonth: -1 });
    return res.json({ success: true, count: bills.length, bills });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/electricity/:id  (owner)
const updateBill = async (req, res) => {
  try {
    const {
      forMonth, forYear, unitsUsed, ratePerUnit,
      billAmount, status, mode, paidDate, note,
    } = req.body;

    const bill = await ElectricityBill.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    if (forMonth != null) bill.forMonth = forMonth;
    if (forYear != null) bill.forYear = forYear;
    if (unitsUsed != null) bill.unitsUsed = unitsUsed;
    if (ratePerUnit != null) bill.ratePerUnit = ratePerUnit;
    if (mode != null) bill.mode = mode;
    if (note != null) bill.note = note;
    if (status != null) bill.status = status;

    // Recompute money fields based on the (possibly new) status
    const amounts = buildAmounts(
      bill.status, bill.unitsUsed, bill.ratePerUnit,
      billAmount != null ? billAmount : bill.billAmount
    );
    bill.billAmount = amounts.billAmount;
    bill.waivedAmount = amounts.waivedAmount;
    bill.paidDate = bill.status === "paid" ? paidDate || bill.paidDate || Date.now() : null;

    await bill.save();
    return res.json({ success: true, bill });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route DELETE /api/electricity/:id  (owner)
const deleteBill = async (req, res) => {
  try {
    const bill = await ElectricityBill.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }
    return res.json({ success: true, message: "Bill deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createBill, getBills, updateBill, deleteBill };
