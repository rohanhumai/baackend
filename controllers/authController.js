const jwt = require("jsonwebtoken");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });
};

exports.teacherLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const teacher = await Teacher.findOne({ email });
    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await teacher.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(teacher._id, "teacher");

    res.json({
      success: true,
      message: "Login successful",
      token,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department,
        subjects: teacher.subjects,
      },
    });
  } catch (error) {
    console.error("Teacher login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

exports.studentRegister = async (req, res) => {
  try {
    const { name, rollNumber, email, department, year, section } = req.body;

    if (!name || !rollNumber || !email || !department || !year) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Check if student already exists
    const existingStudent = await Student.findOne({
      $or: [{ email }, { rollNumber }],
    });

    if (existingStudent) {
      // If student exists, log them in
      const token = generateToken(existingStudent._id, "student");
      return res.json({
        success: true,
        message: "Student already registered. Logged in.",
        token,
        student: {
          id: existingStudent._id,
          name: existingStudent.name,
          rollNumber: existingStudent.rollNumber,
          email: existingStudent.email,
          department: existingStudent.department,
          year: existingStudent.year,
          section: existingStudent.section,
        },
      });
    }

    const student = await Student.create({
      name,
      rollNumber,
      email,
      department,
      year,
      section,
    });

    const token = generateToken(student._id, "student");

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      student: {
        id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email,
        department: student.department,
        year: student.year,
        section: student.section,
      },
    });
  } catch (error) {
    console.error("Student registration error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Student with this email or roll number already exists",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ success: false, message: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === "teacher") {
      const teacher = await Teacher.findById(decoded.id).select("-password");
      return res.json({ success: true, role: "teacher", user: teacher });
    } else if (decoded.role === "student") {
      const student = await Student.findById(decoded.id);
      return res.json({ success: true, role: "student", user: student });
    }

    res.status(401).json({ success: false, message: "Invalid role" });
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};
