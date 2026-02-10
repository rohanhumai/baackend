// const Redis = require("ioredis");

// let redisClient;

// const connectRedis = () => {
//   redisClient = new Redis({
//     host: process.env.REDIS_HOST,
//     port: parseInt(process.env.REDIS_PORT),
//     password: process.env.REDIS_PASSWORD || undefined,
//     tls: {
//       rejectUnauthorized: false,
//     },
//     retryDelayOnFailover: 100,
//     maxRetriesPerRequest: 3,
//     lazyConnect: true,
//     connectTimeout: 10000,
//     commandTimeout: 5000,
//   });

//   redisClient
//     .connect()
//     .then(() => {
//       console.log("Redis Cloud Connected ✅");
//     })
//     .catch((err) => {
//       console.error("Redis Cloud Connection Error:", err.message);
//     });

//   redisClient.on("error", (err) => {
//     console.error("Redis Error:", err.message);
//   });

//   redisClient.on("ready", () => {
//     console.log("Redis Ready");
//   });
// };

// const getRedisClient = () => {
//   if (!redisClient) {
//     throw new Error("Redis client not initialized");
//   }
//   return redisClient;
// };

// module.exports = { connectRedis, getRedisClient };
