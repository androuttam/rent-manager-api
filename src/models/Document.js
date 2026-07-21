// Generic uploaded document reference (agreement, ID proof scans, misc)
const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
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

documentSchema.index({ tenantId: 1 });

module.exports = mongoose.model("Document", documentSchema);
