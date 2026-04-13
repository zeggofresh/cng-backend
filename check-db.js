const { pool } = require('./config/database');

async function checkPumps() {
  try {
    const result = await pool.query('SELECT id, name, address FROM cng_pumps LIMIT 20');
    console.log('\nCNG Pumps in Database:');
    console.log('========================\n');
    result.rows.forEach((pump, index) => {
      console.log(`${index + 1}. ${pump.name}`);
      console.log(`   Address: ${pump.address}\n`);
    });
    console.log(`\nTotal: ${result.rows.length} pumps\n`);
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

checkPumps();
