const Session = require("../models/Session");
const Attendance = require("../models/Attendance");
const Token = require("../models/Token");
const tokenManager = require("../utils/tokenManager");

exports.markAttendance = async (req, res) => {
  try {
    const { sessionCode } = req.body;
    const studentId = req.student._id.toString();

    if (!sessionCode) {
      return res.status(400).json({
        success: false,
        message: "Session code is required",
      });
    }

    // Step 1: Check token availability from Redis (anti-proxy: 1 scan per hour)
    const hasToken = await tokenManager.hasAvailableToken(studentId);
    if (!hasToken) {
      const cooldown = await tokenManager.getCooldownRemaining(studentId);
      return res.status(429).json({
        success: false,
        message: `You can only scan once per hour. Please wait ${Math.ceil(cooldown / 60)} minutes.`,
        cooldownRemaining: cooldown,
        cooldownRemainingMinutes: Math.ceil(cooldown / 60),
      });
    }

    // Step 2: Try to get session from Redis cache first
    let sessionData = await tokenManager.getCachedSession(sessionCode);
    let session;

    if (sessionData) {
      // Verify session is still active
      if (
        !sessionData.isActive ||
        new Date(sessionData.expiresAt) < new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "This session has expired or been ended",
        });
      }
      session = await Session.findById(sessionData._id);
    } else {
      // Fallback to database
      session = await Session.findOne({
        sessionCode,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired QR code. Session not found.",
      });
    }

    // Step 3: Check if already marked attendance for this session
    const existingAttendance = await Attendance.findOne({
      session: session._id,
      student: req.student._id,
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked for this session",
      });
    }

    // Step 4: Mark attendance
    const attendance = await Attendance.create({
      session: session._id,
      student: req.student._id,
      teacher: session.teacher,
      subject: session.subject,
      status: "present",
    });

    // Step 5: Consume the token (set 1-hour cooldown in Redis)
    await tokenManager.consumeToken(studentId, session._id.toString());

    // Step 6: Save token usage to DB for records
    await Token.create({
      student: req.student._id,
      sessionId: session._id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    // Step 7: Increment attendance count in Redis
    const totalCount = await tokenManager.incrementAttendanceCount(
      session._id.toString(),
    );

    res.status(201).json({
      success: true,
      message: "Attendance marked successfully!",
      attendance: {
        id: attendance._id,
        subject: session.subject,
        markedAt: attendance.markedAt,
        status: attendance.status,
        totalAttendanceInSession: totalCount,
      },
    });
  } catch (error) {
    console.error("Mark attendance error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked for this session",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error marking attendance",
    });
  }
};

exports.getMyAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({
      student: req.student._id,
    })
      .populate("session", "subject sessionCode department")
      .populate("teacher", "name")
      .sort({ markedAt: -1 });

    res.json({
      success: true,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    console.error("Get my attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching attendance history",
    });
  }
};
