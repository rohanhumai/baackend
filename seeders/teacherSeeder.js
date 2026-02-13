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
    subjects: ["data analytics", "cyber security", "Physics 2"],
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
  {
    name: "Prof. Muneesh Pal",
    email: "muneesh@college.edu",
    password: "teacher123",
    department: "Computer Science",
    subjects: ["Python Programming", "Operating System"],
  },
  {
    name: "Dr. Shital Agrawal",
    email: "shital@college.edu",
    password: "teacher123",
    department: "Computer Science",
    subjects: ["Intro to Web Technology", "Data Structures"],
  },
  {
    name: "Adv Sunil Pagare",
    email: "sunil@college.edu",
    password: "teacher123",
    department: "Computer Science",
    subjects: ["Physics 1", "Entrepreneurship Development", "BMD"],
  },
  {
    name: "Amarkumar Modi",
    email: "amarkumar@college.edu",
    password: "teacher123",
    department: "Computer Science",
    subjects: ["Mechanics(Dynamics)"],
  },
  {
    name: "Astrologer Kailas More",
    email: "kailas@college.edu",
    password: "teacher123",
    department: "Computer Science",
    subjects: ["Mechanics(Statics)", "Engineering Graphics"],
  },
  {
    name: "Sanjay Sable",
    email: "sanjay@college.edu",
    password: "teacher123",
    department: "Computer Science",
    subjects: ["Engineering Graphics"],
  },
  {
    name: "Vaishali Patharkar",
    email: "vaishali@college.edu",
    password: "teacher123",
    department: "Computer Science",
    subjects: ["Chemistry 1", "Chemistry 2"],
  },
  {
    name: "Sanika Swami",
    email: "sanika@college.edu",
    password: "teacher123",
    department: "Computer Science",
    subjects: ["Basic Electrical Engineering"],
  },
  {
    name: "Nisha ",
    email: "nisha@college.edu",
    password: "teacher123",
    department: "Computer Science",
    subjects: ["Basic Electrical Engineering"],
  },
  {
    name: "Dipak Mhase",
    email: "dipak@college.edu",
    password: "teacher123",
    department: "Computer Science",
    subjects: ["Mathematics 1", "Mathematics 2"],
  },
  {
    name: "KT Jadhao",
    email: "kt@college.edu",
    password: "teacher123",
    department: "Computer Science",
    subjects: ["Computer Organization and Architecture"],
  },
];

const admins = [
  {
    name: "Rohan Sable",
    email: "rohan@admin.edu",
    password: "sagemain",
    role: "admin",
  },
  {
    name: "Nilesh Sharma",
    email: "nilesh@admin.edu",
    password: "nilesh123",
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
