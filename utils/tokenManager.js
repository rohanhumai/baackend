const { getRedisClient } = require("../config/redis");

const COOLDOWN_HOURS = parseInt(process.env.TOKEN_COOLDOWN_HOURS) || 1;
const COOLDOWN_SECONDS = COOLDOWN_HOURS * 60 * 60;

const tokenManager = {
  // Check if student can scan
  async hasAvailableToken(studentId) {
    try {
      const redis = getRedisClient();
      const key = `token:cooldown:${studentId}`;
      const exists = await redis.exists(key);
      return !exists;
    } catch (error) {
      console.error("Token check error:", error.message);
      return false;
    }
  },

  // Use the token - block for 1 hour
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

  // How many seconds left in cooldown
  async getCooldownRemaining(studentId) {
    try {
      const redis = getRedisClient();
      const key = `token:cooldown:${studentId}`;
      const ttl = await redis.ttl(key);
      return ttl > 0 ? ttl : 0;
    } catch (error) {
      return 0;
    }
  },

  // Cache session in Redis
  async cacheSession(sessionCode, sessionData, expirySeconds) {
    try {
      const redis = getRedisClient();
      const key = `session:${sessionCode}`;
      await redis.setex(key, expirySeconds, JSON.stringify(sessionData));
      return true;
    } catch (error) {
      return false;
    }
  },

  // Get session from Redis
  async getCachedSession(sessionCode) {
    try {
      const redis = getRedisClient();
      const key = `session:${sessionCode}`;
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  },

  // Invalidate session
  async invalidateSession(sessionCode) {
    try {
      const redis = getRedisClient();
      await redis.del(`session:${sessionCode}`);
      return true;
    } catch (error) {
      return false;
    }
  },

  // Count attendance in Redis
  async incrementAttendanceCount(sessionId) {
    try {
      const redis = getRedisClient();
      const key = `attendance:count:${sessionId}`;
      const count = await redis.incr(key);
      await redis.expire(key, 86400);
      return count;
    } catch (error) {
      return 0;
    }
  },

  async getAttendanceCount(sessionId) {
    try {
      const redis = getRedisClient();
      const key = `attendance:count:${sessionId}`;
      const count = await redis.get(key);
      return parseInt(count) || 0;
    } catch (error) {
      return 0;
    }
  },

  async verifyDevice(studentId, fingerprint) {
    try {
      const redis = getRedisClient();
      const key = `device:lock:${studentId}`;
      const lockedFingerprint = await redis.get(key);

      if (!lockedFingerprint) {
        return { firstTime: true, valid: true };
      }

      return {
        firstTime: false,
        valid: lockedFingerprint === fingerprint,
      };
    } catch (error) {
      console.error("Device verify error:", error.message);
      return { firstTime: false, valid: false };
    }
  },

  async lockDevice(studentId, fingerprint) {
    try {
      const redis = getRedisClient();
      const key = `device:lock:${studentId}`;
      await redis.set(key, fingerprint);
      return true;
    } catch (error) {
      console.error("Device lock error:", error.message);
      return false;
    }
  },
};

module.exports = tokenManager;
