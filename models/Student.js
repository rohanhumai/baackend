// Import mongoose to define schema and model
const mongoose = require("mongoose");

// Define Student schema
const studentSchema = new mongoose.Schema(
  {
    // Student's full name
    name: {
      type: String,
      required: [true, "Name is required"], // Validation with custom message
      trim: true, // Removes extra whitespace
    },

    // Unique roll number (acts as academic identifier)
    rollNumber: {
      type: String,
      required: [true, "Roll number is required"],
      unique: true, // Prevent duplicate roll numbers
      trim: true,
    },

    // Unique email address
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // Prevent duplicate emails
      lowercase: true, // Automatically convert to lowercase
      trim: true,
    },

    // Department name
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },

    // Academic year (restricted range)
    year: {
      type: Number,
      required: [true, "Year is required"],
      min: 1, // Minimum year allowed
      max: 4, // Maximum year allowed
    },

    // Optional section (A, B, etc.)
    section: {
      type: String,
      trim: true,
    },

    // Optional device fingerprint for tracking device identity
    deviceFingerprint: {
      type: String,
      default: null, // Defaults to null if not provided
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  },
);

// Export Student model
module.exports = mongoose.model("Student", studentSchema);
