const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Session = require("../models/Session");
const Attendance = require("../models/Attendance");
const Token = require("../models/Token");
const tokenManager = require("../utils/tokenManager");
const { getRedisClient } = require("../config/redis");

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });
};

// ============================================
// AUTH
// ============================================

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(admin._id, admin.role);

    res.json({
      success: true,
      message: "Admin login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ============================================
// DASHBOARD STATS
// ============================================

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalStudents,
      totalTeachers,
      totalSessions,
      totalAttendance,
      activeSessions,
      todayAttendance,
      lockedDevices,
    ] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments(),
      Session.countDocuments(),
      Attendance.countDocuments(),
      Session.countDocuments({
        isActive: true,
        expiresAt: { $gt: new Date() },
      }),
      Attendance.countDocuments({
        markedAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
      Student.countDocuments({
        deviceFingerprint: { $ne: null },
      }),
    ]);

    // Recent activity
    const recentAttendance = await Attendance.find()
      .populate("student", "name rollNumber")
      .populate("teacher", "name")
      .populate("session", "subject")
      .sort({ markedAt: -1 })
      .limit(10);

    // Attendance per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyAttendance = await Attendance.aggregate([
      { $match: { markedAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$markedAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top subjects
    const topSubjects = await Attendance.aggregate([
      {
        $group: {
          _id: "$subject",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalTeachers,
        totalSessions,
        totalAttendance,
        activeSessions,
        todayAttendance,
        lockedDevices,
      },
      recentAttendance,
      dailyAttendance,
      topSubjects,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ success: false, message: "Error fetching stats" });
  }
};

// ============================================
// STUDENT MANAGEMENT
// ============================================

exports.getAllStudents = async (req, res) => {
  try {
    const { search, department, year, page = 1, limit = 20 } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { rollNumber: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (department) query.department = department;
    if (year) query.year = parseInt(year);

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get attendance count for each student
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const attendanceCount = await Attendance.countDocuments({
          student: student._id,
        });
        const cooldown = await tokenManager.getCooldownRemaining(
          student._id.toString(),
        );
        return {
          ...student.toObject(),
          attendanceCount,
          tokenCooldown: cooldown,
          hasActiveCooldown: cooldown > 0,
        };
      }),
    );

    res.json({
      success: true,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      students: studentsWithStats,
    });
  } catch (error) {
    console.error("Get students error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching students" });
  }
};

exports.getStudentDetails = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const attendance = await Attendance.find({ student: student._id })
      .populate("session", "subject department")
      .populate("teacher", "name")
      .sort({ markedAt: -1 })
      .limit(50);

    const tokenHistory = await Token.find({ student: student._id })
      .sort({ createdAt: -1 })
      .limit(20);

    const cooldown = await tokenManager.getCooldownRemaining(
      student._id.toString(),
    );

    res.json({
      success: true,
      student,
      attendance,
      tokenHistory,
      tokenCooldown: cooldown,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching student" });
  }
};

exports.resetStudentDevice = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // Clear device from MongoDB
    student.deviceFingerprint = null;
    student.deviceRegisteredAt = null;
    student.deviceInfo = { browser: null, os: null, platform: null };
    await student.save();

    // Clear device from Redis
    const redis = getRedisClient();
    await redis.del(`device:lock:${student._id.toString()}`);

    res.json({
      success: true,
      message: `Device reset for ${student.name}. They can now login from a new device.`,
    });
  } catch (error) {
    console.error("Reset device error:", error);
    res.status(500).json({ success: false, message: "Error resetting device" });
  }
};

exports.resetStudentToken = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // Clear token cooldown from Redis
    const redis = getRedisClient();
    await redis.del(`token:cooldown:${student._id.toString()}`);

    res.json({
      success: true,
      message: `Token cooldown reset for ${student.name}. They can scan again now.`,
    });
  } catch (error) {
    console.error("Reset token error:", error);
    res.status(500).json({ success: false, message: "Error resetting token" });
  }
};

exports.toggleStudentStatus = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    student.isActive = !student.isActive;
    await student.save();

    res.json({
      success: true,
      message: `Student ${student.isActive ? "activated" : "deactivated"}.`,
      isActive: student.isActive,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error toggling status" });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // Clean up Redis
    const redis = getRedisClient();
    await redis.del(`device:lock:${student._id.toString()}`);
    await redis.del(`token:cooldown:${student._id.toString()}`);

    // Delete attendance records
    await Attendance.deleteMany({ student: student._id });
    await Token.deleteMany({ student: student._id });

    // Delete student
    await Student.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Student ${student.name} deleted with all records.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting student" });
  }
};

// ============================================
// TEACHER MANAGEMENT
// ============================================

exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find()
      .select("-password")
      .sort({ createdAt: -1 });

    const teachersWithStats = await Promise.all(
      teachers.map(async (teacher) => {
        const sessionCount = await Session.countDocuments({
          teacher: teacher._id,
        });
        const attendanceCount = await Attendance.countDocuments({
          teacher: teacher._id,
        });
        return {
          ...teacher.toObject(),
          sessionCount,
          attendanceCount,
        };
      }),
    );

    res.json({ success: true, teachers: teachersWithStats });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching teachers" });
  }
};

