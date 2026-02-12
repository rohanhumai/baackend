const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    rollNumber: {
      type: String,
      required: [true, "Roll number is required"],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, "Year is required"],
      min: 1,
      max: 4,
    },
    section: {
      type: String,
      trim: true,
    },
    // Device fingerprint — locked after first login
    deviceFingerprint: {
      type: String,
      default: null,
    },
    // When device was registered
    deviceRegisteredAt: {
      type: Date,
      default: null,
    },
    // Device info for admin tracking
    deviceInfo: {
      browser: { type: String, default: null },
      os: { type: String, default: null },
      platform: { type: String, default: null },
    },
    // Is account active
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Student", studentSchema);
