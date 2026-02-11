// Import mongoose to define schema and model
const mongoose = require("mongoose");

// Define Token schema
const tokenSchema = new mongoose.Schema(
  {
    // Reference to the student who used the token
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student", // Links to Student model
      required: true,
    },

    // Timestamp when token was used
    usedAt: {
      type: Date,
      default: Date.now, // Automatically set current time
    },

    // Reference to the session where token was consumed
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session", // Links to Session model
    },

    // Expiration time of the token (used for TTL deletion)
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  },
);

// TTL Index:
// Automatically deletes token document when expiresAt time passes
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for efficient queries by student and expiration
tokenSchema.index({ student: 1, expiresAt: 1 });

// Export Token model
module.exports = mongoose.model("Token", tokenSchema);
