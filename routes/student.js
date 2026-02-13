const express = require("express");
const router = express.Router();
const { authenticateStudent } = require("../middleware/auth");
const { apiRateLimiter } = require("../middleware/rateLimiter");
const studentController = require("../controllers/studentController");

router.use(apiRateLimiter);
router.use(authenticateStudent);

router.get("/token-status", studentController.getTokenStatus);
router.get("/profile", studentController.getProfile);

module.exports = router;
