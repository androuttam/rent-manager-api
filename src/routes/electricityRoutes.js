const express = require("express");
const router = express.Router();

const { protect, ownerOnly } = require("../middleware/auth");
const ctrl = require("../controllers/electricityController");

router.use(protect);

// Fixed paths must come before /:id, otherwise Express treats them as an id
router.get("/pending", ownerOnly, ctrl.getPendingBills);
router.get("/last", ownerOnly, ctrl.getLastBill);

router
  .route("/")
  .get(ctrl.getBills)
  .post(ownerOnly, ctrl.createBill);

router
  .route("/:id")
  .get(ctrl.getBillById)
  .put(ownerOnly, ctrl.updateBill)
  .delete(ownerOnly, ctrl.deleteBill);

router.patch("/:id/status", ownerOnly, ctrl.updateBillStatus);

module.exports = router;