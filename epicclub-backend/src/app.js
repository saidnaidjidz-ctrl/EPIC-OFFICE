// First action: Validate environment variables using Zod
const env = require('./config/env');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const db = require('./config/db');
const redis = require('./config/redis');

// Import Middlewares
const { apiLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/sanitize');

// Import Modules
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const committeesRoutes = require('./modules/committees/committees.routes');
const tasksRoutes = require('./modules/tasks/tasks.routes');
const meetingsRoutes = require('./modules/meetings/meetings.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');

const app = express();

// 1. Secure HTTP headers using Helmet.js
app.use(helmet());

// 2. Strict CORS Configuration (Restrict to specified origins in env)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server or local script requests (null origin)
      const allowedOrigins = [...env.CORS_ALLOWED_ORIGINS];
      if (env.FRONTEND_URL) {
        allowedOrigins.push(env.FRONTEND_URL);
      }
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Blocked by CORS policy: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. Body Parsing Middleware
app.use(express.json({ limit: '10kb' })); // Limit body sizes to prevent DOS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging middleware (logging request metadata and tracing /auth/google)
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  if (req.originalUrl.includes('/auth/google')) {
    console.log('[AUTH] Received request body:', { ...req.body, id_token: req.body.id_token ? 'PRESENT (hidden)' : 'MISSING' });
    console.log('[AUTH] id_token present:', !!req.body.id_token);
  }
  next();
});

// 4. Global Input Sanitization Middleware (Trim strings & escape XSS payloads)
app.use(sanitizeInput);

// 5. Global API Rate Limiting
app.use(apiLimiter);

// 6. Mount Module Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/committees', committeesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 7. System Health Endpoint
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let redisStatus = 'disconnected';

  try {
    const dbTest = await db.pool.query('SELECT 1');
    if (dbTest.rowCount > 0) dbStatus = 'connected';
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  try {
    const redisClient = redis.getRedisClient();
    const testVal = await redisClient.set('health_test', 'ok', 'EX', 5);
    if (testVal === 'OK') redisStatus = 'connected';
  } catch (err) {
    redisStatus = `error: ${err.message}`;
  }

  const overallStatus = dbStatus === 'connected' ? 'healthy' : 'unhealthy';
  const statusCode = overallStatus === 'healthy' ? 200 : 503;

  return res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: redisStatus,
    },
  });
});

// 8. 404 Route Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
});

// 9. Global Error Handling Middleware
app.use((err, req, res, next) => {
  // Capture CORS policy blocks
  if (err.message === 'Blocked by CORS policy') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Origin not permitted by CORS policy.',
    });
  }

  console.error('💥 Unhandled Exception Caught:', {
    message: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  const statusCode = err.statusCode || 500;
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  return res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 10. Server Boot & Database pool test
const PORT = env.PORT || 3000;
const startServer = async () => {
  try {
    // Try DB connection but don't crash if it fails at startup
    try {
      await db.testConnection();
    } catch (dbError) {
      console.warn(`⚠️ Database connection failed at startup: ${dbError.message}`);
      console.warn('⚠️ Server will start anyway. DB-dependent routes may not work until DB is reachable.');
    }

    const server = app.listen(PORT, () => {
      console.log(`🚀 Epic Club Backend listening on port ${PORT} in ${env.NODE_ENV} mode.`);
    });

    // Graceful Shutdown routines for SIGINT/SIGTERM signals
    const shutdown = async (signal) => {
      console.log(`\n📶 Received ${signal}. Starting graceful termination...`);

      server.close(() => {
        console.log('🚪 Express HTTP server stopped.');
      });

      await db.closePool();
      await redis.closeRedis();

      console.log('👋 Graceful shutdown sequence complete. Exiting process.');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to launch backend service:', error.message);
    process.exit(1);
  }
};

// Start the server if executing as primary script
if (require.main === module) {
  startServer();
}

module.exports = app;
