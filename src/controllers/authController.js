// Auth logic: register, login, current user
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// Build a safe user object (no password) for responses
const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  mobile: user.mobile,
  role: user.role,
  languagePref: user.languagePref,
  tenantId: user.tenantId,
});

// @route POST /api/auth/register
// Creates an owner account (used for initial setup)
const register = async (req, res) => {
  try {
    const { name, mobile, password, languagePref } = req.body;

    if (!mobile || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile and password are required" });
    }

    const existing = await User.findOne({ mobile });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Mobile already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      mobile,
      passwordHash,
      role: "owner", // registration always creates an owner
      languagePref: languagePref || "en",
    });

    return res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile and password are required" });
    }

    const user = await User.findOne({ mobile });
    if (!user || !user.isActive) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    return res.json({
      success: true,
      token: generateToken(user._id),
      user: publicUser(user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @route GET /api/auth/me  (protected)
const getMe = async (req, res) => {
  return res.json({ success: true, user: publicUser(req.user) });
};

module.exports = { register, login, getMe };
