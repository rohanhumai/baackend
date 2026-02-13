const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../middleware/adminAuth");
const {
  authRateLimiter,
  apiRateLimiter,
} = require("../middleware/rateLimiter");
const admin = require("../controllers/adminController");

// Auth
router.post("/login", authRateLimiter, admin.login);

// Protected routes
router.use(authenticateAdmin);
router.use(apiRateLimiter);

// Dashboard
router.get("/dashboard", admin.getDashboardStats);

// Students
router.get("/students", admin.getAllStudents);
router.get("/students/:id", admin.getStudentDetails);
router.post("/students/:id/reset-device", admin.resetStudentDevice);
router.post("/students/:id/reset-token", admin.resetStudentToken);
router.put("/students/:id/toggle-status", admin.toggleStudentStatus);
router.delete("/students/:id", admin.deleteStudent);

// Teachers
router.get("/teachers", admin.getAllTeachers);
router.post("/teachers", admin.createTeacher);
router.delete("/teachers/:id", admin.deleteTeacher);

// Sessions
router.get("/sessions", admin.getAllSessions);
router.put("/sessions/:id/force-end", admin.forceEndSession);

// Attendance
router.get("/attendance", admin.getAllAttendance);
router.delete("/attendance/:id", admin.deleteAttendance);

// Redis
router.get("/redis", admin.getRedisStats);
router.post("/redis/flush", admin.flushRedis);

module.exports = router;
