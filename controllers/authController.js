// Import jsonwebtoken library to create and verify JWTs
const jwt = require("jsonwebtoken");

// Import Teacher and Student models
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");

// Function to generate JWT token
// Payload includes user id and role (teacher or student)
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role }, // Payload data stored inside token
    process.env.JWT_SECRET, // Secret key used to sign token
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "24h", // Token expiry time (default 24 hours)
    },
  );
};

// ===================== TEACHER LOGIN =====================
exports.teacherLogin = async (req, res) => {
  try {
    // Extract email and password from request body
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find teacher by email
    const teacher = await Teacher.findOne({ email });

    // If teacher not found
    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Compare entered password with hashed password (custom model method)
    const isMatch = await teacher.comparePassword(password);

    // If password does not match
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token for teacher
    const token = generateToken(teacher._id, "teacher");

    // Send success response
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
    // Log server error
    console.error("Teacher login error:", error);

    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// ===================== STUDENT REGISTER =====================
exports.studentRegister = async (req, res) => {
  try {
    // Extract student data from request body
    const { name, rollNumber, email, department, year, section } = req.body;

    // Validate required fields
    if (!name || !rollNumber || !email || !department || !year) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Check if student already exists (either same email OR roll number)
    const existingStudent = await Student.findOne({
      $or: [{ email }, { rollNumber }],
    });

    if (existingStudent) {
      // If student exists, generate token and log them in
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

    // If student does not exist, create new record
    const student = await Student.create({
      name,
      rollNumber,
      email,
      department,
      year,
      section,
    });

    // Generate token for newly registered student
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
    // Log error
    console.error("Student registration error:", error);

    // Handle MongoDB duplicate key error
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

// ===================== GET CURRENT USER =====================
exports.getMe = async (req, res) => {
  try {
    // Extract token from Authorization header (remove "Bearer " prefix)
    const token = req.header("Authorization")?.replace("Bearer ", "");

    // If no token provided
    if (!token) {
      return res.status(401).json({ success: false, message: "No token" });
    }

    // Verify token using secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // If role is teacher, fetch teacher without password field
    if (decoded.role === "teacher") {
      const teacher = await Teacher.findById(decoded.id).select("-password");
      return res.json({ success: true, role: "teacher", user: teacher });
    }
    // If role is student
    else if (decoded.role === "student") {
      const student = await Student.findById(decoded.id);
      return res.json({ success: true, role: "student", user: student });
    }

    // If role is invalid
    res.status(401).json({ success: false, message: "Invalid role" });
  } catch (error) {
    // If token verification fails
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};
