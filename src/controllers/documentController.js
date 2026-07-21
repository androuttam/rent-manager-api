// File upload + tenant document records
const Document = require("../models/Document");
const cloudinary = require("../config/cloudinary");

// Stream an in-memory file buffer to Cloudinary and resolve with the result
const streamUpload = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "rent-manager", resource_type: "auto" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(buffer);
  });

// @route POST /api/uploads  (owner)  multipart/form-data, field name: "file"
// Uploads one file to Cloudinary and returns its URL + publicId.
// The Flutter app then attaches this URL to a tenant / document record.
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    const result = await streamUpload(req.file.buffer);
    return res.status(201).json({
      success: true,
      url: result.secure_url,   // Cloudinary secure URL
      publicId: result.public_id, // Cloudinary public_id (for deletion)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route POST /api/documents  (owner)
// Save a document record for a tenant (after uploading via /api/uploads)
const createDocument = async (req, res) => {
  try {
    const { tenantId, docType, title, fileUrl, publicId } = req.body;
    if (!tenantId || !fileUrl) {
      return res
        .status(400)
        .json({ success: false, message: "tenantId and fileUrl are required" });
    }
    const doc = await Document.create({ tenantId, docType, title, fileUrl, publicId });
    return res.status(201).json({ success: true, document: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/documents?tenantId=  (owner)
const getDocuments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.tenantId) filter.tenantId = req.query.tenantId;
    const documents = await Document.find(filter).sort({ uploadedAt: -1 });
    return res.json({ success: true, count: documents.length, documents });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route DELETE /api/documents/:id  (owner)
// Removes the file from Cloudinary and the record from DB
const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }
    if (doc.publicId) {
      // Try to remove from Cloudinary (ignore failures so DB stays clean)
      try {
        await cloudinary.uploader.destroy(doc.publicId, { resource_type: "auto" });
      } catch (e) {
        console.warn("Cloudinary delete failed:", e.message);
      }
    }
    await doc.deleteOne();
    return res.json({ success: true, message: "Document deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { uploadFile, createDocument, getDocuments, deleteDocument };
