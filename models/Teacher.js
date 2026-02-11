// Import mongoose to define schema and model
const mongoose = require("mongoose");

// Import bcrypt for password hashing
const bcrypt = require("bcryptjs");

// Define Teacher schema
const teacherSchema = new mongoose.Schema(
  {
    // Teacher's full name
    name: {
      type: String,
      required: [true, "Name is required"], // Validation with custom message
      trim: true, // Remove extra whitespace
    },

    // Unique email address
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // Prevent duplicate emails
      lowercase: true, // Automatically normalize to lowercase
      trim: true,
    },

    // Hashed password (never stored in plain text)
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6, // Minimum password length validation
    },

    // Department name
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },

    // List of subjects teacher handles
    subjects: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  },
);

// ===================== PASSWORD HASHING MIDDLEWARE =====================

// Pre-save hook runs before saving a document
teacherSchema.pre("save", async function (next) {
  // If password is not modified, skip hashing
  if (!this.isModified("password")) return next();

  // Hash password with salt rounds = 12
  this.password = await bcrypt.hash(this.password, 12);

  next();
});

// ===================== PASSWORD COMPARISON METHOD =====================

// Instance method to compare entered password with hashed password
teacherSchema.methods.comparePassword = async function (candidatePassword) {
  // bcrypt.compare securely checks plaintext vs hashed password
  return await bcrypt.compare(candidatePassword, this.password);
};

// Export Teacher model
module.exports = mongoose.model("Teacher", teacherSchema);
