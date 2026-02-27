import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

interface RedisCache {
  client: Redis | null;
}

declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var redisCache: RedisCache | undefined;
}

const cached: RedisCache = global.redisCache ?? { client: null };

if (!global.redisCache) {
  global.redisCache = cached;
}

function getRedisClient(): Redis {
  if (!REDIS_URL) {
    throw new Error('REDIS_URL environment variable is not defined');
  }

  if (cached.client) {
    return cached.client;
  }

  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 30,
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
    reconnectOnError(err: Error) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  });

  client.on('connect', () => {
    console.info('[Redis] Connected successfully');
  });

  client.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  client.on('close', () => {
    console.info('[Redis] Connection closed');
  });

  cached.client = client;
  return client;
}

const redis = getRedisClient();

export async function redisGet<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

export async function redisSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, serialized);
  } else {
    await redis.set(key, serialized);
  }
}

export async function redisDel(key: string): Promise<void> {
  await redis.del(key);
}

/**
 * Delete all keys matching a glob-style pattern (e.g. "courses:list:*").
 * Uses SCAN to avoid blocking Redis on large keyspaces.
 */
export async function redisDelPattern(pattern: string): Promise<void> {
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}

export async function redisExists(key: string): Promise<boolean> {
  const result = await redis.exists(key);
  return result === 1;
}

export { redis };
export default redis;
