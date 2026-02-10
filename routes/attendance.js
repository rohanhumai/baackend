const express = require("express");
const router = express.Router();
const { authenticateStudent } = require("../middleware/auth");
const { attendanceRateLimiter } = require("../middleware/rateLimiter");
const {
  markAttendance,
  getMyAttendance,
} = require("../controllers/attendanceController");

router.post(
  "/mark",
  authenticateStudent,
  attendanceRateLimiter,
  markAttendance,
);
router.get("/my-attendance", authenticateStudent, getMyAttendance);

module.exports = router;
