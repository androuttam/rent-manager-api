const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { uploadFile } = require("../controllers/documentController");
const { protect, ownerOnly } = require("../middleware/auth");

// Single file upload, field name "file"
router.post("/", protect, ownerOnly, upload.single("file"), uploadFile);

module.exports = router;
