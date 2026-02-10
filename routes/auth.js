const express = require("express");
const router = express.Router();
const {
  teacherLogin,
  studentRegister,
  getMe,
} = require("../controllers/authController");
const { authRateLimiter } = require("../middleware/rateLimiter");

router.post("/teacher/login", authRateLimiter, teacherLogin);
router.post("/student/register", authRateLimiter, studentRegister);
router.get("/me", getMe);

module.exports = router;
