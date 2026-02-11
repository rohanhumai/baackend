// Import express to create router
const express = require("express");

// Create router instance
const router = express.Router();

// Import authentication controller functions
const {
  teacherLogin,
  studentRegister,
  getMe,
} = require("../controllers/authController");

// Import rate limiter for authentication routes
const { authRateLimiter } = require("../middleware/rateLimiter");

// POST /teacher/login
// Apply authRateLimiter to prevent brute-force attacks
router.post(
  "/teacher/login",
  authRateLimiter, // Limits login attempts
  teacherLogin, // Handles teacher authentication
);

// POST /student/register
// Also protected by rate limiter (prevents spam registrations)
router.post("/student/register", authRateLimiter, studentRegister);

// GET /me
// Returns current authenticated user info
// (Relies on token sent in Authorization header)
router.get("/me", getMe);

// Export router
module.exports = router;
