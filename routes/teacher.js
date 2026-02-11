const express = require("express");
const router = express.Router();
const { authenticateTeacher } = require("../middleware/auth");
const { apiRateLimiter } = require("../middleware/rateLimiter");
const { loginTeacher } = require("../controllers/teacherController");

router.post("/login", loginTeacher);

const {
  createSession,
  getActiveSessions,
  endSession,
  getSessionAttendance,
  getAllSessions,
  regenerateQR,
} = require("../controllers/teacherController");

router.use(apiRateLimiter);
router.use(authenticateTeacher);

router.post("/session", createSession);
router.get("/sessions/active", getActiveSessions);
router.get("/sessions/all", getAllSessions);
router.put("/session/:sessionId/end", endSession);
router.get("/session/:sessionId/attendance", getSessionAttendance);
router.get("/session/:sessionId/regenerate-qr", regenerateQR);

module.exports = router;
