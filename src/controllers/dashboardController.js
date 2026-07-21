// Dashboard summaries, tenant-wise totals and full tenant reports
const mongoose = require("mongoose");
const Tenant = require("../models/Tenant");
const RentPayment = require("../models/RentPayment");
const Expense = require("../models/Expense");
const ElectricityBill = require("../models/ElectricityBill");
const Document = require("../models/Document");

// Count inclusive months between a start date and now (min 0)
const monthsElapsed = (start) => {
  const now = new Date();
  const s = new Date(start);
  const m = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth()) + 1;
  return m > 0 ? m : 0;
};

// Build an optional {forYear, forMonth} filter for rent/electricity
const periodFilter = (query) => {
  const f = {};
  if (query.year) f.forYear = Number(query.year);
  if (query.month) f.forMonth = Number(query.month);
  return f;
};

// @route GET /api/dashboard/summary  (owner)  optional: ?year= &month=
const getSummary = async (req, res) => {
  try {
    const pf = periodFilter(req.query);

    // ----- Rent income split by mode -----
    const incomeAgg = await RentPayment.aggregate([
      { $match: pf },
      { $group: { _id: "$mode", total: { $sum: "$amount" } } },
    ]);
    let cash = 0, transfer = 0;
    incomeAgg.forEach((r) => {
      if (r._id === "cash") cash = r.total;
      if (r._id === "transfer") transfer = r.total;
    });
    const totalIncome = cash + transfer;

    // ----- Expenses (filter by date range if year/month given) -----
    const expMatch = {};
    if (req.query.year && req.query.month) {
      const y = Number(req.query.year), m = Number(req.query.month);
      expMatch.date = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
    } else if (req.query.year) {
      const y = Number(req.query.year);
      expMatch.date = { $gte: new Date(y, 0, 1), $lt: new Date(y + 1, 0, 1) };
    }
    const expAgg = await Expense.aggregate([
      { $match: expMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalInvestment = expAgg[0] ? expAgg[0].total : 0;

    // ----- Electricity: collection (paid) + waived -----
    const elecAgg = await ElectricityBill.aggregate([
      { $match: pf },
      {
        $group: {
          _id: null,
          collection: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$billAmount", 0] },
          },
          waived: {
            $sum: { $cond: [{ $eq: ["$status", "waived"] }, "$waivedAmount", 0] },
          },
        },
      },
    ]);
    const electricityCollection = elecAgg[0] ? elecAgg[0].collection : 0;
    const electricityWaived = elecAgg[0] ? elecAgg[0].waived : 0;

    // ----- Pending rent (all-time, active tenants only) -----
    const activeTenants = await Tenant.find({ status: "active" }).select(
      "agreedRent moveInDate"
    );
    const paidAgg = await RentPayment.aggregate([
      { $group: { _id: "$tenantId", paid: { $sum: "$amount" } } },
    ]);
    const paidMap = {};
    paidAgg.forEach((p) => {
      paidMap[p._id.toString()] = p.paid;
    });
    let pendingRent = 0;
    activeTenants.forEach((t) => {
      if (!t.moveInDate || !t.agreedRent) return;
      const expected = monthsElapsed(t.moveInDate) * t.agreedRent;
      const paid = paidMap[t._id.toString()] || 0;
      const diff = expected - paid;
      if (diff > 0) pendingRent += diff;
    });

    return res.json({
      success: true,
      summary: {
        income: { cash, transfer, total: totalIncome },
        pendingRent,
        totalInvestment,
        electricity: {
          collection: electricityCollection,
          waived: electricityWaived,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/dashboard/tenants  (owner)
// Tenant list enriched with live totals (for the tenant list rows)
const getTenantsWithTotals = async (req, res) => {
  try {
    const filter = { status: { $ne: "deleted" } };
    if (req.query.status) filter.status = req.query.status;
    const tenants = await Tenant.find(filter)
      .populate("flatId", "flatNumber")
      .sort({ createdAt: -1 })
      .lean();

    // Aggregate totals per tenant
    const rentAgg = await RentPayment.aggregate([
      { $group: { _id: "$tenantId", total: { $sum: "$amount" } } },
    ]);
    const billAgg = await ElectricityBill.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: "$tenantId", total: { $sum: "$billAmount" } } },
    ]);
    const expAgg = await Expense.aggregate([
      { $match: { tenantId: { $ne: null } } },
      { $group: { _id: "$tenantId", total: { $sum: "$amount" } } },
    ]);

    const toMap = (arr) => {
      const m = {};
      arr.forEach((x) => { if (x._id) m[x._id.toString()] = x.total; });
      return m;
    };
    const rentMap = toMap(rentAgg);
    const billMap = toMap(billAgg);
    const expMap = toMap(expAgg);

    const enriched = tenants.map((t) => {
      const id = t._id.toString();
      const totalRentPaid = rentMap[id] || 0;
      const expected =
        t.moveInDate && t.agreedRent ? monthsElapsed(t.moveInDate) * t.agreedRent : 0;
      const totalPending = Math.max(0, expected - totalRentPaid);
      return {
        ...t,
        totals: {
          totalRentPaid,
          totalPending,
          totalBillPaid: billMap[id] || 0,
          totalExpense: expMap[id] || 0,
        },
      };
    });

    return res.json({ success: true, count: enriched.length, tenants: enriched });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Shared: build a full report object for one tenant id
const buildTenantReport = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId).populate(
    "flatId",
    "flatNumber floor rentAmount"
  );
  if (!tenant) return null;

  const [rentHistory, billHistory, expenses, documents] = await Promise.all([
    RentPayment.find({ tenantId }).sort({ forYear: -1, forMonth: -1 }),
    ElectricityBill.find({ tenantId }).sort({ forYear: -1, forMonth: -1 }),
    Expense.find({ tenantId }).sort({ date: -1 }),
    Document.find({ tenantId }).sort({ uploadedAt: -1 }),
  ]);

  const totalRentPaid = rentHistory.reduce((s, r) => s + r.amount, 0);
  const totalBillPaid = billHistory
    .filter((b) => b.status === "paid")
    .reduce((s, b) => s + b.billAmount, 0);
  const totalWaived = billHistory
    .filter((b) => b.status === "waived")
    .reduce((s, b) => s + b.waivedAmount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const expected =
    tenant.moveInDate && tenant.agreedRent
      ? monthsElapsed(tenant.moveInDate) * tenant.agreedRent
      : 0;
  const totalPending = Math.max(0, expected - totalRentPaid);

  return {
    tenant,
    totals: { totalRentPaid, totalPending, totalBillPaid, totalWaived, totalExpense },
    rentHistory,
    billHistory,
    expenses,
    documents,
  };
};

// @route GET /api/dashboard/tenant/:id  (owner)
const getTenantReport = async (req, res) => {
  try {
    const report = await buildTenantReport(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }
    return res.json({ success: true, report });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/dashboard/my-report  (tenant login only)
// A tenant sees only their own brief report
const getMyReport = async (req, res) => {
  try {
    if (!req.user.tenantId) {
      return res
        .status(403)
        .json({ success: false, message: "No tenant profile linked" });
    }
    const report = await buildTenantReport(req.user.tenantId);
    if (!report) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }
    return res.json({ success: true, report });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


// @route GET /api/dashboard/reminders  (owner)
// Active tenants who currently owe rent — shown on dashboard when app opens
const getReminders = async (req, res) => {
  try {
    const activeTenants = await Tenant.find({ status: "active" })
      .populate("flatId", "flatNumber")
      .select("name mobile agreedRent moveInDate flatId");

    const paidAgg = await RentPayment.aggregate([
      { $group: { _id: "$tenantId", paid: { $sum: "$amount" } } },
    ]);
    const paidMap = {};
    paidAgg.forEach((p) => { paidMap[p._id.toString()] = p.paid; });

    const reminders = [];
    activeTenants.forEach((t) => {
      if (!t.moveInDate || !t.agreedRent) return;
      const expected = monthsElapsed(t.moveInDate) * t.agreedRent;
      const paid = paidMap[t._id.toString()] || 0;
      const pending = expected - paid;
      if (pending > 0) {
        reminders.push({
          tenantId: t._id,
          name: t.name,
          mobile: t.mobile,
          flatNumber: t.flatId ? t.flatId.flatNumber : null,
          pendingAmount: pending,
        });
      }
    });

    reminders.sort((a, b) => b.pendingAmount - a.pendingAmount);
    return res.json({ success: true, count: reminders.length, reminders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSummary,
  getReminders,
  getTenantsWithTotals,
  getTenantReport,
  getMyReport,
};
