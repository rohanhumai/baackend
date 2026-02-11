// Import express to create router
const express = require("express");

// Create router instance
const router = express.Router();

// Import teacher authentication middleware
const { authenticateTeacher } = require("../middleware/auth");

// Import general API rate limiter
const { apiRateLimiter } = require("../middleware/rateLimiter");

// Import login controller separately (public route)
const { loginTeacher } = require("../controllers/teacherController");

// ===================== PUBLIC ROUTE =====================

// POST /login
// Teacher login route (no authentication required)
router.post("/login", loginTeacher);

// Import remaining protected controller functions
const {
  createSession,
  getActiveSessions,
  endSession,
  getSessionAttendance,
  getAllSessions,
  regenerateQR,
} = require("../controllers/teacherController");

// ===================== PROTECTED ROUTES =====================

// Apply API rate limiter to all routes below
router.use(apiRateLimiter);

// Apply teacher authentication to all routes below
router.use(authenticateTeacher);

// POST /session
// Create a new attendance session
router.post("/session", createSession);

// GET /sessions/active
// Get currently active sessions
router.get("/sessions/active", getActiveSessions);

// GET /sessions/all
// Get all sessions (limited history)
router.get("/sessions/all", getAllSessions);

// PUT /session/:sessionId/end
// End a specific session
router.put("/session/:sessionId/end", endSession);

// GET /session/:sessionId/attendance
// Get attendance records for a session
router.get("/session/:sessionId/attendance", getSessionAttendance);

// GET /session/:sessionId/regenerate-qr
// Regenerate QR code for an active session
router.get("/session/:sessionId/regenerate-qr", regenerateQR);

// Export router
module.exports = router;
