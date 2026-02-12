const jwt = require("jsonwebtoken");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");

const authenticateTeacher = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Access denied.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Teachers only.",
      });
    }

    const teacher = await Teacher.findById(decoded.id).select("-password");
    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    req.teacher = teacher;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

const authenticateStudent = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Access denied.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Students only.",
      });
    }

    const student = await Student.findById(decoded.id);
    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Student not found.",
      });
    }

    req.student = student;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

module.exports = { authenticateTeacher, authenticateStudent };
