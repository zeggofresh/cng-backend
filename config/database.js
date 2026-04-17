const { Pool } = require('pg');

// PostgreSQL connection pool for Neon
// Support both individual parameters and DATABASE_URL
let poolConfig;

console.log('Checking database configuration...');
console.log('  DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('  DB_HOST present:', !!process.env.DB_HOST);

if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL for database connection');
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
} else if (process.env.DB_HOST) {
  console.log('Using individual DB parameters for database connection');
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
} else {
  console.error('CRITICAL: No database configuration found!');
  console.error('   Please set DATABASE_URL environment variable in your hosting platform');
  throw new Error('Database configuration missing - no DATABASE_URL or DB_HOST found');
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
  console.error('ERROR: No database configuration found!');
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
    console.log('Attempting to create users table...');
    await pool.query(query);
    console.log('Users table created successfully');
  } catch (error) {
    console.error('Error creating users table:', error.message);
    console.error('   SQL State:', error.code);
    console.error('   Detail:', error.detail);
    console.error('   Hint:', error.hint);
    throw error;
  }
};

// Create cng_pumps table if not exists
const createCngPumpsTable = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if users table exists first
    const usersTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    
    if (!usersTableCheck.rows[0].exists) {
      console.log('Users table does not exist yet, skipping cng_pumps table creation');
      await client.query('ROLLBACK');
      return;
    }
    
    const query = `
      CREATE TABLE IF NOT EXISTS cng_pumps (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        lat DECIMAL(10, 8) NOT NULL,
        lng DECIMAL(11, 8) NOT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        stock VARCHAR(50) NOT NULL DEFAULT 'Available',
        pressure INTEGER NOT NULL DEFAULT 200,
        crowd VARCHAR(50) NOT NULL DEFAULT 'Low',
        phone VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_cng_pumps_owner ON cng_pumps(owner_id);
      CREATE INDEX IF NOT EXISTS idx_cng_pumps_location ON cng_pumps(lat, lng);
      CREATE INDEX IF NOT EXISTS idx_cng_pumps_stock ON cng_pumps(stock);
    `;

    console.log('Attempting to create cng_pumps table...');
    await client.query(query);
    await client.query('COMMIT');
    console.log('CNG pumps table created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating cng_pumps table:', error.message);
    console.error('   SQL State:', error.code);
    console.error('   Detail:', error.detail);
    console.error('   Hint:', error.hint);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  createUsersTable,
  createCngPumpsTable,
};
