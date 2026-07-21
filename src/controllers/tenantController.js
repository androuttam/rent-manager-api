// Tenant CRUD + auto-create tenant login account + status lifecycle
// Everything is scoped to the logged-in owner (req.user._id)
const bcrypt = require("bcryptjs");
const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Flat = require("../models/Flat");

// @route POST /api/tenants  (owner)
// Creates a tenant record AND an auto-linked tenant login account
const createTenant = async (req, res) => {
  try {
    const {
      name,
      mobile,
      loginPassword, // owner-set password for the tenant's login
      email,
      permanentAddress,
      photoUrl,
      photoPublicId,
      vehicleType,
      vehicleNumber,
      idProofs,
      references,
      agreementUrl,
      agreementPublicId,
      flatId,
      agreedRent,
      securityDeposit,
      moveInDate,
    } = req.body;

    if (!name || !mobile || !loginPassword) {
      return res.status(400).json({
        success: false,
        message: "name, mobile and loginPassword are required",
      });
    }

    // Mobile must be free in the users collection (used for tenant login)
    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This mobile is already registered as a login",
      });
    }

    // If a flat was passed, it must belong to THIS owner
    if (flatId) {
      const ownFlat = await Flat.findOne({
        _id: flatId,
        ownerId: req.user._id,
      });
      if (!ownFlat) {
        return res
          .status(404)
          .json({ success: false, message: "Flat not found" });
      }
    }

    // Create the tenant record (stamped with owner)
    const tenant = await Tenant.create({
      ownerId: req.user._id,
      name,
      mobile,
      email,
      permanentAddress,
      photoUrl,
      photoPublicId,
      vehicleType,
      vehicleNumber,
      idProofs: idProofs || [],
      references: references || [],
      agreementUrl,
      agreementPublicId,
      flatId: flatId || null,
      agreedRent: agreedRent || 0,
      securityDeposit: securityDeposit || 0,
      moveInDate,
      status: "active",
    });

    // Create the linked tenant login account (also linked to the owner)
    const passwordHash = await bcrypt.hash(loginPassword, 10);
    await User.create({
      name,
      mobile,
      passwordHash,
      role: "tenant",
      ownerId: req.user._id, // tenant login belongs to this owner
      tenantId: tenant._id,
    });

    // If a flat was assigned, mark it occupied (owner-scoped update)
    if (flatId) {
      await Flat.findOneAndUpdate(
        { _id: flatId, ownerId: req.user._id },
        { status: "occupied", currentTenantId: tenant._id }
      );
    }

    return res.status(201).json({ success: true, tenant });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/tenants  (owner)
// Optional query: ?status=active  (basic list; enriched totals come from dashboard APIs)
const getTenants = async (req, res) => {
  try {
    const filter = { ownerId: req.user._id };
    if (req.query.status) {
      filter.status = req.query.status;
    } else {
      filter.status = { $ne: "deleted" }; // hide deleted by default
    }
    const tenants = await Tenant.find(filter)
      .populate("flatId", "flatNumber floor")
      .sort({ createdAt: -1 });
    return res.json({ success: true, count: tenants.length, tenants });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/tenants/:id  (owner)
const getTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    }).populate("flatId", "flatNumber floor rentAmount");
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }
    return res.json({ success: true, tenant });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route PUT /api/tenants/:id  (owner)
// Updates tenant profile fields (not login credentials)
const updateTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }

    const oldFlatId = tenant.flatId ? tenant.flatId.toString() : null;

    // If flat is being changed, the new flat must belong to this owner
    if (
      req.body.flatId !== undefined &&
      req.body.flatId &&
      req.body.flatId.toString() !== oldFlatId
    ) {
      const ownFlat = await Flat.findOne({
        _id: req.body.flatId,
        ownerId: req.user._id,
      });
      if (!ownFlat) {
        return res
          .status(404)
          .json({ success: false, message: "Flat not found" });
      }
    }

    // Whitelist of updatable fields
    const fields = [
      "name", "mobile", "email", "permanentAddress", "photoUrl", "photoPublicId",
      "vehicleType", "vehicleNumber", "idProofs", "references",
      "agreementUrl", "agreementPublicId", "flatId", "agreedRent",
      "securityDeposit", "moveInDate", "moveOutDate",
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) tenant[f] = req.body[f];
    });

    await tenant.save();

    // Keep flat assignment in sync if flat changed (owner-scoped)
    const newFlatId = tenant.flatId ? tenant.flatId.toString() : null;
    if (oldFlatId !== newFlatId) {
      if (oldFlatId) {
        await Flat.findOneAndUpdate(
          { _id: oldFlatId, ownerId: req.user._id },
          { status: "vacant", currentTenantId: null }
        );
      }
      if (newFlatId) {
        await Flat.findOneAndUpdate(
          { _id: newFlatId, ownerId: req.user._id },
          { status: "occupied", currentTenantId: tenant._id }
        );
      }
    }

    // Sync name/mobile on the login account too (scoped to this owner)
    await User.findOneAndUpdate(
      { tenantId: tenant._id, ownerId: req.user._id },
      { name: tenant.name, mobile: tenant.mobile }
    );

    return res.json({ success: true, tenant });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route PATCH /api/tenants/:id/status  (owner)
// body: { status: "active" | "dormant" | "inactive" | "deleted" }
const changeTenantStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["active", "dormant", "inactive", "deleted"];
    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const tenant = await Tenant.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }

    tenant.status = status;
    // When tenant is no longer active, free the flat and set move-out date
    if (status !== "active") {
      if (tenant.flatId) {
        await Flat.findOneAndUpdate(
          { _id: tenant.flatId, ownerId: req.user._id },
          { status: "vacant", currentTenantId: null }
        );
      }
      if (!tenant.moveOutDate) tenant.moveOutDate = new Date();
    }
    await tenant.save();

    // Login stays enabled only for active tenants (scoped to this owner)
    await User.findOneAndUpdate(
      { tenantId: tenant._id, ownerId: req.user._id },
      { isActive: status === "active" }
    );

    return res.json({ success: true, tenant });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route DELETE /api/tenants/:id  (owner)
// Soft-delete: keeps history, disables login, frees flat
const deleteTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!tenant) {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }
    tenant.status = "deleted";
    if (tenant.flatId) {
      await Flat.findOneAndUpdate(
        { _id: tenant.flatId, ownerId: req.user._id },
        { status: "vacant", currentTenantId: null }
      );
    }
    await tenant.save();
    await User.findOneAndUpdate(
      { tenantId: tenant._id, ownerId: req.user._id },
      { isActive: false }
    );
    return res.json({ success: true, message: "Tenant deleted (archived)" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTenant,
  getTenants,
  getTenant,
  updateTenant,
  changeTenantStatus,
  deleteTenant,
};
