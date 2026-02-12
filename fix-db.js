require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);
const mongoose = require("mongoose");
require("dotenv").config();

async function fix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    const db = mongoose.connection.db;

    // Drop old student indexes
    try {
      await db.collection("students").dropIndexes();
      console.log("✅ Dropped student indexes");
    } catch (e) {
      console.log("No student indexes to drop");
    }

    // Drop old attendance indexes
    try {
      await db.collection("attendances").dropIndexes();
      console.log("✅ Dropped attendance indexes");
    } catch (e) {
      console.log("No attendance indexes to drop");
    }

    // Drop old session indexes
    try {
      await db.collection("sessions").dropIndexes();
      console.log("✅ Dropped session indexes");
    } catch (e) {
      console.log("No session indexes to drop");
    }

    // Drop old token indexes
    try {
      await db.collection("tokens").dropIndexes();
      console.log("✅ Dropped token indexes");
    } catch (e) {
      console.log("No token indexes to drop");
    }

    console.log("\n🎉 Done! Restart server now.\n");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

fix();
