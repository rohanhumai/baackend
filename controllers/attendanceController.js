const Session = require("../models/Session");
const Attendance = require("../models/Attendance");
const Token = require("../models/Token");
const tokenManager = require("../utils/tokenManager");

exports.markAttendance = async (req, res) => {
  try {
    const { sessionCode } = req.body;
    const studentId = req.student._id.toString();

    // Validate input
    if (!sessionCode) {
      return res.status(400).json({
        success: false,
        message: "Session code is required",
      });
    }

    // STEP 1: Check if student has token available (Redis)
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

    // STEP 2: Find the session (Redis cache first, then DB)
    let sessionData = await tokenManager.getCachedSession(sessionCode);
    let session;

    if (sessionData) {
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

    // STEP 3: Check duplicate attendance
    const existing = await Attendance.findOne({
      session: session._id,
      student: req.student._id,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked for this session",
      });
    }

    // STEP 4: Mark attendance in MongoDB
    const attendance = await Attendance.create({
      session: session._id,
      student: req.student._id,
      teacher: session.teacher,
      subject: session.subject,
      status: "present",
    });

    // STEP 5: Consume token - 1 hour cooldown in Redis
    await tokenManager.consumeToken(studentId, session._id.toString());

    // STEP 6: Save token record in DB
    await Token.create({
      student: req.student._id,
      sessionId: session._id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    // STEP 7: Update attendance count in Redis
    const totalCount = await tokenManager.incrementAttendanceCount(
      session._id.toString(),
    );

    // STEP 8: Return success
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
    res.status(500).json({
      success: false,
      message: "Error fetching attendance history",
    });
  }
};
