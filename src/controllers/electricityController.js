const ElectricityBill = require("../models/ElectricityBill");

// Create a new electricity bill
const createBill = async (req, res) => {
  try {
    const {
      tenantId,
      flatId,
      startUnit,
      endUnit,
      ratePerUnit,
      forMonth,
      forYear,
      status,
      note,
    } = req.body;

    if (!tenantId) {
      return res.status(400).json({ message: "Tenant is required" });
    }
    if (startUnit == null || endUnit == null) {
      return res
        .status(400)
        .json({ message: "Start unit and end unit are required" });
    }

    const bill = await ElectricityBill.create({
      ownerId: req.user._id,
      tenantId,
      flatId,
      startUnit: Number(startUnit),
      endUnit: Number(endUnit),
      ratePerUnit: Number(ratePerUnit),
      forMonth: Number(forMonth),
      forYear: Number(forYear),
      status: status || "pending",
      note,
    });

    await bill.populate("tenantId", "name mobile");
    res.status(201).json(bill);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// List bills, optional filters: tenantId, status, month, year
const getBills = async (req, res) => {
  try {
    const filter = { ownerId: req.user._id };

    if (req.query.tenantId) filter.tenantId = req.query.tenantId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.month) filter.forMonth = Number(req.query.month);
    if (req.query.year) filter.forYear = Number(req.query.year);

    const bills = await ElectricityBill.find(filter)
      .populate("tenantId", "name mobile")
      .sort({ forYear: -1, forMonth: -1, createdAt: -1 });

    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Single bill by id
const getBillById = async (req, res) => {
  try {
    const bill = await ElectricityBill.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    }).populate("tenantId", "name mobile");

    if (!bill) return res.status(404).json({ message: "Bill not found" });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Latest bill of a tenant, used to auto-fill next start unit
const getLastBill = async (req, res) => {
  try {
    const tenantId = req.query.tenantId || req.params.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "Tenant is required" });
    }

    const bill = await ElectricityBill.findOne({
      ownerId: req.user._id,
      tenantId,
    }).sort({ forYear: -1, forMonth: -1, createdAt: -1 });

    res.json({ lastEndUnit: bill ? bill.endUnit || 0 : 0, bill: bill || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Pending bills, feeds the reminders section
const getPendingBills = async (req, res) => {
  try {
    const bills = await ElectricityBill.find({
      ownerId: req.user._id,
      status: "pending",
    })
      .populate("tenantId", "name mobile")
      .sort({ forYear: -1, forMonth: -1 });

    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Full update, used by the edit option
const updateBill = async (req, res) => {
  try {
    const bill = await ElectricityBill.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });

    if (!bill) return res.status(404).json({ message: "Bill not found" });

    const fields = [
      "tenantId",
      "flatId",
      "startUnit",
      "endUnit",
      "ratePerUnit",
      "forMonth",
      "forYear",
      "status",
      "note",
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) bill[f] = req.body[f];
    });

    bill.paidOn = bill.status === "paid" ? bill.paidOn || new Date() : undefined;

    // pre-validate hook recalculates unitsUsed, amount, waivedAmount
    await bill.save();
    await bill.populate("tenantId", "name mobile");

    res.json(bill);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Status only change
const updateBillStatus = async (req, res) => {
  try {
    const bill = await ElectricityBill.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });

    if (!bill) return res.status(404).json({ message: "Bill not found" });

    bill.status = req.body.status;
    bill.paidOn = req.body.status === "paid" ? new Date() : undefined;
    await bill.save();

    res.json(bill);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteBill = async (req, res) => {
  try {
    const bill = await ElectricityBill.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user._id,
    });

    if (!bill) return res.status(404).json({ message: "Bill not found" });
    res.json({ message: "Bill deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createBill,
  getBills,
  getBillById,
  getLastBill,
  getPendingBills,
  updateBill,
  updateBillStatus,
  deleteBill,
};