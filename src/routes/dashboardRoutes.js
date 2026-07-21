const express = require("express");
const router = express.Router();
const {
  getSummary,
  getReminders,
  getTenantsWithTotals,
  getTenantReport,
  getMyReport,
} = require("../controllers/dashboardController");
const { protect, ownerOnly } = require("../middleware/auth");

// Tenant's own report (any logged-in user with a tenant profile)
router.get("/my-report", protect, getMyReport);

// Owner-only dashboard endpoints
router.get("/summary", protect, ownerOnly, getSummary);
router.get("/reminders", protect, ownerOnly, getReminders);
router.get("/tenants", protect, ownerOnly, getTenantsWithTotals);
router.get("/tenant/:id", protect, ownerOnly, getTenantReport);

module.exports = router;
