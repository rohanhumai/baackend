require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/database");
const { connectRedis } = require("./config/redis");

dotenv.config();

const app = express();

// Security headers
app.disable("x-powered-by");

// CORS
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
    exposedHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
  }),
);

// Body parser with size limit
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// Trust proxy for rate limiting behind reverse proxy
app.set("trust proxy", 1);

// Connect databases
connectDB();
connectRedis();

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/teacher", require("./routes/teacher"));
app.use("/api/student", require("./routes/student"));
app.use("/api/attendance", require("./routes/attendance"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `Max QR expiry: ${process.env.MAX_QR_EXPIRY_MINUTES || 1} minute(s)`,
  );
});
