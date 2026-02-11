const Redis = require("ioredis");

let redisClient;

const connectRedis = () => {
  // Try connecting with Redis URL format
  const redisUrl = `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

  console.log(
    `Redis: Connecting to ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}...`,
  );

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 15000,
    commandTimeout: 10000,
    retryStrategy(times) {
      if (times > 5) {
        console.error("Redis: Max retries reached");
        return null;
      }
      return Math.min(times * 500, 3000);
    },
  });

  redisClient.on("ready", () => {
    console.log("Redis Cloud Connected ✅");
  });

  redisClient.on("error", (err) => {
    console.error("Redis Error:", err.message);
  });

  redisClient
    .ping()
    .then((res) => {
      console.log("Redis PING:", res);
    })
    .catch((err) => {
      console.error("Redis PING failed:", err.message);
      console.log("Trying with TLS...");
      tryWithTLS();
    });
};

// Fallback: try with TLS
const tryWithTLS = () => {
  if (redisClient) {
    redisClient.disconnect();
  }

  const redisUrl = `rediss://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

  redisClient = new Redis(redisUrl, {
    tls: {
      rejectUnauthorized: false,
      servername: process.env.REDIS_HOST,
    },
    maxRetriesPerRequest: 3,
    connectTimeout: 15000,
    commandTimeout: 10000,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 500, 3000);
    },
  });

  redisClient.on("ready", () => {
    console.log("Redis Cloud Connected (TLS) ✅");
  });

  redisClient.on("error", (err) => {
    console.error("Redis TLS Error:", err.message);
  });
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error("Redis client not initialized");
  }
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };
