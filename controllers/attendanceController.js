const mongoose = require("mongoose");
const Session = require("../models/Session");
const Attendance = require("../models/Attendance");
const Token = require("../models/Token");
const tokenManager = require("../utils/tokenManager");

exports.markAttendance = async (req, res) => {
  const studentId = req.student._id.toString();
  let scanLockAcquired = false;

  try {
    const { sessionCode } = req.body;
    const fingerprint = req.fingerprint; // Set by verifyDevice middleware

    if (!sessionCode) {
      return res.status(400).json({
        success: false,
        message: "Session code is required",
      });
    }

    // STEP 1: Prevent duplicate requests (dedup)
    const isDuplicate = await tokenManager.isDuplicateRequest(
      studentId,
      sessionCode,
    );
    if (isDuplicate) {
      return res.status(429).json({
        success: false,
        message: "Request already being processed. Please wait.",
      });
    }

    // STEP 2: Acquire scan lock (prevent race conditions)
    scanLockAcquired = await tokenManager.acquireScanLock(studentId);
    if (!scanLockAcquired) {
      return res.status(429).json({
        success: false,
        message: "Another scan is in progress. Please wait a moment.",
      });
    }

    // STEP 3: Check token cooldown (1 per hour)
    const hasToken = await tokenManager.hasAvailableToken(studentId);
    if (!hasToken) {
      const cooldown = await tokenManager.getCooldownRemaining(studentId);
      return res.status(429).json({
        success: false,
        message: `You can only scan once per hour. Wait ${Math.ceil(
          cooldown / 60,
        )} minutes.`,
        cooldownRemaining: cooldown,
        cooldownRemainingMinutes: Math.ceil(cooldown / 60),
      });
    }

    // STEP 4: Find session (Redis → MongoDB)
    let sessionData = await tokenManager.getCachedSession(sessionCode);
    let session;

    if (sessionData) {
      if (
        !sessionData.isActive ||
        new Date(sessionData.expiresAt) < new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "This QR code has expired. Ask teacher for a new one.",
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
        message: "Invalid or expired QR code.",
      });
    }

    // STEP 5: Check duplicate attendance (with MongoDB transaction for safety)
    const mongoSession = await mongoose.startSession();

    try {
      mongoSession.startTransaction();

      // Check duplicate inside transaction
      const existing = await Attendance.findOne({
        session: session._id,
        student: req.student._id,
      }).session(mongoSession);

      if (existing) {
        await mongoSession.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Attendance already marked for this session",
        });
      }

      // STEP 6: Create attendance record
      const attendance = await Attendance.create(
        [
          {
            session: session._id,
            student: req.student._id,
            teacher: session.teacher,
            subject: session.subject,
            status: "present",
            deviceFingerprint: fingerprint,
          },
        ],
        { session: mongoSession },
      );

      // STEP 7: Increment session scan count
      await Session.findByIdAndUpdate(
        session._id,
        { $inc: { totalScans: 1 } },
        { session: mongoSession },
      );

      // Commit transaction
      await mongoSession.commitTransaction();

      // STEP 8: Consume token in Redis (1hr cooldown)
      await tokenManager.consumeToken(
        studentId,
        session._id.toString(),
        fingerprint,
      );

      // STEP 9: Save token record in MongoDB
      await Token.create({
        student: req.student._id,
        sessionId: session._id,
        deviceFingerprint: fingerprint,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      // STEP 10: Update Redis attendance count
      const totalCount = await tokenManager.incrementAttendanceCount(
        session._id.toString(),
      );

      res.status(201).json({
        success: true,
        message: "Attendance marked successfully!",
        attendance: {
          id: attendance[0]._id,
          subject: session.subject,
          markedAt: attendance[0].markedAt,
          status: attendance[0].status,
          totalAttendanceInSession: totalCount,
        },
      });
    } catch (txError) {
      await mongoSession.abortTransaction();
      throw txError;
    } finally {
      mongoSession.endSession();
    }
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
      message: "Error marking attendance. Please try again.",
    });
  } finally {
    // Always release scan lock
    if (scanLockAcquired) {
      await tokenManager.releaseScanLock(studentId);
    }
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
