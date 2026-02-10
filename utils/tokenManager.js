const { getRedisClient } = require("../config/redis");

const COOLDOWN_HOURS = parseInt(process.env.TOKEN_COOLDOWN_HOURS) || 1;
const COOLDOWN_SECONDS = COOLDOWN_HOURS * 60 * 60;

const tokenManager = {
  /**
   * Check if student has an available token (hasn't scanned in the last hour)
   */
  async hasAvailableToken(studentId) {
    try {
      const redis = getRedisClient();
      const key = `token:cooldown:${studentId}`;
      const exists = await redis.exists(key);
      return !exists; // Token is available if cooldown doesn't exist
    } catch (error) {
      console.error("Token check error:", error.message);
      return false;
    }
  },

  /**
   * Consume a token - set cooldown for the student
   */
  async consumeToken(studentId, sessionId) {
    try {
      const redis = getRedisClient();
      const key = `token:cooldown:${studentId}`;
      const data = JSON.stringify({
        sessionId,
        usedAt: new Date().toISOString(),
      });

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
      await redis.setex(key, expirySeconds, JSON.stringify(sessionData));
      return true;
    } catch (error) {
      console.error("Session cache error:", error.message);
      return false;
    }
  },

  /**
   * Get cached session from Redis
   */
  async getCachedSession(sessionCode) {
    try {
      const redis = getRedisClient();
      const key = `session:${sessionCode}`;
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Session cache get error:", error.message);
      return null;
    }
  },

  /**
   * Invalidate session cache
   */
  async invalidateSession(sessionCode) {
    try {
      const redis = getRedisClient();
      const key = `session:${sessionCode}`;
      await redis.del(key);
      return true;
    } catch (error) {
      console.error("Session invalidate error:", error.message);
      return false;
    }
  },

  /**
   * Track attendance count in Redis for real-time updates
   */
  async incrementAttendanceCount(sessionId) {
    try {
      const redis = getRedisClient();
      const key = `attendance:count:${sessionId}`;
      const count = await redis.incr(key);
      await redis.expire(key, 86400); // Expire after 24 hours
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
      return parseInt(count) || 0;
    } catch (error) {
      console.error("Attendance count get error:", error.message);
      return 0;
    }
  },
};

module.exports = tokenManager;
