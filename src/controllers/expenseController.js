// Expense (owner investment/spending) CRUD (scoped to the logged-in owner)
const Expense = require("../models/Expense");
const Tenant = require("../models/Tenant");

// @route POST /api/expenses  (owner)
const createExpense = async (req, res) => {
  try {
    const { tenantId, flatId, category, amount, date, description } = req.body;
    if (!amount) {
      return res.status(400).json({ success: false, message: "amount is required" });
    }
    // If tied to a tenant, that tenant must belong to this owner
    if (tenantId) {
      const tenant = await Tenant.findOne({ _id: tenantId, ownerId: req.user._id });
      if (!tenant) {
        return res.status(404).json({ success: false, message: "Tenant not found" });
      }
    }
    const expense = await Expense.create({
      ownerId: req.user._id,
      tenantId: tenantId || null,
      flatId: flatId || null,
      category,
      amount,
      date: date || Date.now(),
      description,
    });
    return res.status(201).json({ success: true, expense });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/expenses  (owner)  filters: ?tenantId= &year= &month=
const getExpenses = async (req, res) => {
  try {
    const filter = { ownerId: req.user._id };
    if (req.query.tenantId) filter.tenantId = req.query.tenantId;
    if (req.query.year || req.query.month) {
      const y = req.query.year ? Number(req.query.year) : null;
      const m = req.query.month ? Number(req.query.month) : null;
      // Build a date range for the requested year/month
      if (y && m) {
        filter.date = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
      } else if (y) {
        filter.date = { $gte: new Date(y, 0, 1), $lt: new Date(y + 1, 0, 1) };
      }
    }
    const expenses = await Expense.find(filter)
      .populate("tenantId", "name mobile")
      .sort({ date: -1 });
    return res.json({ success: true, count: expenses.length, expenses });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/expenses/:id  (owner)
const updateExpense = async (req, res) => {
  try {
    const { tenantId, flatId, category, amount, date, description } = req.body;
    // If re-tagging to a tenant, that tenant must belong to this owner
    if (tenantId) {
      const tenant = await Tenant.findOne({ _id: tenantId, ownerId: req.user._id });
      if (!tenant) {
        return res.status(404).json({ success: false, message: "Tenant not found" });
      }
    }
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { tenantId, flatId, category, amount, date, description },
      { new: true, runValidators: true }
    );
    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }
    return res.json({ success: true, expense });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route DELETE /api/expenses/:id  (owner)
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }
    return res.json({ success: true, message: "Expense deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createExpense, getExpenses, updateExpense, deleteExpense };
