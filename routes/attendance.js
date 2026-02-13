const express = require("express");
const router = express.Router();

const { authenticateStudent } = require("../middleware/auth");
const attendanceController = require("../controllers/attendanceController");

if (!attendanceController.markAttendance)
  console.error("❌ markAttendance missing");
if (!attendanceController.getMyAttendance)
  console.error("❌ getMyAttendance missing");

// Check if deviceAuth exists
let verifyDevice;
try {
  const deviceAuth = require("../middleware/deviceAuth");
  verifyDevice = deviceAuth.verifyDevice;
  console.log("✅ deviceAuth loaded");
} catch (e) {
  console.log("⚠️ deviceAuth not found, skipping device verification");
  verifyDevice = (req, res, next) => {
    req.fingerprint = req.headers["x-device-fingerprint"] || "unknown";
    next();
  };
}

router.post(
  "/mark",
  authenticateStudent,
  verifyDevice,
  attendanceController.markAttendance,
);

router.get(
  "/my-attendance",
  authenticateStudent,
  attendanceController.getMyAttendance,
);

module.exports = router;
