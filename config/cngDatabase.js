const { pool } = require('../config/database');

// Create stations table (simplified)
const createCngPumpsTable = async () => {
  // First create table if not exists
  const createQuery = `
    CREATE TABLE IF NOT EXISTS stations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      district VARCHAR(100),
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(10),
      price DECIMAL(10, 2) DEFAULT 0.00,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Then add new columns if they don't exist
  const alterQuery = `
    ALTER TABLE stations ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;
    ALTER TABLE stations ADD COLUMN IF NOT EXISTS out_of_stock BOOLEAN DEFAULT false;
    ALTER TABLE stations ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT true;
    ALTER TABLE stations ADD COLUMN IF NOT EXISTS operating_hours VARCHAR(100) DEFAULT '24/7';
    ALTER TABLE stations ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
    ALTER TABLE stations ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    
    CREATE INDEX IF NOT EXISTS idx_stations_location ON stations(latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_stations_active ON stations(is_active);
    CREATE INDEX IF NOT EXISTS idx_stations_availability ON stations(available);
  `;

  try {
    console.log('Attempting to create stations table...');
    await pool.query(createQuery);
    await pool.query(alterQuery);
    console.log('stations table created/updated successfully');
  } catch (error) {
    console.error('Error creating stations table:', error.message);
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
      station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
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

// Insert sample station data
const insertSampleCngPumps = async () => {
  const checkQuery = 'SELECT COUNT(*) FROM stations';
  const checkResult = await pool.query(checkQuery);
  
  if (parseInt(checkResult.rows[0].count) > 0) {
    console.log('Stations already exist, skipping sample data');
    return;
  }

  const sampleStations = [
    ['Indraprastha Station', 'Sector 12, Dwarka, New Delhi', 28.5921, 77.0460, 'South West Delhi', 'New Delhi', 'Delhi', '110075', 75.50],
    ['IGL Station', 'Connaught Place, New Delhi', 28.6315, 77.2167, 'Central Delhi', 'New Delhi', 'Delhi', '110001', 76.00],
    ['GAIL Station', 'Karol Bagh, New Delhi', 28.6519, 77.1909, 'Central Delhi', 'New Delhi', 'Delhi', '110005', 75.75],
    ['Auto Station', 'Rohini Sector 7, New Delhi', 28.7041, 77.1025, 'North West Delhi', 'New Delhi', 'Delhi', '110085', 75.25],
    ['Delhi Station', 'Lajpat Nagar, New Delhi', 28.5677, 77.2436, 'South Delhi', 'New Delhi', 'Delhi', '110024', 76.50],
    ['Mahanagar Gas Station', 'Vasant Kunj, New Delhi', 28.5245, 77.1588, 'South West Delhi', 'New Delhi', 'Delhi', '110070', 75.80],
    ['Green Station', 'Saket, New Delhi', 28.5244, 77.2066, 'South Delhi', 'New Delhi', 'Delhi', '110017', 76.20],
    ['City Station', 'Pitampura, New Delhi', 28.6946, 77.1314, 'North West Delhi', 'New Delhi', 'Delhi', '110034', 75.90],
  ];

  const insertQuery = `
    INSERT INTO stations (name, address, latitude, longitude, district, city, state, pincode, price)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `;

  try {
    console.log('Inserting sample station data...');
    for (const station of sampleStations) {
      await pool.query(insertQuery, station);
    }
    console.log(`Inserted ${sampleStations.length} sample stations`);
  } catch (error) {
    console.error('Error inserting sample stations:', error.message);
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
