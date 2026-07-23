const ElectricityBill = require('../models/ElectricityBill');
const Tenant = require('../models/Tenant');

// Helper: make sure the bill belongs to the logged-in owner
const findOwnedBill = async (id, ownerId) => {
  const bill = await ElectricityBill.findOne({ _id: id, owner: ownerId });
  return bill;
};

// @desc    Create electricity bill
// @route   POST /api/electricity
// @access  Owner
exports.createBill = async (req, res) => {
  try {
    const {
      tenantId,
      flatId,
      billDate,
      forMonth,
      forYear,
      startUnit,
      endUnit,
      ratePerUnit,
      status,
      remarks,
    } = req.body;

    const tenant = await Tenant.findOne({ _id: tenantId, owner: req.user._id });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const bill = new ElectricityBill({
      owner: req.user._id,
      tenantId,
      flatId: flatId || tenant.flatId,
      billDate: billDate || Date.now(),
      forMonth,
      forYear,
      startUnit: Number(startUnit),
      endUnit: Number(endUnit),
      ratePerUnit: Number(ratePerUnit),
      status: status || 'pending',
      remarks,
    });

    await bill.save();
    res.status(201).json(bill);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    List bills (optional filters)
// @route   GET /api/electricity?tenantId=&status=&year=&month=
// @access  Owner
exports.getBills = async (req, res) => {
  try {
    const { tenantId, status, year, month } = req.query;
    const filter = { owner: req.user._id };

    if (tenantId) filter.tenantId = tenantId;
    if (status) filter.status = status;
    if (year) filter.forYear = Number(year);
    if (month) filter.forMonth = Number(month);

    const bills = await ElectricityBill.find(filter)
      .populate('tenantId', 'name mobile')
      .sort({ billDate: -1 });

    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get last bill of a tenant (to prefill start unit)
// @route   GET /api/electricity/last/:tenantId
// @access  Owner
exports.getLastBill = async (req, res) => {
  try {
    const bill = await ElectricityBill.findOne({
      owner: req.user._id,
      tenantId: req.params.tenantId,
    }).sort({ billDate: -1, createdAt: -1 });

    if (!bill) {
      return res.json({ lastEndUnit: 0, lastRatePerUnit: 0 });
    }

    res.json({
      lastEndUnit: bill.endUnit,
      lastRatePerUnit: bill.ratePerUnit,
      lastBillDate: bill.billDate,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update a bill (units, rate, date, status)
// @route   PUT /api/electricity/:id
// @access  Owner
exports.updateBill = async (req, res) => {
  try {
    const bill = await findOwnedBill(req.params.id, req.user._id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    const fields = [
      'billDate',
      'forMonth',
      'forYear',
      'startUnit',
      'endUnit',
      'ratePerUnit',
      'status',
      'remarks',
      'flatId',
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) bill[f] = req.body[f];
    });

    await bill.save(); // triggers recalculation of unitsUsed + amount
    res.json(bill);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Change only the status (used from reminders screen)
// @route   PATCH /api/electricity/:id/status
// @access  Owner
exports.updateBillStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['paid', 'waived', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const bill = await findOwnedBill(req.params.id, req.user._id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    bill.status = status;
    await bill.save();
    res.json(bill);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc    Delete a bill
// @route   DELETE /api/electricity/:id
// @access  Owner
exports.deleteBill = async (req, res) => {
  try {
    const bill = await findOwnedBill(req.params.id, req.user._id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    await bill.deleteOne();
    res.json({ message: 'Bill deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};