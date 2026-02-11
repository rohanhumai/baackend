// Import mongoose to define schema and model
const mongoose = require("mongoose");

// Define Attendance schema
const attendanceSchema = new mongoose.Schema(
  {
    // Reference to the session in which attendance was marked
    session: {
      type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId reference
      ref: "Session", // Refers to Session model
      required: true, // Must be provided
    },

    // Reference to the student who marked attendance
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student", // Refers to Student model
      required: true,
    },

    // Reference to the teacher who conducted the session
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher", // Refers to Teacher model
      required: true,
    },

    // Subject name stored directly for quick access (denormalized)
    subject: {
      type: String,
      required: true,
    },

    // Timestamp of when attendance was marked
    markedAt: {
      type: Date,
      default: Date.now, // Automatically sets current time
    },

    // Attendance status
    status: {
      type: String,
      enum: ["present", "late"], // Only these values allowed
      default: "present",
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  },
);

// Compound unique index:
// Ensures a student can only mark attendance once per session
attendanceSchema.index({ session: 1, student: 1 }, { unique: true });

// Export Attendance model
module.exports = mongoose.model("Attendance", attendanceSchema);
