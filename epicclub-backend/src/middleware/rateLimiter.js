const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient, isRedisAvailable } = require('../config/redis');
const env = require('../config/env');

/**
 * Creates a rate limiter with optional Redis backing.
 */
const createLimiter = (options) => {
  const store = isRedisAvailable()
    ? new RedisStore({
        sendCommand: async (...args) => {
          const client = getRedisClient();
          if (typeof client.call === 'function') {
            return client.call(...args);
          }
          // Fallback if client is in-memory mock during rate check
          return null;
        },
      })
    : undefined; // Defaults to express-rate-limit memory store

  const isDev = env.NODE_ENV === 'development';

  return rateLimit({
    store,
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    max: isDev ? 10000 : (options.max || 100), // High limit in development to avoid 429 blockages
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable old rate limit headers
    message: {
      success: false,
      message: options.message || 'Too many requests, please slow down.',
    },
    ...options,
  });
};

// General rate limiter for typical REST endpoints
const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000,
  message: 'Too many requests. Please try again after 15 minutes.',
});

// Google login: max 100000 requests per 15 minutes
const googleLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100000,
  keyGenerator: (req) => req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => env.NODE_ENV === 'development',
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

// Token refresh: max 100000 requests per 15 minutes
const tokenRefreshLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100000,
  message: 'Too many token refresh attempts. Please try again after 15 minutes.',
});

// Logout: max 100000 requests per 15 minutes
const logoutLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100000,
  message: 'Too many logout requests. Please try again after 15 minutes.',
});

// Meeting creation: max 100000 per hour
const meetingCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100000,
  keyGenerator: (req) => req.user?.id ?? req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Meeting creation limit reached. Please try again later.',
  },
});

// Dashboard: max 100000 requests per minute
const dashboardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100000,
  keyGenerator: (req) => req.user?.id ?? req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Dashboard request limit reached. Please try again later.',
  },
});

module.exports = {
  apiLimiter,
  googleLoginLimiter,
  tokenRefreshLimiter,
  logoutLimiter,
  meetingCreationLimiter,
  dashboardLimiter,
};

