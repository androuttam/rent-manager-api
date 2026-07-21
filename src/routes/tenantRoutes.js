// Tenant routes (owner only)
const express = require("express");
const router = express.Router();
const {
  createTenant,
  getTenants,
  getTenant,
  updateTenant,
  changeTenantStatus,
  deleteTenant,
} = require("../controllers/tenantController");
const { protect, ownerOnly } = require("../middleware/auth");

router.use(protect, ownerOnly);

router.route("/").post(createTenant).get(getTenants);
router.route("/:id").get(getTenant).put(updateTenant).delete(deleteTenant);
router.patch("/:id/status", changeTenantStatus);

module.exports = router;
