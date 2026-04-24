import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    redisConnection.on("connect", () => {
      console.log("[Queue] Redis connected");
    });

    redisConnection.on("error", (err) => {
      console.error("[Queue] Redis error:", err);
    });
  }

  return redisConnection;
}

export function closeRedisConnection(): void {
  if (redisConnection) {
    redisConnection.disconnect();
    redisConnection = null;
    console.log("[Queue] Redis disconnected");
  }
}
