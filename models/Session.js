// Import mongoose to define schema and model
const mongoose = require("mongoose");

// Define Session schema
const sessionSchema = new mongoose.Schema(
  {
    // Reference to teacher who created the session
    teacher: {
      type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId reference
      ref: "Teacher", // Refers to Teacher model
      required: true,
    },

    // Subject name for the session
    subject: {
      type: String,
      required: [true, "Subject is required"], // Custom validation message
      trim: true, // Removes leading/trailing whitespace
    },

    // Unique session identifier (used in QR and lookups)
    sessionCode: {
      type: String,
      required: true,
      unique: true, // Ensures no two sessions share same code
    },

    // QR payload data stored as string
    qrData: {
      type: String,
      required: true,
    },

    // Indicates whether session is currently active
    isActive: {
      type: Boolean,
      default: true,
    },

    // Expiration timestamp for the session
    expiresAt: {
      type: Date,
      required: true,
    },

    // Department associated with session
    department: {
      type: String,
      required: true,
    },

    // Optional academic year
    year: {
      type: Number,
    },

    // Optional section
    section: {
      type: String,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  },
);

// TTL Index:
// MongoDB will automatically delete the document
// when expiresAt time is reached
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Export Session model
module.exports = mongoose.model("Session", sessionSchema);
