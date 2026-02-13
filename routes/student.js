const express = require("express");
const router = express.Router();
const { authenticateStudent } = require("../middleware/auth");
const { apiRateLimiter } = require("../middleware/rateLimiter");
const {
  getTokenStatus,
  getProfile,
} = require("../controllers/studentController");

router.use(apiRateLimiter);
router.use(authenticateStudent);

router.get("/token-status", getTokenStatus);
router.get("/profile", getProfile);

module.exports = router;
