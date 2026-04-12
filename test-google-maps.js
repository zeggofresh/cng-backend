// Test Google Maps CNG Finder API
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test coordinates (Delhi, India)
const TEST_LAT = 28.6139;
const TEST_LNG = 77.2090;

async function testGoogleMapsCNG() {
  console.log('\n========================================');
  console.log('Testing Google Maps CNG Finder API');
  console.log('========================================\n');

  try {
    // Test 1: Find nearby CNG pumps
    console.log('Test 1: Finding nearby CNG pumps...');
    console.log(`Location: ${TEST_LAT}, ${TEST_LNG} (Delhi)`);
    
    const nearbyResponse = await axios.get(`${BASE_URL}/api/cng/maps/nearby`, {
      params: {
        latitude: TEST_LAT,
        longitude: TEST_LNG,
        radius: 10000 // 10 km
      }
    });

    console.log('\n✅ Nearby CNG Pumps Response:');
    console.log('Status:', nearbyResponse.data.success);
    console.log('Message:', nearbyResponse.data.message);
    console.log('Total Pumps:', nearbyResponse.data.data.total_pumps);
    console.log('Available:', nearbyResponse.data.data.available);
    console.log('Out of Stock:', nearbyResponse.data.data.out_of_stock);
    console.log('Unknown:', nearbyResponse.data.data.unknown_status);

    if (nearbyResponse.data.data.pumps.length > 0) {
      console.log('\n📍 First 3 Pumps:');
      nearbyResponse.data.data.pumps.slice(0, 3).forEach((pump, index) => {
        console.log(`\n${index + 1}. ${pump.name}`);
        console.log(`   Address: ${pump.address}`);
        console.log(`   Distance: ${pump.distance_km} km`);
        console.log(`   Phone: ${pump.phone}`);
        console.log(`   Stock Status: ${pump.stock_status}`);
        console.log(`   Open: ${pump.is_open !== null ? (pump.is_open ? 'Yes' : 'No') : 'Unknown'}`);
        console.log(`   Rating: ${pump.rating ? pump.rating + '/5' : 'N/A'} (${pump.total_ratings} reviews)`);
        console.log(`   Navigation: ${pump.navigation.google_maps_dir}`);
      });

      // Test 2: Get details of first pump
      const firstPump = nearbyResponse.data.data.pumps[0];
      console.log('\n\n========================================');
      console.log('Test 2: Getting pump details...');
      console.log('========================================\n');
      console.log(`Fetching details for: ${firstPump.name}`);

      const detailsResponse = await axios.get(`${BASE_URL}/api/cng/maps/details`, {
        params: {
          place_id: firstPump.place_id
        }
      });

      console.log('\n✅ Pump Details Response:');
      console.log('Status:', detailsResponse.data.success);
      console.log('Name:', detailsResponse.data.data.pump.name);
      console.log('Address:', detailsResponse.data.data.pump.address);
      console.log('Phone:', detailsResponse.data.data.pump.phone);
      console.log('Website:', detailsResponse.data.data.pump.website || 'N/A');
      console.log('Stock Status:', detailsResponse.data.data.pump.stock_status);
      console.log('Rating:', detailsResponse.data.data.pump.rating || 'N/A');
      console.log('Photos:', detailsResponse.data.data.pump.photos.length);
      console.log('Navigation:', detailsResponse.data.data.pump.navigation.google_maps_dir);

      if (detailsResponse.data.data.pump.opening_hours) {
        console.log('\n🕒 Opening Hours:');
        detailsResponse.data.data.pump.opening_hours.forEach(day => {
          console.log(`   ${day}`);
        });
      }
    }

    console.log('\n========================================');
    console.log('✅ All tests completed successfully!');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run tests
testGoogleMapsCNG();
