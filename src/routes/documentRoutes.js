const express = require("express");
const router = express.Router();
const {
  createDocument,
  getDocuments,
  deleteDocument,
} = require("../controllers/documentController");
const { protect, ownerOnly } = require("../middleware/auth");

router.use(protect, ownerOnly);
router.route("/").post(createDocument).get(getDocuments);
router.delete("/:id", deleteDocument);

module.exports = router;
