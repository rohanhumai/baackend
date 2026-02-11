// Import the mongoose library to interact with MongoDB
const mongoose = require("mongoose");

// Create an async function to connect to the database
const connectDB = async () => {
  try {
    // Attempt to connect to MongoDB using the URI stored in environment variables
    // mongoose.connect() returns a promise, so we use await
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    // If connection is successful, log the host name of the connected database
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // If connection fails, log the error message
    console.error("MongoDB Connection Error:", error.message);

    // Exit the Node.js process with failure code (1 means something went wrong)
    process.exit(1);
  }
};

// Export the connectDB function so it can be used in other files (like server.js)
module.exports = connectDB;
