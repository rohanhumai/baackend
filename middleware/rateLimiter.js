const { getRedisClient } = require("../config/redis");

const redisRateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000, // 1 minute
    maxRequests = 30, // max requests per window
    keyPrefix = "rl",
    message = "Too many requests. Please try again later.",
  } = options;

  return async (req, res, next) => {
    try {
      const redis = getRedisClient();
      const identifier = req.ip || req.connection.remoteAddress;
      const key = `${keyPrefix}:${identifier}:${req.path}`;

      const currentCount = await redis.incr(key);

      if (currentCount === 1) {
        await redis.pexpire(key, windowMs);
      }

      const ttl = await redis.pttl(key);

      res.set({
        "X-RateLimit-Limit": maxRequests,
        "X-RateLimit-Remaining": Math.max(0, maxRequests - currentCount),
        "X-RateLimit-Reset": new Date(Date.now() + ttl).toISOString(),
      });

      if (currentCount > maxRequests) {
        return res.status(429).json({
          success: false,
          message,
          retryAfter: Math.ceil(ttl / 1000),
        });
      }

      next();
    } catch (error) {
      console.error("Rate limiter error:", error.message);
      // If Redis fails, let the request through
      next();
    }
  };
};

// Strict limiter for attendance marking - anti-DDoS
const attendanceRateLimiter = redisRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  keyPrefix: "rl:attendance",
  message: "Too many attendance requests. Please wait before trying again.",
});

// Per-device protection for fingerprint-based endpoints
const deviceRateLimiter = redisRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyPrefix: "rl:device",
  message: "Too many device verification requests. Please wait.",
});

// General API limiter
const apiRateLimiter = redisRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyPrefix: "rl:api",
  message: "Too many requests. Please slow down.",
});

// Auth limiter - prevent brute force
const authRateLimiter = redisRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  keyPrefix: "rl:auth",
  message: "Too many login attempts. Please try again after 15 minutes.",
});

module.exports = {
  redisRateLimiter,
  attendanceRateLimiter,
  deviceRateLimiter,
  apiRateLimiter,
  authRateLimiter,
};
