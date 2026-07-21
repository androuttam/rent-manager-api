const express = require("express");
const router = express.Router();
const { createBill, getBills, updateBill, deleteBill } = require("../controllers/electricityController");
const { protect, ownerOnly } = require("../middleware/auth");

router.use(protect, ownerOnly);
router.route("/").post(createBill).get(getBills);
router.route("/:id").put(updateBill).delete(deleteBill);

module.exports = router;
