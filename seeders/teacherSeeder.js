// Override default DNS servers (use Cloudflare + Google DNS)
// Helpful if MongoDB Atlas DNS resolution has issues
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);

// Import mongoose for database connection
const mongoose = require("mongoose");

// Import dotenv to load environment variables
const dotenv = require("dotenv");

// Import Teacher model
const Teacher = require("../models/Teacher");

// Load environment variables from .env file
dotenv.config();

// Array of teacher objects to seed into database
const teachers = [
  {
    name: "Dr. Sahilesh Nandgaonkar",
    email: "shailesh@college.edu",
    password: "teacher123", // Will be hashed automatically by pre-save hook
    department: "Computer Science",
    subjects: ["data analytics", "cyber security"],
  },
  {
    name: "Dr. Madhukar Andhale",
    email: "madhukar@college.edu",
    password: "teacher123",
    department: "Computer Science",
    subjects: ["Mathematics 1", "Mathematics 2", "Mathematics 3"],
  },
  {
    name: "Prof. Kishan Rangeele",
    email: "kishanr@college.edu",
    password: "teacher123",
    department: "Computer Science",
    subjects: ["Analysis of Algorithm", "Database Management System"],
  },
  {
    name: "Prof. Nikita Khurpate",
    email: "nikitak@college.edu",
    password: "teacher123",
    department: "Computer Science",
    subjects: [
      "Computational Theory",
      "Python Programming",
      "Discrete Mathematics",
    ],
  },
];

// Async function to seed teachers
const seedTeachers = async () => {
  try {
    // Connect to MongoDB using URI from environment variables
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected for seeding");

    // Remove all existing teachers (dangerous in production, safe in dev)
    await Teacher.deleteMany({});
    console.log("Cleared existing teachers");

    // Insert new teacher documents
    // Passwords will be hashed automatically via pre-save hook
    const createdTeachers = await Teacher.create(teachers);

    console.log("\n=== Teachers Seeded Successfully ===\n");

    // Print created teacher details
    createdTeachers.forEach((teacher) => {
      console.log(`  Name: ${teacher.name}`);
      console.log(`  Email: ${teacher.email}`);
      console.log(`  Department: ${teacher.department}`);
      console.log(`  Subjects: ${teacher.subjects.join(", ")}`);
      console.log("  ---");
    });

    console.log("\n=== Login Credentials ===\n");

    // Print login credentials (for testing convenience)
    teachers.forEach((t) => {
      console.log(`  ${t.email} / ${t.password}`);
    });

    console.log("\n");

    // Exit process successfully
    process.exit(0);
  } catch (error) {
    // Log any error during seeding
    console.error("Seeding error:", error);

    // Exit process with failure code
    process.exit(1);
  }
};

// Execute seeding function
seedTeachers();
