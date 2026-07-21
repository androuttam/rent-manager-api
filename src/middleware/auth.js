// Authentication & authorization middleware
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verify JWT and attach the user to req.user
const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-passwordHash");

    if (!user || !user.isActive) {
      return res
        .status(401)
        .json({ success: false, message: "User not found or inactive" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Not authorized, token failed" });
  }
};

// Allow only owner role
const ownerOnly = (req, res, next) => {
  if (req.user && req.user.role === "owner") {
    return next();
  }
  return res
    .status(403)
    .json({ success: false, message: "Owner access only" });
};

module.exports = { protect, ownerOnly };
