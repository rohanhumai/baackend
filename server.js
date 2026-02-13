const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("./config/database");
const { connectRedis } = require("./config/redis");

const app = express();

app.disable("x-powered-by");

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

// Connect databases
connectDB();
connectRedis();

// Health check - test this first
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Load routes safely
try {
  app.use("/api/auth", require("./routes/auth"));
  console.log("✅ /api/auth loaded");
} catch (e) {
  console.error("❌ /api/auth failed:", e.message);
}

try {
  app.use("/api/teacher", require("./routes/teacher"));
  console.log("✅ /api/teacher loaded");
} catch (e) {
  console.error("❌ /api/teacher failed:", e.message);
}

try {
  app.use("/api/student", require("./routes/student"));
  console.log("✅ /api/student loaded");
} catch (e) {
  console.error("❌ /api/student failed:", e.message);
}

try {
  app.use("/api/attendance", require("./routes/attendance"));
  console.log("✅ /api/attendance loaded");
} catch (e) {
  console.error("❌ /api/attendance failed:", e.message);
}

try {
  app.use("/api/admin", require("./routes/admin"));
  console.log("✅ /api/admin loaded");
} catch (e) {
  console.error("❌ /api/admin failed:", e.message);
}

// 404 handler
app.use((req, res) => {
  console.log(`⚠️ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\nServer running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health\n`);
});
