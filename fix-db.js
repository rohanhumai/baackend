const mongoose = require("mongoose");
require("dotenv").config();

async function fix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;

    // List all indexes on students collection
    const indexes = await db.collection("students").indexes();
    console.log("\nCurrent indexes on students:");
    indexes.forEach((idx) => {
      console.log(`  ${idx.name} →`, JSON.stringify(idx.key));
    });

    // Drop the problematic index
    try {
      await db.collection("students").dropIndex("rollNo_1");
      console.log("\n✅ Dropped old index: rollNo_1");
    } catch (err) {
      console.log("\nrollNo_1 index not found, skipping...");
    }

    // Drop all indexes except _id and rebuild
    try {
      await db.collection("students").dropIndexes();
      console.log("✅ Dropped all custom indexes");
    } catch (err) {
      console.log("Could not drop indexes:", err.message);
    }

    // Verify
    const newIndexes = await db.collection("students").indexes();
    console.log("\nIndexes after fix:");
    newIndexes.forEach((idx) => {
      console.log(`  ${idx.name} →`, JSON.stringify(idx.key));
    });

    console.log("\n🎉 Fixed! Now restart your server.\n");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

fix();
