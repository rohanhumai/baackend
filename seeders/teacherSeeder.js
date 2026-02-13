const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Teacher = require("../models/Teacher");

dotenv.config();

const teachers = [
  {
    name: "Dr. Rajesh Kumar",
    email: "rajesh.kumar@college.edu",
    password: "teacher123",
    department: "Computer Science",
    subjects: ["Data Structures", "Algorithms", "Database Management"],
  },
  {
    name: "Prof. Priya Sharma",
    email: "priya.sharma@college.edu",
    password: "teacher123",
    department: "Computer Science",
    subjects: [
      "Operating Systems",
      "Computer Networks",
      "Software Engineering",
    ],
  },
  {
    name: "Dr. Amit Patel",
    email: "amit.patel@college.edu",
    password: "teacher123",
    department: "Electronics",
    subjects: ["Digital Electronics", "Microprocessors", "Signal Processing"],
  },
  {
    name: "Prof. Sunita Verma",
    email: "sunita.verma@college.edu",
    password: "teacher123",
    department: "Mathematics",
    subjects: ["Linear Algebra", "Calculus", "Probability & Statistics"],
  },
  {
    name: "Dr. Admin Teacher",
    email: "admin@college.edu",
    password: "admin123",
    department: "Computer Science",
    subjects: ["Web Development", "Machine Learning", "Cloud Computing"],
  },
];

const seedTeachers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected for seeding");

    // Clear existing teachers
    await Teacher.deleteMany({});
    console.log("Cleared existing teachers");

    // Insert teachers
    const createdTeachers = await Teacher.create(teachers);

    console.log("\n=== Teachers Seeded Successfully ===\n");
    createdTeachers.forEach((teacher) => {
      console.log(`  Name: ${teacher.name}`);
      console.log(`  Email: ${teacher.email}`);
      console.log(`  Department: ${teacher.department}`);
      console.log(`  Subjects: ${teacher.subjects.join(", ")}`);
      console.log("  ---");
    });

    console.log("\n=== Login Credentials ===\n");
    teachers.forEach((t) => {
      console.log(`  ${t.email} / ${t.password}`);
    });
    console.log("\n");

    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedTeachers();
