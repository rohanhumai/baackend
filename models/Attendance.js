const express = require("express");
const router = express.Router();
const { authenticateStudent } = require("../middleware/auth");
const { verifyDevice } = require("../middleware/deviceAuth");
const {
  attendanceRateLimiter,
  deviceRateLimiter,
} = require("../middleware/rateLimiter");
const attendanceController = require("../controllers/attendanceController");

router.post(
  "/mark",
  authenticateStudent,
  attendanceRateLimiter,
  deviceRateLimiter,
  verifyDevice,
  attendanceController.markAttendance,
);

router.get(
  "/my-attendance",
  authenticateStudent,
  attendanceController.getMyAttendance,
);

module.exports = router;
