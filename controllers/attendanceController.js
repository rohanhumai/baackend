// Import required models
const Session = require("../models/Session");
const Attendance = require("../models/Attendance");
const Token = require("../models/Token");

// Utility that handles Redis token + caching logic
const tokenManager = require("../utils/tokenManager");

// Controller to mark attendance
exports.markAttendance = async (req, res) => {
  try {
    // Extract sessionCode from request body
    const { sessionCode } = req.body;

    // Get student ID from authenticated request (converted to string for Redis usage)
    const studentId = req.student._id.toString();

    // Validate session code presence
    if (!sessionCode) {
      return res.status(400).json({
        success: false,
        message: "Session code is required",
      });
    }

    // Step 1: Check token availability from Redis (anti-proxy: 1 scan per hour)
    // Prevents students from scanning multiple times within cooldown period
    const hasToken = await tokenManager.hasAvailableToken(studentId);

    if (!hasToken) {
      // Get remaining cooldown time in seconds
      const cooldown = await tokenManager.getCooldownRemaining(studentId);

      return res.status(429).json({
        success: false,
        message: `You can only scan once per hour. Please wait ${Math.ceil(cooldown / 60)} minutes.`,
        cooldownRemaining: cooldown, // remaining time in seconds
        cooldownRemainingMinutes: Math.ceil(cooldown / 60), // remaining time in minutes
      });
    }

    // Step 2: Try fetching session from Redis cache first (performance optimization)
    let sessionData = await tokenManager.getCachedSession(sessionCode);
    let session;

    if (sessionData) {
      // Verify session is still active and not expired
      if (
        !sessionData.isActive ||
        new Date(sessionData.expiresAt) < new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "This session has expired or been ended",
        });
      }

      // Fetch full session from DB using cached ID
      session = await Session.findById(sessionData._id);
    } else {
      // Fallback to database if not found in Redis cache
      session = await Session.findOne({
        sessionCode,
        isActive: true,
        expiresAt: { $gt: new Date() }, // Only sessions that haven't expired
      });
    }

    // If session doesn't exist or invalid
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired QR code. Session not found.",
      });
    }

    // Step 3: Prevent duplicate attendance marking
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

    // Step 4: Create attendance record in MongoDB
    const attendance = await Attendance.create({
      session: session._id,
      student: req.student._id,
      teacher: session.teacher,
      subject: session.subject,
      status: "present",
    });

    // Step 5: Consume the token in Redis (start 1-hour cooldown)
    await tokenManager.consumeToken(studentId, session._id.toString());

    // Step 6: Save token usage in DB for audit/history purposes
    await Token.create({
      student: req.student._id,
      sessionId: session._id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // expires in 1 hour
    });

    // Step 7: Increment attendance count in Redis for real-time stats
    const totalCount = await tokenManager.incrementAttendanceCount(
      session._id.toString(),
    );

    // Send success response
    res.status(201).json({
      success: true,
      message: "Attendance marked successfully!",
      attendance: {
        id: attendance._id,
        subject: session.subject,
        markedAt: attendance.markedAt,
        status: attendance.status,
        totalAttendanceInSession: totalCount, // updated session attendance count
      },
    });
  } catch (error) {
    // Log unexpected error
    console.error("Mark attendance error:", error);

    // Handle MongoDB duplicate key error (race condition safety)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked for this session",
      });
    }

    // Generic server error fallback
    res.status(500).json({
      success: false,
      message: "Error marking attendance",
    });
  }
};

// Controller to fetch current student's attendance history
exports.getMyAttendance = async (req, res) => {
  try {
    // Fetch all attendance records for logged-in student
    const attendance = await Attendance.find({
      student: req.student._id,
    })
      // Populate session reference with selected fields
      .populate("session", "subject sessionCode department")
      // Populate teacher reference with name only
      .populate("teacher", "name")
      // Sort latest first
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
