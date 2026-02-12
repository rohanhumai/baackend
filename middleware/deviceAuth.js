const tokenManager = require("../utils/tokenManager");
const Student = require("../models/Student");

const verifyDevice = async (req, res, next) => {
  try {
    const fingerprint = req.headers["x-device-fingerprint"];

    if (!fingerprint) {
      return res.status(400).json({
        success: false,
        message: "Device fingerprint is required. Please enable JavaScript.",
      });
    }

    // Validate fingerprint format (should be a hash string)
    if (fingerprint.length < 10 || fingerprint.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid device fingerprint.",
      });
    }

    const studentId = req.student._id.toString();

    // Check Redis first (fast)
    const deviceCheck = await tokenManager.verifyDevice(studentId, fingerprint);

    if (deviceCheck.firstTime) {
      // First time — lock this device to this student
      await tokenManager.lockDevice(studentId, fingerprint);

      // Also save to MongoDB for persistence
      await Student.findByIdAndUpdate(studentId, {
        deviceFingerprint: fingerprint,
        deviceRegisteredAt: new Date(),
        deviceInfo: {
          browser: req.headers["user-agent"]?.substring(0, 100) || "unknown",
          os: req.headers["sec-ch-ua-platform"] || "unknown",
          platform:
            req.headers["sec-ch-ua-mobile"] === "?1" ? "mobile" : "desktop",
        },
      });

      req.fingerprint = fingerprint;
      return next();
    }

    if (deviceCheck.valid) {
      // Same device — allow
      req.fingerprint = fingerprint;
      return next();
    }

    // Different device — check MongoDB as fallback
    const student = await Student.findById(studentId);

    if (
      student.deviceFingerprint &&
      student.deviceFingerprint !== fingerprint
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You can only use one device. This account is already linked to another device.",
        registeredDevice: true,
      });
    }

    // MongoDB says it's fine (maybe Redis lost data)
    await tokenManager.lockDevice(studentId, fingerprint);
    req.fingerprint = fingerprint;
    next();
  } catch (error) {
    console.error("Device verification error:", error);
    res.status(500).json({
      success: false,
      message: "Device verification failed.",
    });
  }
};

module.exports = { verifyDevice };
