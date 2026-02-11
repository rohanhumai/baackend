// Import JWT library for verifying tokens
const jwt = require("jsonwebtoken");

// Import Teacher and Student models
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");

// ===================== TEACHER AUTHENTICATION MIDDLEWARE =====================
const authenticateTeacher = async (req, res, next) => {
  try {
    // Extract token from Authorization header (remove "Bearer " prefix)
    const token = req.header("Authorization")?.replace("Bearer ", "");

    // If token is missing
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Access denied.",
      });
    }

    // Verify token using JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure token role is "teacher"
    if (decoded.role !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Teachers only.",
      });
    }

    // Fetch teacher from database (exclude password field)
    const teacher = await Teacher.findById(decoded.id).select("-password");

    // If teacher not found in DB
    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    // Attach teacher object to request for downstream controllers
    req.teacher = teacher;

    // Proceed to next middleware/controller
    next();
  } catch (error) {
    // If token is invalid or expired
    res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

// ===================== STUDENT AUTHENTICATION MIDDLEWARE =====================
const authenticateStudent = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    // If token missing
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Access denied.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure token role is "student"
    if (decoded.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Students only.",
      });
    }

    // Fetch student from database
    const student = await Student.findById(decoded.id);

    // If student not found
    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Student not found.",
      });
    }

    // Attach student to request object
    req.student = student;

    // Continue to next middleware/controller
    next();
  } catch (error) {
    // Token invalid, malformed, or expired
    res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

// Export middleware functions
module.exports = { authenticateTeacher, authenticateStudent };
