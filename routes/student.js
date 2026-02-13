const express = require("express");
const router = express.Router();

const { authenticateStudent } = require("../middleware/auth");
const studentController = require("../controllers/studentController");

if (!studentController.getTokenStatus)
  console.error("❌ getTokenStatus missing");
if (!studentController.getProfile) console.error("❌ getProfile missing");

router.use(authenticateStudent);

router.get("/token-status", studentController.getTokenStatus);
router.get("/profile", studentController.getProfile);

module.exports = router;
