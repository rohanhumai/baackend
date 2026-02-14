const Redis = require("ioredis");
// ioredis library ko import kar rahe hain (Redis server se connect hone ke liye)

let redisClient;
// Redis client ko globally declare kar rahe hain taaki baad me access ho sake

const connectRedis = () => {
  // Function jo Redis connection establish karega

  redisClient = new Redis({
    host: process.env.REDIS_HOST,
    // Redis server ka host (.env file se)

    port: parseInt(process.env.REDIS_PORT),
    // Redis port number (string ko number me convert kar rahe hain using parseInt)

    password: process.env.REDIS_PASSWORD,
    // Redis password (.env se)

    maxRetriesPerRequest: 3,
    // Har request ke liye max 3 retry attempts allow karega agar fail ho jaye

    connectTimeout: 15000,
    // 15 seconds tak wait karega connection ke liye, uske baad timeout

    retryStrategy(times) {
      // Ye function batata hai reconnect ka delay kitna hoga
      // times = kitni baar retry ho chuka hai

      if (times > 5) return null;
      // Agar 5 se zyada retries ho gayi, toh reconnect attempt band kar do

      return Math.min(times * 500, 3000);
      // Retry delay gradually increase karega (500ms * attempts)
      // Lekin max delay 3000ms (3 seconds) tak hi rahega
    },
  });

  redisClient.on("ready", () => {
    console.log("Redis Cloud Connected ✅");
  });
  // Jab Redis successfully connect ho jaye tab ye event trigger hota hai

  redisClient.on("error", (err) => {
    console.error("Redis Error:", err.message);
  });
  // Agar koi connection ya runtime error aaye toh console me print karega
};

const getRedisClient = () => {
  // Redis client ko access karne ke liye helper function

  if (!redisClient) {
    // Agar client initialize hi nahi hua

    throw new Error("Redis client not initialized");
    // Explicit error throw kar rahe hain taaki silent failure na ho
  }

  return redisClient;
  // Initialized client return kar rahe hain
};

module.exports = { connectRedis, getRedisClient };
// Dono functions export kar rahe hain taaki app ke dusre parts me use ho sake
