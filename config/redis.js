const Redis = require("ioredis");

let redisClient;

const connectRedis = () => {
  redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    connectTimeout: 15000,
    retryStrategy(times) {
      if (times > 5) return null;
      return Math.min(times * 500, 3000);
    }
  });

  redisClient.on("ready", () => {
    console.log("Redis Cloud Connected ✅");
  });

  redisClient.on("error", (err) => {
    console.error("Redis Error:", err.message);
  });
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error("Redis client not initialized");
  }
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };