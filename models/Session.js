const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    sessionCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    qrData: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    department: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
    },
    section: {
      type: String,
    },
    // Track total scans for this session
    totalScans: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Auto expire sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for fast lookup
sessionSchema.index({ sessionCode: 1, isActive: 1, expiresAt: 1 });

module.exports = mongoose.model("Session", sessionSchema);
