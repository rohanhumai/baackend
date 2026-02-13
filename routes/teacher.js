const express = require("express");
const router = express.Router();

const { authenticateTeacher } = require("../middleware/auth");
const teacherController = require("../controllers/teacherController");

// Check exports
const required = [
  "createSession",
  "getActiveSessions",
  "endSession",
  "getSessionAttendance",
  "getAllSessions",
];
required.forEach((fn) => {
  if (!teacherController[fn])
    console.error(`❌ teacherController.${fn} missing`);
});

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
