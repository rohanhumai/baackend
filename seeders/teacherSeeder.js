require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Teacher = require("../models/Teacher");
const Admin = require("../models/Admin");

dotenv.config();

const teachers = [
  {
    name: "Dr. Sahilesh Nandgaonkar",
    email: "shailesh@college.edu",
    password: "teacher123",
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

const admins = [
  {
    name: "Rohan Sable",
    email: "sablerohan125@gmail.com",
    password: "Rohan@692007sagemain",
    role: "admin",
  },
];
const seed = async () => {
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

    await Admin.deleteMany({});
    const createdAdmins = await Admin.create(admins);
    console.log("\n=== Admins Seeded ===");
    admins.forEach((a) =>
      console.log(`  ${a.email} / ${a.password} (${a.role})`),
    );

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

seed();
