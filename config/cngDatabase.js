const { pool } = require('../config/database');

// Create CNG pumps table
const createCngPumpsTable = async () => {
  // First create table if not exists
  const createQuery = `
    CREATE TABLE IF NOT EXISTS cng_pumps (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(10),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Then add new columns if they don't exist
  const alterQuery = `
    ALTER TABLE cng_pumps ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;
    ALTER TABLE cng_pumps ADD COLUMN IF NOT EXISTS has_stock BOOLEAN DEFAULT true;
    ALTER TABLE cng_pumps ADD COLUMN IF NOT EXISTS stock_level VARCHAR(20) DEFAULT 'Medium';
    ALTER TABLE cng_pumps ADD COLUMN IF NOT EXISTS operating_hours VARCHAR(100) DEFAULT '24/7';
    ALTER TABLE cng_pumps ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
    ALTER TABLE cng_pumps ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    
    CREATE INDEX IF NOT EXISTS idx_cng_pumps_location ON cng_pumps(latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_cng_pumps_active ON cng_pumps(is_active);
    CREATE INDEX IF NOT EXISTS idx_cng_pumps_stock ON cng_pumps(has_stock);
  `;

  try {
    console.log('Attempting to create cng_pumps table...');
    await pool.query(createQuery);
    await pool.query(alterQuery);
    console.log('cng_pumps table created/updated successfully');
  } catch (error) {
    console.error('Error creating cng_pumps table:', error.message);
    throw error;
  }
};

// Create user location preferences table
const createUserLocationsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS user_locations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      radius_km INTEGER DEFAULT 5,
      notifications_enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_locations_user ON user_locations(user_id);
  `;

  try {
    console.log('Attempting to create user_locations table...');
    await pool.query(query);
    console.log('user_locations table created successfully');
  } catch (error) {
    console.error('Error creating user_locations table:', error.message);
    throw error;
  }
};

// Create notifications table
const createNotificationsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cng_pump_id INTEGER NOT NULL REFERENCES cng_pumps(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      distance_km DECIMAL(5, 2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
  `;

  try {
    console.log('Attempting to create notifications table...');
    await pool.query(query);
    console.log('notifications table created successfully');
  } catch (error) {
    console.error('Error creating notifications table:', error.message);
    throw error;
  }
};

// Create notification devices table
const createNotificationDevicesTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS notification_devices (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      device_token VARCHAR(500) NOT NULL UNIQUE,
      device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('android', 'ios')),
      notification_radius DECIMAL(5, 2) DEFAULT 5.0,
      is_active BOOLEAN DEFAULT true,
      last_notification_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_notification_devices_token ON notification_devices(device_token);
    CREATE INDEX IF NOT EXISTS idx_notification_devices_user ON notification_devices(user_id);
    CREATE INDEX IF NOT EXISTS idx_notification_devices_active ON notification_devices(is_active);
  `;

  try {
    console.log('Attempting to create notification_devices table...');
    await pool.query(query);
    console.log('notification_devices table created successfully');
  } catch (error) {
    console.error('Error creating notification_devices table:', error.message);
    throw error;
  }
};

// Insert sample CNG pump data
const insertSampleCngPumps = async () => {
  const checkQuery = 'SELECT COUNT(*) FROM cng_pumps';
  const checkResult = await pool.query(checkQuery);
  
  if (parseInt(checkResult.rows[0].count) > 0) {
    console.log('CNG pumps already exist, skipping sample data');
    return;
  }

  const samplePumps = [
    ['Indraprastha CNG Station', 'Sector 12, Dwarka, New Delhi', 28.5921, 77.0460, 'New Delhi', 'Delhi', '110075'],
    ['IGL CNG Pump', 'Connaught Place, New Delhi', 28.6315, 77.2167, 'New Delhi', 'Delhi', '110001'],
    ['GAIL CNG Station', 'Karol Bagh, New Delhi', 28.6519, 77.1909, 'New Delhi', 'Delhi', '110005'],
    ['Auto CNG Pump', 'Rohini Sector 7, New Delhi', 28.7041, 77.1025, 'New Delhi', 'Delhi', '110085'],
    ['Delhi CNG Station', 'Lajpat Nagar, New Delhi', 28.5677, 77.2436, 'New Delhi', 'Delhi', '110024'],
    ['Mahanagar Gas CNG', 'Vasant Kunj, New Delhi', 28.5245, 77.1588, 'New Delhi', 'Delhi', '110070'],
    ['Green CNG Pump', 'Saket, New Delhi', 28.5244, 77.2066, 'New Delhi', 'Delhi', '110017'],
    ['City CNG Station', 'Pitampura, New Delhi', 28.6946, 77.1314, 'New Delhi', 'Delhi', '110034'],
  ];

  const insertQuery = `
    INSERT INTO cng_pumps (name, address, latitude, longitude, city, state, pincode)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;

  try {
    console.log('Inserting sample CNG pump data...');
    for (const pump of samplePumps) {
      await pool.query(insertQuery, pump);
    }
    console.log(`Inserted ${samplePumps.length} sample CNG pumps`);
  } catch (error) {
    console.error('Error inserting sample CNG pumps:', error.message);
    throw error;
  }
};

module.exports = {
  createCngPumpsTable,
  createUserLocationsTable,
  createNotificationsTable,
  createNotificationDevicesTable,
  insertSampleCngPumps,
};
