require('dotenv').config();
const { pool } = require('./config/database');

(async () => {
  try {
    // Check if cng_pumps table exists
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'cng_pumps'"
    );
    console.log('Tables:', res.rows);
    
    // Check columns if table exists
    if (res.rows.length > 0) {
      const res2 = await pool.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cng_pumps' ORDER BY ordinal_position"
      );
      console.log('Columns:', res2.rows);
      
      // Drop the table to recreate it properly
      console.log('\nDropping existing cng_pumps table...');
      await pool.query('DROP TABLE IF EXISTS cng_pumps CASCADE');
      console.log('Table dropped successfully');
    }
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
