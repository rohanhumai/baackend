const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["present", "late"],
      default: "present",
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate attendance per session per student
attendanceSchema.index({ session: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
