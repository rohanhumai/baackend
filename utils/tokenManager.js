// Import function to access initialized Redis client
const { getRedisClient } = require("../config/redis");

// Read cooldown hours from environment variable (default = 1 hour)
const COOLDOWN_HOURS = parseInt(process.env.TOKEN_COOLDOWN_HOURS) || 1;

// Convert cooldown duration to seconds
const COOLDOWN_SECONDS = COOLDOWN_HOURS * 60 * 60;

// Token manager object encapsulating Redis operations
const tokenManager = {
  /**
   * Check if student has an available token
   * (i.e., they have NOT scanned within cooldown period)
   */
  async hasAvailableToken(studentId) {
    try {
      const redis = getRedisClient();

      // Redis key for student's cooldown state
      const key = `token:cooldown:${studentId}`;

      // Check if cooldown key exists
      const exists = await redis.exists(key);

      // Token is available only if cooldown key does NOT exist
      return !exists;
    } catch (error) {
      console.error("Token check error:", error.message);
      return false;
    }
  },

  /**
   * Consume token → start cooldown timer
   */
  async consumeToken(studentId, sessionId) {
    try {
      const redis = getRedisClient();

      const key = `token:cooldown:${studentId}`;

      // Store sessionId + timestamp for reference
      const data = JSON.stringify({
        sessionId,
        usedAt: new Date().toISOString(),
      });

      // SETEX = set value + expiration in seconds
      await redis.setex(key, COOLDOWN_SECONDS, data);

      return true;
    } catch (error) {
      console.error("Token consume error:", error.message);
      return false;
    }
  },

  /**
   * Get remaining cooldown time in seconds
   */
  async getCooldownRemaining(studentId) {
    try {
      const redis = getRedisClient();
      const key = `token:cooldown:${studentId}`;

      // TTL = remaining time to live (seconds)
      const ttl = await redis.ttl(key);

      return ttl > 0 ? ttl : 0;
    } catch (error) {
      console.error("Cooldown check error:", error.message);
      return 0;
    }
  },

  /**
   * Cache active session in Redis
   */
  async cacheSession(sessionCode, sessionData, expirySeconds) {
    try {
      const redis = getRedisClient();

      const key = `session:${sessionCode}`;

      // Store session data with expiration time
      await redis.setex(key, expirySeconds, JSON.stringify(sessionData));

      return true;
    } catch (error) {
      console.error("Session cache error:", error.message);
      return false;
    }
  },

  /**
   * Retrieve cached session from Redis
   */
  async getCachedSession(sessionCode) {
    try {
      const redis = getRedisClient();
      const key = `session:${sessionCode}`;

      const data = await redis.get(key);

      // Parse JSON if exists, otherwise return null
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Session cache get error:", error.message);
      return null;
    }
  },

  /**
   * Invalidate session cache manually
   */
  async invalidateSession(sessionCode) {
    try {
      const redis = getRedisClient();
      const key = `session:${sessionCode}`;

      // Delete session key from Redis
      await redis.del(key);

      return true;
    } catch (error) {
      console.error("Session invalidate error:", error.message);
      return false;
    }
  },

  /**
   * Increment attendance count (real-time counter)
   */
  async incrementAttendanceCount(sessionId) {
    try {
      const redis = getRedisClient();

      const key = `attendance:count:${sessionId}`;

      // Atomic increment
      const count = await redis.incr(key);

      // Ensure counter expires after 24 hours
      await redis.expire(key, 86400);

      return count;
    } catch (error) {
      console.error("Attendance count error:", error.message);
      return 0;
    }
  },

  /**
   * Get attendance count from Redis
   */
  async getAttendanceCount(sessionId) {
    try {
      const redis = getRedisClient();
      const key = `attendance:count:${sessionId}`;

      const count = await redis.get(key);

      // Convert string to number safely
      return parseInt(count) || 0;
    } catch (error) {
      console.error("Attendance count get error:", error.message);
      return 0;
    }
  },
};

// Export token manager
module.exports = tokenManager;
