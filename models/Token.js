const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
    deviceFingerprint: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tokenSchema.index({ student: 1, expiresAt: 1 });

module.exports = mongoose.model("Token", tokenSchema);
