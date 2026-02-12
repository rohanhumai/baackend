const { getRedisClient } = require("../config/redis");

const redisRateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000,
    maxRequests = 30,
    keyPrefix = "rl",
    message = "Too many requests. Please try again later.",
  } = options;

  return async (req, res, next) => {
    try {
      const redis = getRedisClient();
      const identifier =
        req.headers["x-device-fingerprint"] ||
        req.ip ||
        req.connection.remoteAddress;
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
      next();
    }
  };
};

// Strict — attendance marking
const attendanceRateLimiter = redisRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 3,
  keyPrefix: "rl:att",
  message: "Too many scan attempts. Wait 1 minute.",
});

// General API
const apiRateLimiter = redisRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyPrefix: "rl:api",
  message: "Too many requests. Slow down.",
});

// Auth — prevent brute force
const authRateLimiter = redisRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: "rl:auth",
  message: "Too many login attempts. Wait 15 minutes.",
});

// Device check rate limiter
const deviceRateLimiter = redisRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  keyPrefix: "rl:device",
  message: "Too many device verification attempts.",
});

module.exports = {
  redisRateLimiter,
  attendanceRateLimiter,
  apiRateLimiter,
  authRateLimiter,
  deviceRateLimiter,
};
