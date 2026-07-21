// Flat routes (owner only)
const express = require("express");
const router = express.Router();
const {
  createFlat,
  getFlats,
  getFlat,
  updateFlat,
  deleteFlat,
} = require("../controllers/flatController");
const { protect, ownerOnly } = require("../middleware/auth");

router.use(protect, ownerOnly); // all flat routes are owner-only

router.route("/").post(createFlat).get(getFlats);
router.route("/:id").get(getFlat).put(updateFlat).delete(deleteFlat);

module.exports = router;
