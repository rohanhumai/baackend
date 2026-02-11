// Import tokenManager utility (handles Redis token logic)
const tokenManager = require("../utils/tokenManager");

// ===================== GET TOKEN STATUS =====================
exports.getTokenStatus = async (req, res) => {
  try {
    // Extract student ID from authenticated request and convert to string (used for Redis keys)
    const studentId = req.student._id.toString();

    // Check if student currently has an available token (not in cooldown)
    const hasToken = await tokenManager.hasAvailableToken(studentId);

    // Get remaining cooldown time in seconds (if any)
    const cooldownRemaining =
      await tokenManager.getCooldownRemaining(studentId);

    // Send response with token availability and cooldown info
    res.json({
      success: true,
      hasToken, // Boolean: whether student can scan again
      cooldownRemaining, // Remaining time in seconds
      cooldownRemainingMinutes: Math.ceil(cooldownRemaining / 60), // Converted to minutes (rounded up)
    });
  } catch (error) {
    // Log unexpected error
    console.error("Token status error:", error);

    // Send generic server error response
    res.status(500).json({
      success: false,
      message: "Error checking token status",
    });
  }
};

// ===================== GET STUDENT PROFILE =====================
exports.getProfile = async (req, res) => {
  try {
    // Return student data from request (assumes authentication middleware attached it)
    res.json({
      success: true,
      student: {
        id: req.student._id,
        name: req.student.name,
        rollNumber: req.student.rollNumber,
        email: req.student.email,
        department: req.student.department,
        year: req.student.year,
        section: req.student.section,
      },
    });
  } catch (error) {
    // Handle unexpected error
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
    });
  }
};
