import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let _redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!_redisConnection) {
    _redisConnection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    _redisConnection.on("connect", () => {
      console.log("[Queue] Redis connected");
    });

    _redisConnection.on("error", (err) => {
      console.error("[Queue] Redis error:", err);
    });
  }

  return _redisConnection;
}

export function closeRedisConnection(): void {
  if (_redisConnection) {
    _redisConnection.disconnect();
    _redisConnection = null;
    console.log("[Queue] Redis disconnected");
  }
}

/**
 * Compatibility export: lazy Redis connection proxy.
 * Allows code that does `import { redisConnection } from "@genmail/queue"`
 * to work the same as calling `getRedisConnection()`.
 */
export const redisConnection = new Proxy({} as Redis, {
  get(_target, prop) {
    const conn = getRedisConnection();
    const value = (conn as any)[prop];
    return typeof value === "function" ? value.bind(conn) : value;
  },
});
