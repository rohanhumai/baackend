const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token. Access denied.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin" && decoded.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins only.",
      });
    }

    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: "Admin not found or deactivated.",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

module.exports = { authenticateAdmin };
