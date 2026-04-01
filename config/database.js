const { Pool } = require('pg');

// PostgreSQL connection pool for Neon
// Support both individual parameters and DATABASE_URL
let poolConfig;

if (process.env.DATABASE_URL) {
  // Use connection string (better for production deployments)
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
    requestTimeout: 30000,
    max: 20,
    idleTimeoutMillis: 30000,
  };
} else {
  // Use individual parameters (for local development)
  poolConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
    requestTimeout: 30000,
    max: 20,
    idleTimeoutMillis: 30000,
  };
}

const pool = new Pool(poolConfig);

// Debug logging (optional - can be removed in production)
if (process.env.NODE_ENV === 'development') {
  console.log('DB Host:', process.env.DB_HOST);
  console.log('DB Name:', process.env.DB_NAME);
  console.log('DB User:', process.env.DB_USER);
}

// Validate database configuration
if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  console.error('❌ ERROR: No database configuration found!');
  console.error('Please set either DATABASE_URL or DB_HOST environment variable');
  console.error('Current environment variables:');
  console.error('  DATABASE_URL:', process.env.DATABASE_URL ? '***SET***' : 'NOT SET');
  console.error('  DB_HOST:', process.env.DB_HOST || 'NOT SET');
}

// Test database connection
pool.on('connect', () => {
  console.log('Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

// Create users table if not exists
const createUsersTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE,
      phone VARCHAR(20) UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reset_token VARCHAR(255),
      reset_token_expiry TIMESTAMP,
      CONSTRAINT users_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
    );
    
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
  `;

  try {
    await pool.query(query);
    console.log('Users table created successfully');
  } catch (error) {
    console.error('Error creating users table:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  createUsersTable,
};
