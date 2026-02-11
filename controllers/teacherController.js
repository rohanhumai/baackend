// Import QR code generator library
const QRCode = require("qrcode");

// Import UUID generator (v4 for random unique session codes)
const { v4: uuidv4 } = require("uuid");

// Import database models
const Session = require("../models/Session");
const Attendance = require("../models/Attendance");

// Import Redis utility manager
const tokenManager = require("../utils/tokenManager");

// ===================== TEACHER LOGIN =====================
exports.loginTeacher = async (req, res) => {
  try {
    // Extract credentials from request body
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find teacher by normalized (lowercase) email
    const teacher = await Teacher.findOne({
      email: email.toLowerCase(),
    });

    // If teacher not found
    if (!teacher) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Compare entered password with stored hashed password
    const isMatch = await teacher.comparePassword(password);

    // If password mismatch
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Successful login response (no JWT here in this version)
    res.status(200).json({
      success: true,
      message: "Login successful",
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ===================== CREATE SESSION =====================
exports.createSession = async (req, res) => {
  try {
    // Extract session details
    const { subject, department, year, section, expiryMinutes } = req.body;

    // Validate subject presence
    if (!subject) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    // Generate unique session code
    const sessionCode = uuidv4();

    // Convert expiry time (default 5 minutes) into milliseconds
    const expiryMs = (expiryMinutes || 5) * 60 * 1000;

    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + expiryMs);

    // Prepare QR payload (encoded inside QR)
    const qrPayload = JSON.stringify({
      sessionCode,
      subject,
      teacher: req.teacher.name,
      department: department || req.teacher.department,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    // Generate QR code as base64 image
    const qrImage = await QRCode.toDataURL(qrPayload, {
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    // Save session in database
    const session = await Session.create({
      teacher: req.teacher._id,
      subject,
      sessionCode,
      qrData: qrPayload,
      expiresAt,
      department: department || req.teacher.department,
      year,
      section,
    });

    // Cache session in Redis for faster lookup
    await tokenManager.cacheSession(
      sessionCode,
      {
        _id: session._id.toString(),
        teacher: req.teacher._id.toString(),
        subject,
        sessionCode,
        department: department || req.teacher.department,
        year,
        section,
        isActive: true,
        expiresAt: expiresAt.toISOString(),
      },
      Math.ceil(expiryMs / 1000), // TTL in seconds
    );

    // Send response
    res.status(201).json({
      success: true,
      message: "Session created successfully",
      session: {
        id: session._id,
        sessionCode,
        subject,
        qrImage,
        qrData: qrPayload,
        expiresAt,
        department: session.department,
        year,
        section,
      },
    });
  } catch (error) {
    console.error("Create session error:", error);

    res.status(500).json({
      success: false,
      message: "Error creating session",
    });
  }
};

// ===================== GET ACTIVE SESSIONS =====================
exports.getActiveSessions = async (req, res) => {
  try {
    // Fetch active, non-expired sessions for teacher
    const sessions = await Session.find({
      teacher: req.teacher._id,
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    // Attach real-time attendance counts from Redis
    const sessionsWithCount = await Promise.all(
      sessions.map(async (session) => {
        const count = await tokenManager.getAttendanceCount(
          session._id.toString(),
        );

        return {
          ...session.toObject(),
          attendanceCount: count,
        };
      }),
    );

    res.json({
      success: true,
      sessions: sessionsWithCount,
    });
  } catch (error) {
    console.error("Get sessions error:", error);

    res.status(500).json({
      success: false,
      message: "Error fetching sessions",
    });
  }
};

// ===================== END SESSION =====================
exports.endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Ensure session belongs to logged-in teacher
    const session = await Session.findOne({
      _id: sessionId,
      teacher: req.teacher._id,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Mark session inactive
    session.isActive = false;
    await session.save();

    // Remove session from Redis cache
    await tokenManager.invalidateSession(session.sessionCode);

    res.json({
      success: true,
      message: "Session ended successfully",
    });
  } catch (error) {
    console.error("End session error:", error);

    res.status(500).json({
      success: false,
      message: "Error ending session",
    });
  }
};

// ===================== GET SESSION ATTENDANCE =====================
exports.getSessionAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Fetch attendance records for session
    const attendance = await Attendance.find({
      session: sessionId,
      teacher: req.teacher._id,
    })
      // Populate student reference fields
      .populate("student", "name rollNumber email department year section")
      .sort({ markedAt: 1 });

    res.json({
      success: true,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    console.error("Get attendance error:", error);

    res.status(500).json({
      success: false,
      message: "Error fetching attendance",
    });
  }
};

// ===================== GET ALL SESSIONS =====================
exports.getAllSessions = async (req, res) => {
  try {
    // Fetch last 50 sessions
    const sessions = await Session.find({
      teacher: req.teacher._id,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    // Count attendance from DB (not Redis) for historical accuracy
    const sessionsWithCount = await Promise.all(
      sessions.map(async (session) => {
        const dbCount = await Attendance.countDocuments({
          session: session._id,
        });

        return {
          ...session.toObject(),
          attendanceCount: dbCount,
        };
      }),
    );

    res.json({
      success: true,
      sessions: sessionsWithCount,
    });
  } catch (error) {
    console.error("Get all sessions error:", error);

    res.status(500).json({
      success: false,
      message: "Error fetching sessions",
    });
  }
};

// ===================== REGENERATE QR =====================
exports.regenerateQR = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Find active, non-expired session
    const session = await Session.findOne({
      _id: sessionId,
      teacher: req.teacher._id,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Active session not found",
      });
    }

    // Generate QR image again using stored QR payload
    const qrImage = await QRCode.toDataURL(session.qrData, {
      width: 400,
      margin: 2,
    });

    res.json({
      success: true,
      qrImage,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("Regenerate QR error:", error);

    res.status(500).json({
      success: false,
      message: "Error regenerating QR code",
    });
  }
};
