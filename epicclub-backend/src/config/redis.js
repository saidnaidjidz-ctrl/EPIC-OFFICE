const Redis = require('ioredis');
const env = require('./env');

let redisClient = null;
let isConnected = false;

if (env.REDIS_URL) {
  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('⚠️ Redis offline. Falling back to internal memory stores for rate limiting.');
          return null; // Stop trying to reconnect automatically to allow fallback
        }
        return Math.min(times * 1000, 3000);
      },
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis client connected.');
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis client connection failure:', err.message);
      isConnected = false;
    });
  } catch (err) {
    console.error('❌ Redis client creation failed:', err.message);
  }
} else {
  console.log('ℹ️ Redis URL not specified. Operating rate limiters in fallback Memory Mode.');
}

// In-Memory storage fallback to replicate Redis basic commands in local development
const fallbackStore = new Map();
const fallbackTimeouts = new Map();

const mockRedis = {
  get: async (key) => {
    return fallbackStore.get(key) || null;
  },
  set: async (key, value, mode, duration) => {
    fallbackStore.set(key, value);
    if (fallbackTimeouts.has(key)) {
      clearTimeout(fallbackTimeouts.get(key));
    }
    if (mode === 'EX' && duration) {
      const timeout = setTimeout(() => {
        fallbackStore.delete(key);
        fallbackTimeouts.delete(key);
      }, duration * 1000);
      fallbackTimeouts.set(key, timeout);
    }
    return 'OK';
  },
  del: async (key) => {
    if (fallbackTimeouts.has(key)) {
      clearTimeout(fallbackTimeouts.get(key));
      fallbackTimeouts.delete(key);
    }
    return fallbackStore.delete(key) ? 1 : 0;
  },
  incr: async (key) => {
    const val = Number(fallbackStore.get(key)) || 0;
    const newVal = val + 1;
    fallbackStore.set(key, String(newVal));
    return newVal;
  },
  expire: async (key, seconds) => {
    if (fallbackStore.has(key)) {
      if (fallbackTimeouts.has(key)) {
        clearTimeout(fallbackTimeouts.get(key));
      }
      const timeout = setTimeout(() => {
        fallbackStore.delete(key);
        fallbackTimeouts.delete(key);
      }, seconds * 1000);
      fallbackTimeouts.set(key, timeout);
      return 1;
    }
    return 0;
  },
  quit: async () => {
    for (const timeout of fallbackTimeouts.values()) {
      clearTimeout(timeout);
    }
    fallbackStore.clear();
    fallbackTimeouts.clear();
    return 'OK';
  },
};

/**
 * Get active connection client if online, otherwise mock fallback.
 */
const getRedisClient = () => {
  return isConnected && redisClient ? redisClient : mockRedis;
};

/**
 * Shutdown active connections.
 */
const closeRedis = async () => {
  if (redisClient) {
    console.log('🔌 Closing Redis connection...');
    await redisClient.quit().catch(() => {});
    console.log('🔌 Redis connection closed.');
  }
  await mockRedis.quit();
};

module.exports = {
  getRedisClient,
  closeRedis,
  isRedisAvailable: () => isConnected,
  client: redisClient || mockRedis,
};
