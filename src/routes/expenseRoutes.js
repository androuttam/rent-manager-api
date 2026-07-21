const express = require("express");
const router = express.Router();
const { createExpense, getExpenses, updateExpense, deleteExpense } = require("../controllers/expenseController");
const { protect, ownerOnly } = require("../middleware/auth");

router.use(protect, ownerOnly);
router.route("/").post(createExpense).get(getExpenses);
router.route("/:id").put(updateExpense).delete(deleteExpense);

module.exports = router;
