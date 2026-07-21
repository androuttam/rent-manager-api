// Flat CRUD (all scoped to the logged-in owner)
const Flat = require("../models/Flat");

// @route POST /api/flats  (owner)
const createFlat = async (req, res) => {
  try {
    const { flatNumber, floor, rentAmount, notes } = req.body;
    if (!flatNumber) {
      return res
        .status(400)
        .json({ success: false, message: "flatNumber is required" });
    }
    const flat = await Flat.create({
      ownerId: req.user._id, // stamp owner
      flatNumber,
      floor,
      rentAmount,
      notes,
    });
    return res.status(201).json({ success: true, flat });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/flats  (owner)
const getFlats = async (req, res) => {
  try {
    const flats = await Flat.find({ ownerId: req.user._id })
      .populate("currentTenantId", "name mobile status")
      .sort({ flatNumber: 1 });
    return res.json({ success: true, count: flats.length, flats });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/flats/:id  (owner)
const getFlat = async (req, res) => {
  try {
    const flat = await Flat.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    }).populate("currentTenantId", "name mobile status");
    if (!flat) {
      return res.status(404).json({ success: false, message: "Flat not found" });
    }
    return res.json({ success: true, flat });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/flats/:id  (owner)
const updateFlat = async (req, res) => {
  try {
    const { flatNumber, floor, rentAmount, status, notes } = req.body;
    const flat = await Flat.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { flatNumber, floor, rentAmount, status, notes },
      { new: true, runValidators: true }
    );
    if (!flat) {
      return res.status(404).json({ success: false, message: "Flat not found" });
    }
    return res.json({ success: true, flat });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route DELETE /api/flats/:id  (owner)
const deleteFlat = async (req, res) => {
  try {
    const flat = await Flat.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!flat) {
      return res.status(404).json({ success: false, message: "Flat not found" });
    }
    if (flat.currentTenantId) {
      return res.status(400).json({
        success: false,
        message: "Flat has a tenant assigned. Move the tenant out first.",
      });
    }
    await flat.deleteOne();
    return res.json({ success: true, message: "Flat deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createFlat, getFlats, getFlat, updateFlat, deleteFlat };
