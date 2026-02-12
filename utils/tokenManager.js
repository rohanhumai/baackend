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

  // Consume token — set 1hr cooldown
  async consumeToken(studentId, sessionId, fingerprint) {
    try {
      const redis = getRedisClient();
      const key = `token:cooldown:${studentId}`;
      const data = JSON.stringify({
        sessionId,
        fingerprint,
        usedAt: new Date().toISOString(),
      });
      await redis.setex(key, COOLDOWN_SECONDS, data);
      return true;
    } catch (error) {
      console.error("Token consume error:", error.message);
      return false;
    }
  },

  // Get remaining cooldown
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

  // Get cached session
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

  // Increment attendance count
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

  // Get attendance count
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

  // ============================================
  // DEVICE FINGERPRINT MANAGEMENT
  // ============================================

  // Lock device fingerprint for a student
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

  // Get locked device for student
  async getLockedDevice(studentId) {
    try {
      const redis = getRedisClient();
      const key = `device:lock:${studentId}`;
      return await redis.get(key);
    } catch (error) {
      return null;
    }
  },

  // Verify device fingerprint matches
  async verifyDevice(studentId, fingerprint) {
    try {
      const redis = getRedisClient();
      const key = `device:lock:${studentId}`;
      const locked = await redis.get(key);

      // No device locked yet — first time
      if (!locked) return { valid: true, firstTime: true };

      // Check if fingerprint matches
      if (locked === fingerprint) return { valid: true, firstTime: false };

      // Different device
      return { valid: false, firstTime: false };
    } catch (error) {
      console.error("Device verify error:", error.message);
      return { valid: false, firstTime: false };
    }
  },

  // ============================================
  // SCAN LOCK — Prevent double scan race condition
  // ============================================

  // Acquire scan lock (prevents concurrent scans by same student)
  async acquireScanLock(studentId) {
    try {
      const redis = getRedisClient();
      const key = `scan:lock:${studentId}`;
      // SET NX = set only if not exists, expire in 10 seconds
      const result = await redis.set(key, "1", "EX", 10, "NX");
      return result === "OK";
    } catch (error) {
      return false;
    }
  },

  // Release scan lock
  async releaseScanLock(studentId) {
    try {
      const redis = getRedisClient();
      const key = `scan:lock:${studentId}`;
      await redis.del(key);
      return true;
    } catch (error) {
      return false;
    }
  },

  // ============================================
  // REQUEST DEDUP — Prevent duplicate requests
  // ============================================

  // Check if this exact request was already processed
  async isDuplicateRequest(studentId, sessionCode) {
    try {
      const redis = getRedisClient();
      const key = `dedup:${studentId}:${sessionCode}`;
      const result = await redis.set(key, "1", "EX", 5, "NX");
      return result !== "OK"; // true = duplicate
    } catch (error) {
      return false;
    }
  },
};

module.exports = tokenManager;
