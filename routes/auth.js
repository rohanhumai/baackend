const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");

// Check if functions exist
if (!authController.teacherLogin) console.error("❌ teacherLogin missing");
if (!authController.studentRegister)
  console.error("❌ studentRegister missing");
if (!authController.getMe) console.error("❌ getMe missing");

router.post("/teacher/login", authController.teacherLogin);
router.post("/student/register", authController.studentRegister);
router.get("/me", authController.getMe);

module.exports = router;
