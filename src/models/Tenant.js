// Tenant record: personal info, vehicle, ID proofs, references, documents
const mongoose = require("mongoose");

// Sub-schema for an ID proof (e.g. Aadhaar, PAN)
const idProofSchema = new mongoose.Schema(
  {
    type: { type: String, trim: true },       // e.g. "Aadhaar", "PAN"
    number: { type: String, trim: true },
    docUrl: { type: String, trim: true },      // Cloudinary URL
    publicId: { type: String, trim: true },    // Cloudinary public_id (for deletion)
  },
  { _id: false }
);

// Sub-schema for a reference person
const referenceSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    mobile: { type: String, trim: true },
    address: { type: String, trim: true },
  },
  { _id: false }
);

const tenantSchema = new mongoose.Schema(
  {
    // Owner who created/owns this tenant
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Mandatory core fields
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },

    // Optional personal info
    email: { type: String, trim: true },
    permanentAddress: { type: String, trim: true },
    photoUrl: { type: String, trim: true },
    photoPublicId: { type: String, trim: true },

    // Vehicle details (optional)
    vehicleType: { type: String, trim: true },
    vehicleNumber: { type: String, trim: true },

    // Up to two ID proofs (flexible array)
    idProofs: [idProofSchema],

    // Reference persons (name / mobile / address)
    references: [referenceSchema],

    // Agreement document
    agreementUrl: { type: String, trim: true },
    agreementPublicId: { type: String, trim: true },

    // Assignment & rent
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      default: null,
    },
    agreedRent: { type: Number, default: 0 }, // Monthly rent agreed with this tenant
    securityDeposit: { type: Number, default: 0 },
    moveInDate: { type: Date },
    moveOutDate: { type: Date },

    // Lifecycle status
    status: {
      type: String,
      enum: ["active", "dormant", "inactive", "deleted"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tenant", tenantSchema);
