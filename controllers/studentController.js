const tokenManager = require("../utils/tokenManager");

exports.getTokenStatus = async (req, res) => {
  try {
    const studentId = req.student._id.toString();

    const hasToken = await tokenManager.hasAvailableToken(studentId);
    const cooldownRemaining =
      await tokenManager.getCooldownRemaining(studentId);

    res.json({
      success: true,
      hasToken,
      cooldownRemaining,
      cooldownRemainingMinutes: Math.ceil(cooldownRemaining / 60),
    });
  } catch (error) {
    console.error("Token status error:", error);
    res.status(500).json({
      success: false,
      message: "Error checking token status",
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
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
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
    });
  }
};