exports.createTeacher = async (req, res) => {
  try {
    const { name, email, password, department, subjects } = req.body;

    if (!name || !email || !password || !department) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, department required",
      });
    }

    const existing = await Teacher.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Teacher with this email exists",
      });
    }

    const teacher = await Teacher.create({
      name,
      email,
      password,
      department,
      subjects: subjects || [],
    });

    res.status(201).json({
      success: true,
      message: "Teacher created",
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department,
        subjects: teacher.subjects,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating teacher" });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found" });
    }

    await Session.deleteMany({ teacher: teacher._id });
    await Attendance.deleteMany({ teacher: teacher._id });
    await Teacher.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Teacher ${teacher.name} deleted.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting teacher" });
  }
};

// ============================================
// SESSION MANAGEMENT
// ============================================

exports.getAllSessions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const total = await Session.countDocuments();
    const sessions = await Session.find()
      .populate("teacher", "name email department")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const sessionsWithCount = await Promise.all(
      sessions.map(async (session) => {
        const count = await Attendance.countDocuments({
          session: session._id,
        });
        return { ...session.toObject(), attendanceCount: count };
      }),
    );

    res.json({
      success: true,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      sessions: sessionsWithCount,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching sessions" });
  }
};

exports.forceEndSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    session.isActive = false;
    await session.save();
    await tokenManager.invalidateSession(session.sessionCode);

    res.json({ success: true, message: "Session force ended." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error ending session" });
  }
};

// ============================================
// ATTENDANCE MANAGEMENT
// ============================================

exports.getAllAttendance = async (req, res) => {
  try {
    const { date, subject, department, page = 1, limit = 50 } = req.query;

    const query = {};
    if (subject) query.subject = { $regex: subject, $options: "i" };
    if (date) {
      const d = new Date(date);
      query.markedAt = {
        $gte: new Date(d.setHours(0, 0, 0, 0)),
        $lt: new Date(d.setHours(23, 59, 59, 999)),
      };
    }

    const total = await Attendance.countDocuments(query);
    const attendance = await Attendance.find(query)
      .populate("student", "name rollNumber department year section")
      .populate("teacher", "name")
      .populate("session", "subject department")
      .sort({ markedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      attendance,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching attendance" });
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    await Attendance.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Attendance record deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting record" });
  }
};

// ============================================
// REDIS MANAGEMENT
// ============================================

exports.getRedisStats = async (req, res) => {
  try {
    const redis = getRedisClient();

    const keys = await redis.keys("*");
    const tokenKeys = keys.filter((k) => k.startsWith("token:cooldown:"));
    const deviceKeys = keys.filter((k) => k.startsWith("device:lock:"));
    const sessionKeys = keys.filter((k) => k.startsWith("session:"));
    const rateLimitKeys = keys.filter((k) => k.startsWith("rl:"));

    res.json({
      success: true,
      redis: {
        totalKeys: keys.length,
        tokenCooldowns: tokenKeys.length,
        deviceLocks: deviceKeys.length,
        cachedSessions: sessionKeys.length,
        rateLimitKeys: rateLimitKeys.length,
        allKeys: keys,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching Redis stats" });
  }
};

exports.flushRedis = async (req, res) => {
  try {
    const { type } = req.body;
    const redis = getRedisClient();

    if (type === "tokens") {
      const keys = await redis.keys("token:cooldown:*");
      if (keys.length > 0) await redis.del(...keys);
      return res.json({
        success: true,
        message: `Cleared ${keys.length} token cooldowns.`,
      });
    }

    if (type === "devices") {
      const keys = await redis.keys("device:lock:*");
      if (keys.length > 0) await redis.del(...keys);
      // Also clear from MongoDB
      await Student.updateMany(
        {},
        {
          deviceFingerprint: null,
          deviceRegisteredAt: null,
          deviceInfo: { browser: null, os: null, platform: null },
        },
      );
      return res.json({
        success: true,
        message: `Cleared ${keys.length} device locks.`,
      });
    }

    if (type === "sessions") {
      const keys = await redis.keys("session:*");
      if (keys.length > 0) await redis.del(...keys);
      return res.json({
        success: true,
        message: `Cleared ${keys.length} cached sessions.`,
      });
    }

    if (type === "ratelimits") {
      const keys = await redis.keys("rl:*");
      if (keys.length > 0) await redis.del(...keys);
      return res.json({
        success: true,
        message: `Cleared ${keys.length} rate limit keys.`,
      });
    }

    if (type === "all") {
      await redis.flushdb();
      return res.json({ success: true, message: "All Redis data cleared." });
    }

    res.status(400).json({
      success: false,
      message: "Invalid type. Use: tokens, devices, sessions, ratelimits, all",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error flushing Redis" });
  }
};
