const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");

if (!adminController.login) console.error("❌ admin.login missing");

// Check if adminAuth exists
let authenticateAdmin;
try {
  const adminAuth = require("../middleware/adminAuth");
  authenticateAdmin = adminAuth.authenticateAdmin;
  console.log("✅ adminAuth loaded");
} catch (e) {
  console.error("❌ adminAuth not found:", e.message);
  authenticateAdmin = (req, res, next) => {
    res
      .status(500)
      .json({ success: false, message: "Admin auth not configured" });
  };
}

// Public
router.post("/login", adminController.login);

// Protected
router.use(authenticateAdmin);

router.get("/dashboard", adminController.getDashboardStats);

// Students
router.get("/students", adminController.getAllStudents);
router.get("/students/:id", adminController.getStudentDetails);
router.post("/students/:id/reset-device", adminController.resetStudentDevice);
router.post("/students/:id/reset-token", adminController.resetStudentToken);
router.put("/students/:id/toggle-status", adminController.toggleStudentStatus);
router.delete("/students/:id", adminController.deleteStudent);

// Teachers
router.get("/teachers", adminController.getAllTeachers);
router.post("/teachers", adminController.createTeacher);
router.delete("/teachers/:id", adminController.deleteTeacher);

// Sessions
router.get("/sessions", adminController.getAllSessions);
router.put("/sessions/:id/force-end", adminController.forceEndSession);

// Attendance
router.get("/attendance", adminController.getAllAttendance);
router.delete("/attendance/:id", adminController.deleteAttendance);

// Redis
router.get("/redis", adminController.getRedisStats);
router.post("/redis/flush", adminController.flushRedis);

module.exports = router;
