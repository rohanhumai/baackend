// Import function to get initialized Redis client
const { getRedisClient } = require("../config/redis");

// Factory function to create configurable Redis-based rate limiter
const redisRateLimiter = (options = {}) => {
  // Destructure options with default values
  const {
    windowMs = 60 * 1000, // Time window in milliseconds (default: 1 minute)
    maxRequests = 30, // Maximum allowed requests within window
    keyPrefix = "rl", // Prefix for Redis key namespace
    message = "Too many requests. Please try again later.", // Default error message
  } = options;

  // Return actual middleware function
  return async (req, res, next) => {
    try {
      // Get Redis client instance
      const redis = getRedisClient();

      // Identify client (IP address fallback logic)
      const identifier = req.ip || req.connection.remoteAddress;

      // Create unique Redis key per IP + route path
      const key = `${keyPrefix}:${identifier}:${req.path}`;

      // Increment request count atomically
      const currentCount = await redis.incr(key);

      // If this is the first request in the window, set expiry
      if (currentCount === 1) {
        await redis.pexpire(key, windowMs); // Expiry in milliseconds
      }

      // Get remaining TTL (time to live) for this key
      const ttl = await redis.pttl(key);

      // Set rate limit info in response headers
      res.set({
        "X-RateLimit-Limit": maxRequests, // Maximum allowed requests
        "X-RateLimit-Remaining": Math.max(0, maxRequests - currentCount), // Requests left
        "X-RateLimit-Reset": new Date(Date.now() + ttl).toISOString(), // Reset time
      });

      // If request count exceeds limit
      if (currentCount > maxRequests) {
        return res.status(429).json({
          success: false,
          message,
          retryAfter: Math.ceil(ttl / 1000), // Time until retry allowed (seconds)
        });
      }

      // Allow request to continue
      next();
    } catch (error) {
      // Log Redis error
      console.error("Rate limiter error:", error.message);

      // Fail-open strategy: if Redis fails, allow request
      next();
    }
  };
};

// ===================== PRECONFIGURED LIMITERS =====================

// Strict limiter for attendance marking (anti-DDoS protection)
const attendanceRateLimiter = redisRateLimiter({
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 5, // Only 5 requests allowed
  keyPrefix: "rl:attendance", // Separate Redis namespace
  message: "Too many attendance requests. Please wait before trying again.",
});

// General API limiter (moderate protection)
const apiRateLimiter = redisRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests allowed
  keyPrefix: "rl:api",
  message: "Too many requests. Please slow down.",
});

// Authentication limiter (brute force protection)
const authRateLimiter = redisRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  maxRequests: 10, // Only 10 login attempts allowed
  keyPrefix: "rl:auth",
  message: "Too many login attempts. Please try again after 15 minutes.",
});

// Export middleware functions
module.exports = {
  redisRateLimiter,
  attendanceRateLimiter,
  apiRateLimiter,
  authRateLimiter,
};
