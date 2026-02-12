const express = require("express");
const router = express.Router();
const { authenticateTeacher } = require("../middleware/auth");
const { apiRateLimiter } = require("../middleware/rateLimiter");
const teacherController = require("../controllers/teacherController");

router.use(apiRateLimiter);
router.use(authenticateTeacher);

router.post("/session", teacherController.createSession);
router.get("/sessions/active", teacherController.getActiveSessions);
router.get("/sessions/all", teacherController.getAllSessions);
router.put("/session/:sessionId/end", teacherController.endSession);
router.get(
  "/session/:sessionId/attendance",
  teacherController.getSessionAttendance,
);

module.exports = router;
