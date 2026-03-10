import Redis from 'ioredis';

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
  if (cached.client) {
    return cached.client;
  }

  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL environment variable is not defined');
  }

  const client = new Redis(url, {
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

// ===== THIS IS THE FIX — lazy getter instead of top-level call =====

function getRedis(): Redis {
  return getRedisClient();
}

export async function redisGet<T>(key: string): Promise<T | null> {
  const value = await getRedis().get(key);
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
    await getRedis().setex(key, ttlSeconds, serialized);
  } else {
    await getRedis().set(key, serialized);
  }
}

export async function redisDel(key: string): Promise<void> {
  await getRedis().del(key);
}

export async function redisDelPattern(pattern: string): Promise<void> {
  const redis = getRedis();
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
  const result = await getRedis().exists(key);
  return result === 1;
}

// For files that import `redis` directly
export { getRedis as getRedisClient };
export default getRedis;