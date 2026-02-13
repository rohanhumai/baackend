const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const Session = require("../models/Session");
const Attendance = require("../models/Attendance");
const tokenManager = require("../utils/tokenManager");

exports.createSession = async (req, res) => {
  try {
    const { subject, department, year, section, expiryMinutes } = req.body;

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    const sessionCode = uuidv4();
    const expiryMs = (expiryMinutes || 5) * 60 * 1000;
    const expiresAt = new Date(Date.now() + expiryMs);

    // QR data contains session code
    const qrPayload = JSON.stringify({
      sessionCode,
      subject,
      teacher: req.teacher.name,
      department: department || req.teacher.department,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    // Generate QR code as base64
    const qrImage = await QRCode.toDataURL(qrPayload, {
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

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

    // Cache session in Redis
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
      Math.ceil(expiryMs / 1000),
    );

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

exports.getActiveSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      teacher: req.teacher._id,
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    // Get attendance counts from Redis
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

exports.endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

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

    session.isActive = false;
    await session.save();

    // Invalidate Redis cache
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

exports.getSessionAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const attendance = await Attendance.find({
      session: sessionId,
      teacher: req.teacher._id,
    })
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

exports.getAllSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      teacher: req.teacher._id,
    })
      .sort({ createdAt: -1 })
      .limit(50);

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

exports.regenerateQR = async (req, res) => {
  try {
    const { sessionId } = req.params;

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

    // Generate new QR with same session code
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
