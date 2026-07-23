const ElectricityBill = require("../models/ElectricityBill");

// Create a new electricity bill
exports.createBill = async (req, res) => {
  try {
    const {
      tenant,
      flat,
      startUnit,
      endUnit,
      ratePerUnit,
      forMonth,
      forYear,
      status,
      note,
    } = req.body;

    if (startUnit == null || endUnit == null) {
      return res
        .status(400)
        .json({ message: "Start unit and end unit are required" });
    }

    const bill = await ElectricityBill.create({
      owner: req.user._id,
      tenant,
      flat,
      startUnit: Number(startUnit),
      endUnit: Number(endUnit),
      ratePerUnit: Number(ratePerUnit),
      forMonth: Number(forMonth),
      forYear: Number(forYear),
      status: status || "pending",
      note,
    });

    const populated = await bill.populate("tenant", "name mobile");
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// List bills (optional filters: tenant, status, month, year)
exports.getBills = async (req, res) => {
  try {
    const filter = { owner: req.user._id };

    if (req.query.tenant) filter.tenant = req.query.tenant;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.month) filter.forMonth = Number(req.query.month);
    if (req.query.year) filter.forYear = Number(req.query.year);

    const bills = await ElectricityBill.find(filter)
      .populate("tenant", "name mobile")
      .sort({ forYear: -1, forMonth: -1, createdAt: -1 });

    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get one bill
exports.getBillById = async (req, res) => {
  try {
    const bill = await ElectricityBill.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).populate("tenant", "name mobile");

    if (!bill) return res.status(404).json({ message: "Bill not found" });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a bill (used by the edit option in reminders)
exports.updateBill = async (req, res) => {
  try {
    const bill = await ElectricityBill.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!bill) return res.status(404).json({ message: "Bill not found" });

    const fields = [
      "tenant",
      "flat",
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

    if (bill.status === "paid" && !bill.paidOn) {
      bill.paidOn = new Date();
    }
    if (bill.status !== "paid") {
      bill.paidOn = undefined;
    }

    // pre-validate hook recalculates unitsUsed, amount, waivedAmount
    await bill.save();

    const populated = await bill.populate("tenant", "name mobile");
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Change only the status
exports.updateBillStatus = async (req, res) => {
  try {
    const bill = await ElectricityBill.findOne({
      _id: req.params.id,
      owner: req.user._id,
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

// Pending bills — feeds the reminders section
exports.getPendingBills = async (req, res) => {
  try {
    const bills = await ElectricityBill.find({
      owner: req.user._id,
      status: "pending",
    })
      .populate("tenant", "name mobile")
      .sort({ forYear: -1, forMonth: -1 });

    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteBill = async (req, res) => {
  try {
    const bill = await ElectricityBill.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!bill) return res.status(404).json({ message: "Bill not found" });
    res.json({ message: "Bill deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get one bill by id
exports.getBillById = async (req, res) => {
  try {
    const bill = await ElectricityBill.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).populate("tenant", "name mobile");

    if (!bill) return res.status(404).json({ message: "Bill not found" });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Pending bills - feeds the reminders section
exports.getPendingBills = async (req, res) => {
  try {
    const bills = await ElectricityBill.find({
      owner: req.user._id,
      status: "pending",
    })
      .populate("tenant", "name mobile")
      .sort({ forYear: -1, forMonth: -1 });

    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Latest bill for a tenant - used to auto-fill start unit on the next bill
exports.getLastBill = async (req, res) => {
  try {
    const tenantId = req.query.tenant || req.params.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "Tenant id is required" });
    }

    const bill = await ElectricityBill.findOne({
      owner: req.user._id,
      tenant: tenantId,
    }).sort({ forYear: -1, forMonth: -1, createdAt: -1 });

    if (!bill) {
      // No previous bill - app should start from 0
      return res.json({ lastEndUnit: 0, bill: null });
    }

    res.json({ lastEndUnit: bill.endUnit || 0, bill });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};