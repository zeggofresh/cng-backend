require('dotenv').config();
const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Test the nearby API
async function testNearbyAPI() {
  try {
    console.log('\n🧪 Testing Nearby Pumps API\n');
    console.log('=' .repeat(50));

    // Test 1: Get pumps near Andheri, Mumbai (with default 10km radius)
    console.log('\n1️⃣  Testing nearby pumps - Andheri, Mumbai (10km radius)...');
    const result1 = await makeRequest('/api/search/nearby?lat=19.1197&lng=72.8468');
    
    if (result1.data.success) {
      console.log('✅ Nearby pumps retrieved successfully');
      console.log('📍 User Location:', result1.data.userLocation);
      console.log('📊 Total pumps found:', result1.data.count);
      if (result1.data.data.length > 0) {
        console.log('\n📝 Nearby Pumps:');
        result1.data.data.forEach((pump, index) => {
          console.log(`\n  ${index + 1}. ${pump.name}`);
          console.log(`     📍 Distance: ${pump.distance} km`);
          console.log(`     💰 Price: ₹${pump.price}`);
          console.log(`     ⚡ Stock: ${pump.stock}`);
          console.log(`     🔧 Pressure: ${pump.pressure}`);
          console.log(`     👥 Crowd: ${pump.crowd}`);
          console.log(`     📞 Phone: ${pump.phone || 'N/A'}`);
        });
      } else {
        console.log('ℹ️  No pumps found in this area');
      }
    } else {
      console.log('❌ Failed:', result1.data.message);
    }

    // Test 2: Get pumps with larger radius (20km)
    console.log('\n\n2️⃣  Testing nearby pumps - 20km radius...');
    const result2 = await makeRequest('/api/search/nearby?lat=19.1197&lng=72.8468&radius=20');
    
    if (result2.data.success) {
      console.log('✅ Nearby pumps retrieved (20km radius)');
      console.log('📊 Total pumps found:', result2.data.count);
    } else {
      console.log('❌ Failed:', result2.data.message);
    }

    // Test 3: Get pumps near Bandra, Mumbai
    console.log('\n\n3️⃣  Testing nearby pumps - Bandra, Mumbai...');
    const result3 = await makeRequest('/api/search/nearby?lat=19.0596&lng=72.8295&radius=15');
    
    if (result3.data.success) {
      console.log('✅ Nearby pumps retrieved (Bandra)');
      console.log('📊 Total pumps found:', result3.data.count);
      if (result3.data.data.length > 0) {
        console.log('\n📝 Nearest Pump:');
        const nearest = result3.data.data[0];
        console.log(`  🏪 ${nearest.name}`);
        console.log(`  📍 Distance: ${nearest.distance} km`);
        console.log(`  💰 Price: ₹${nearest.price}`);
        console.log(`  ⚡ Stock: ${nearest.stock}`);
      }
    } else {
      console.log('❌ Failed:', result3.data.message);
    }

    // Test 4: Missing location parameters (should fail)
    console.log('\n\n4️⃣  Testing without location (should fail)...');
    const result4 = await makeRequest('/api/search/nearby');
    
    if (!result4.data.success) {
      console.log('✅ Correctly rejected - Missing location');
      console.log('📝 Error:', result4.data.message);
    } else {
      console.log('❌ Should have failed but succeeded');
    }

    // Test 5: Get all pumps list
    console.log('\n\n5️⃣  Testing get all pumps list...');
    const result5 = await makeRequest('/api/search/list');
    
    if (result5.data.success) {
      console.log('✅ All pumps retrieved');
      console.log('📊 Total pumps:', result5.data.count);
    } else {
      console.log('❌ Failed:', result5.data.message);
    }

    console.log('\n' + '=' .repeat(50));
    console.log('\n✅ All tests completed!\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
  }
}

// Run tests
testNearbyAPI();
