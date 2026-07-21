const express = require("express");
const router = express.Router();
const { createRent, getRents, updateRent, deleteRent } = require("../controllers/rentController");
const { protect, ownerOnly } = require("../middleware/auth");

router.use(protect, ownerOnly);
router.route("/").post(createRent).get(getRents);
router.route("/:id").put(updateRent).delete(deleteRent);

module.exports = router;
