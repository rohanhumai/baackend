const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authRateLimiter } = require("../middleware/rateLimiter");

router.post("/teacher/login", authRateLimiter, authController.teacherLogin);
router.post(
  "/student/register",
  authRateLimiter,
  authController.studentRegister,
);
router.get("/me", authController.getMe);

module.exports = router;
