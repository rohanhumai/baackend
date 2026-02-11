// Import ioredis library to interact with Redis
const Redis = require("ioredis");

// Variable to store the Redis client instance globally in this file
let redisClient;

// Function to establish Redis connection
const connectRedis = () => {
  // Construct Redis connection URL using environment variables
  // Format: redis://:password@host:port
  const redisUrl = `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

  // Log connection attempt
  console.log(
    `Redis: Connecting to ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}...`,
  );

  // Create new Redis instance with configuration options
  redisClient = new Redis(redisUrl, {
    // Maximum retry attempts per command request
    maxRetriesPerRequest: 3,

    // Maximum time (ms) allowed to establish connection
    connectTimeout: 15000,

    // Maximum time (ms) allowed per command
    commandTimeout: 10000,

    // Custom retry strategy for reconnection attempts
    retryStrategy(times) {
      // If retry attempts exceed 5, stop retrying
      if (times > 5) {
        console.error("Redis: Max retries reached");
        return null; // Returning null stops further retries
      }

      // Retry delay increases linearly but capped at 3000ms
      return Math.min(times * 500, 3000);
    },
  });

  // Event listener triggered when Redis connection is ready
  redisClient.on("ready", () => {
    console.log("Redis Cloud Connected ✅");
  });

  // Event listener triggered when Redis emits an error
  redisClient.on("error", (err) => {
    console.error("Redis Error:", err.message);
  });

  // Send a PING command to verify connection health
  redisClient
    .ping()
    .then((res) => {
      // Log successful PING response (usually "PONG")
      console.log("Redis PING:", res);
    })
    .catch((err) => {
      // If PING fails, log error
      console.error("Redis PING failed:", err.message);

      // Attempt fallback connection using TLS
      console.log("Trying with TLS...");
      tryWithTLS();
    });
};

// Fallback function: try connecting using secure TLS protocol
const tryWithTLS = () => {
  // If a Redis client already exists, disconnect it first
  if (redisClient) {
    redisClient.disconnect();
  }

  // Construct secure Redis URL (rediss:// indicates TLS)
  const redisUrl = `rediss://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

  // Create new Redis instance with TLS configuration
  redisClient = new Redis(redisUrl, {
    tls: {
      // Allow self-signed certificates (useful for some cloud providers)
      rejectUnauthorized: false,

      // Specify server name for TLS handshake
      servername: process.env.REDIS_HOST,
    },

    // Same retry and timeout configurations
    maxRetriesPerRequest: 3,
    connectTimeout: 15000,
    commandTimeout: 10000,

    // Retry strategy for TLS connection attempts
    retryStrategy(times) {
      // Stop retrying after 3 attempts
      if (times > 3) return null;

      // Linear backoff capped at 3000ms
      return Math.min(times * 500, 3000);
    },
  });

  // Event listener for successful TLS connection
  redisClient.on("ready", () => {
    console.log("Redis Cloud Connected (TLS) ✅");
  });

  // Event listener for TLS-specific errors
  redisClient.on("error", (err) => {
    console.error("Redis TLS Error:", err.message);
  });
};

// Function to retrieve the initialized Redis client
const getRedisClient = () => {
  // If client is not initialized, throw error
  if (!redisClient) {
    throw new Error("Redis client not initialized");
  }

  // Return the active Redis client instance
  return redisClient;
};

// Export connection and getter functions
module.exports = { connectRedis, getRedisClient };
