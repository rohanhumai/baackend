// Override default DNS servers (helps resolve MongoDB Atlas SRV issues)
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);

// Import required dependencies
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Import database connection functions
const connectDB = require("./config/database");
const { connectRedis } = require("./config/redis");

// Load environment variables from .env file
dotenv.config();

// Create Express app instance
const app = express();

// ===================== MIDDLEWARE =====================

// Enable CORS (currently open to all origins)
// Commented section shows restricted origin configuration
app.use(
  cors(),
  //   {
  //   origin: [
  //     "http://localhost:3000",
  //     "http://localhost:5173",
  //     "https://mini-project-frontend1.vercel.app/",
  //   ],
  //   credentials: true,
  // }
);

// Parse incoming JSON requests (limit body size to 10MB)
app.use(express.json({ limit: "10mb" }));

// ===================== DATABASE CONNECTIONS =====================

// Connect to MongoDB
connectDB();

// Connect to Redis
connectRedis();

// ===================== ROUTES =====================

// Authentication routes
app.use("/api/auth", require("./routes/auth"));

// Teacher routes
app.use("/api/teacher", require("./routes/teacher"));

// Student routes
app.use("/api/student", require("./routes/student"));

// Attendance routes
app.use("/api/attendance", require("./routes/attendance"));

// ===================== HEALTH CHECK =====================

// Simple health endpoint for uptime monitoring
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// ===================== GLOBAL ERROR HANDLER =====================

// Catch unhandled errors from routes/middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    // Show detailed error only in development mode
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ===================== SERVER START =====================

// Define port (default 5000)
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
