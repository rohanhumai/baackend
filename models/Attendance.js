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
    // Store device fingerprint at time of scan
    deviceFingerprint: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate: one student per session
attendanceSchema.index({ session: 1, student: 1 }, { unique: true });

// Fast lookup by student
attendanceSchema.index({ student: 1, markedAt: -1 });

// Fast lookup by session
attendanceSchema.index({ session: 1, markedAt: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
