const Redis = require("ioredis");
require("dotenv").config();

const HOST = process.env.REDIS_HOST;
const PORT = process.env.REDIS_PORT;
const PASS = process.env.REDIS_PASSWORD;

console.log("Testing Redis Connection...");
console.log(`Host: ${HOST}`);
console.log(`Port: ${PORT}`);
console.log(`Password: ${PASS ? "***" + PASS.slice(-4) : "NONE"}`);
console.log("---");

// TEST 1: Without TLS
console.log("\n[TEST 1] Without TLS...");
const client1 = new Redis({
  host: HOST,
  port: parseInt(PORT),
  password: PASS,
  connectTimeout: 10000,
});

client1.on("ready", () => {
  console.log("✅ TEST 1 PASSED - Connected WITHOUT TLS");
  client1.ping().then((r) => {
    console.log("PING:", r);
    client1.set("test_key", "hello_from_attendance_app").then(() => {
      console.log("SET: OK");
      client1.get("test_key").then((val) => {
        console.log("GET:", val);
        client1.del("test_key").then(() => {
          console.log("DEL: OK");
          console.log("\n🎉 Redis is working! Use the NO TLS config.\n");
          process.exit(0);
        });
      });
    });
  });
});

client1.on("error", (err) => {
  console.log("❌ TEST 1 FAILED:", err.message);
  client1.disconnect();

  // TEST 2: With TLS
  console.log("\n[TEST 2] With TLS...");
  const client2 = new Redis({
    host: HOST,
    port: parseInt(PORT),
    password: PASS,
    tls: {
      rejectUnauthorized: false,
      servername: HOST,
    },
    connectTimeout: 10000,
  });

  client2.on("ready", () => {
    console.log("✅ TEST 2 PASSED - Connected WITH TLS");
    client2.ping().then((r) => {
      console.log("PING:", r);
      console.log("\n🎉 Redis needs TLS! Use the TLS config.\n");
      process.exit(0);
    });
  });

  client2.on("error", (err2) => {
    console.log("❌ TEST 2 FAILED:", err2.message);
    client2.disconnect();

    // TEST 3: URL format
    console.log("\n[TEST 3] URL format without TLS...");
    const client3 = new Redis(`redis://:${PASS}@${HOST}:${PORT}`, {
      connectTimeout: 10000,
    });

    client3.on("ready", () => {
      console.log("✅ TEST 3 PASSED - URL format works");
      client3.ping().then((r) => {
        console.log("PING:", r);
        console.log("\n🎉 Use Redis URL format!\n");
        process.exit(0);
      });
    });

    client3.on("error", (err3) => {
      console.log("❌ TEST 3 FAILED:", err3.message);
      client3.disconnect();

      // TEST 4: rediss:// URL (TLS)
      console.log("\n[TEST 4] rediss:// URL format with TLS...");
      const client4 = new Redis(`rediss://:${PASS}@${HOST}:${PORT}`, {
        tls: { rejectUnauthorized: false },
        connectTimeout: 10000,
      });

      client4.on("ready", () => {
        console.log("✅ TEST 4 PASSED - rediss:// URL works");
        client4.ping().then((r) => {
          console.log("PING:", r);
          console.log("\n🎉 Use rediss:// URL format!\n");
          process.exit(0);
        });
      });

      client4.on("error", (err4) => {
        console.log("❌ TEST 4 FAILED:", err4.message);
        console.log("\n💀 ALL TESTS FAILED. Check:");
        console.log("  1. Redis Cloud database is ACTIVE (not paused)");
        console.log("  2. Host/Port/Password are correct");
        console.log("  3. Your IP is not blocked by firewall");
        console.log(
          "  4. Go to Redis Cloud → Database → Configuration → check endpoint\n",
        );
        process.exit(1);
      });
    });
  });
});

// Timeout
setTimeout(() => {
  console.log("\n⏰ Connection timed out after 30 seconds");
  console.log("Check if your Redis Cloud database is active.\n");
  process.exit(1);
}, 30000);
