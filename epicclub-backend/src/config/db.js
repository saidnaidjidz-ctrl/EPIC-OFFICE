const { Pool } = require('pg');
const env = require('./env');

const poolConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };

// Create a connection pool to PostgreSQL
const pool = new Pool({
  ...poolConfig,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait when connecting before timing out
});

// Log pool errors on idle clients
pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err.message);
});

/**
 * Execute a query with parameterized inputs (preventing SQL injection).
 * @param {string} text - SQL query template with placeholders ($1, $2, etc.)
 * @param {Array} params - Array of variables corresponding to the placeholders
 * @returns {Promise<import('pg').QueryResult>} Query results
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (env.NODE_ENV === 'development') {
      console.log(`[Database Query] executed in ${duration}ms | rows: ${res.rowCount}`);
    }
    return res;
  } catch (error) {
    console.error('❌ Database Query Error:', {
      query: text,
      params,
      message: error.message,
    });
    throw error;
  }
};

/**
 * Test the database connection pool configuration.
 */
const testConnection = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT NOW()');
    console.log(`✅ Database connection established successfully at ${res.rows[0].now}`);
  } finally {
    client.release();
  }
};

/**
 * Gracefully close the database pool connections.
 */
const closePool = async () => {
  console.log('🔌 Shutting down database pool...');
  await pool.end();
  console.log('🔌 Database pool shut down successfully.');
};

module.exports = {
  query,
  pool,
  testConnection,
  closePool,
};
