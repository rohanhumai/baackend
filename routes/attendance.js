// Import express to create router
const express = require("express");

// Create a new router instance
const router = express.Router();

// Import student authentication middleware
const { authenticateStudent } = require("../middleware/auth");

// Import rate limiter specifically for attendance
const { attendanceRateLimiter } = require("../middleware/rateLimiter");

// Import controller functions
const {
  markAttendance,
  getMyAttendance,
} = require("../controllers/attendanceController");

// POST /mark
// Middleware execution order matters here:
// 1. authenticateStudent → verifies JWT + role
// 2. attendanceRateLimiter → prevents abuse
// 3. markAttendance → actual business logic
router.post(
  "/mark",
  authenticateStudent,
  attendanceRateLimiter,
  markAttendance,
);

// GET /my-attendance
// Only requires authentication (no rate limiter applied here)
router.get("/my-attendance", authenticateStudent, getMyAttendance);

// Export router to be used in main app
module.exports = router;
