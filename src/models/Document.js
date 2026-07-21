// Generic uploaded document reference (agreement, ID proof scans, misc)
const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    // Owner who owns this record
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    docType: {
      type: String,
      enum: ["agreement", "id_proof", "photo", "other"],
      default: "other",
    },
    title: { type: String, trim: true },
    fileUrl: { type: String, required: true },
    publicId: { type: String, trim: true }, // Cloudinary public_id for deletion
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Most queries are "this owner's docs for this tenant"
documentSchema.index({ ownerId: 1, tenantId: 1 });

module.exports = mongoose.model("Document", documentSchema);
