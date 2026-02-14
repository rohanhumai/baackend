const mongoose = require("mongoose");
// Mongoose library ko import kar rahe hain (MongoDB ke saath interact karne ke liye)

const connectDB = async () => {
  // Async function bana rahe hain taaki database connection ko await kar sakein

  try {
    // Try block use kar rahe hain taaki connection attempt ke errors handle ho sakein

    const conn = await mongoose.connect(process.env.MONGODB_URI);
    // MongoDB se connect kar rahe hain using connection string jo .env file me stored hai
    // await isliye use kiya kyunki mongoose.connect() promise return karta hai

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    // Successfully connect hone par console me host name print kar rahe hain
    // conn.connection.host actual connected server ka host batata hai
  } catch (error) {
    // Agar connection fail ho jaye toh yeh block execute hoga

    console.error("MongoDB Connection Error:", error.message);
    // Error message console me print kar rahe hain (sirf readable message)

    process.exit(1);
    // Application ko forcefully band kar rahe hain (exit code 1 = failure)
    // Yeh production me important hai taaki broken state me server na chale
  }
};

module.exports = connectDB;
// connectDB function ko export kar rahe hain taaki dusre files me use kar sakein
