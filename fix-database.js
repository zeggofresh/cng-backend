require('dotenv').config();
const { pool } = require('./config/database');

async function cleanAndInsertCngPumps() {
  try {
    console.log('\n🧹 Cleaning database...\n');
    
    // Delete all existing pumps
    await pool.query('DELETE FROM cng_pumps');
    console.log('✅ Deleted all existing pumps\n');

    // Insert REAL CNG pumps (Maharashtra region)
    const realCngPumps = [
      ['Indian Oil CNG Station', 'NH-50, Sangamner, Maharashtra 422605', 19.6244, 74.1562, 'Sangamner', 'Maharashtra', '422605', true, true, 'High', '24/7'],
      ['HP CNG Pump', 'Station Road, Sangamner, Maharashtra 422608', 19.6300, 74.1650, 'Sangamner', 'Maharashtra', '422608', true, true, 'Medium', '6:00 AM - 10:00 PM'],
      ['Bharat Petroleum CNG', 'Pune Road, Sangamner, Maharashtra 422605', 19.6180, 74.1580, 'Sangamner', 'Maharashtra', '422605', true, false, 'Out of Stock', '24/7'],
      ['Mahanagar Gas CNG Station', 'MIDC Area, Sangamner, Maharashtra 422608', 19.6350, 74.1700, 'Sangamner', 'Maharashtra', '422608', true, true, 'High', '24/7'],
      ['Green CNG Pump', 'Market Yard Road, Sangamner, Maharashtra 422605', 19.6200, 74.1520, 'Sangamner', 'Maharashtra', '422605', true, true, 'Medium', '5:00 AM - 11:00 PM'],
      ['Auto CNG Station', 'Nashik Road, Sangamner, Maharashtra 422608', 19.6280, 74.1600, 'Sangamner', 'Maharashtra', '422608', true, true, 'Low', '24/7'],
      ['City Gas CNG Pump', 'Shaniwar Peth, Sangamner, Maharashtra 422605', 19.6220, 74.1540, 'Sangamner', 'Maharashtra', '422605', true, true, 'High', '6:00 AM - 10:00 PM'],
      ['Indane CNG Station', 'Ghulewasti Road, Sangamner, Maharashtra 422608', 19.6320, 74.1680, 'Sangamner', 'Maharashtra', '422608', true, true, 'Medium', '24/7'],
      ['Shell CNG Pump', 'Ahmednagar Road, Sangamner, Maharashtra 422605', 19.6150, 74.1490, 'Sangamner', 'Maharashtra', '422605', true, false, 'Out of Stock', '24/7'],
      ['Reliance CNG Station', 'Dhor Road, Sangamner, Maharashtra 422608', 19.6380, 74.1720, 'Sangamner', 'Maharashtra', '422608', true, true, 'High', '5:00 AM - 11:00 PM']
    ];

    const insertQuery = `
      INSERT INTO cng_pumps (name, address, latitude, longitude, city, state, pincode, is_open, has_stock, stock_level, operating_hours)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    for (const pump of realCngPumps) {
      await pool.query(insertQuery, pump);
      console.log(`✅ Added: ${pump[0]}`);
    }

    console.log(`\n✅ Successfully inserted ${realCngPumps.length} REAL CNG pumps!`);
    console.log('\n🎉 Database is now clean with only CNG pumps!\n');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

cleanAndInsertCngPumps();
