const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testAPI() {
  console.log('🧪 Testing Station API Endpoints\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Search stations
    console.log('\n1️⃣  Testing GET /api/stations/search?q=Delhi');
    const searchRes = await axios.get(`${BASE_URL}/stations/search`, {
      params: { q: 'Delhi' }
    });
    console.log('✅ Status:', searchRes.status);
    console.log('✅ Message:', searchRes.data.message);
    console.log('✅ Total Results:', searchRes.data.data.total_results);
    if (searchRes.data.data.stations.length > 0) {
      const station = searchRes.data.data.stations[0];
      console.log('✅ First Station:', station.name);
      console.log('✅ District:', station.district);
      console.log('✅ Price:', station.price);
      console.log('✅ Available:', station.available);
    }

    // Test 2: Get nearest station
    console.log('\n2️⃣  Testing GET /api/stations/nearest?latitude=28.6139&longitude=77.2090');
    const nearestRes = await axios.get(`${BASE_URL}/stations/nearest`, {
      params: { latitude: 28.6139, longitude: 77.2090 }
    });
    console.log('✅ Status:', nearestRes.status);
    console.log('✅ Message:', nearestRes.data.message);
    console.log('✅ Station:', nearestRes.data.data.station.name);
    console.log('✅ Distance:', nearestRes.data.data.station.distance_km, 'km');
    console.log('✅ Price:', nearestRes.data.data.station.price);
    console.log('✅ Available:', nearestRes.data.data.station.available);

    // Test 3: Get all nearby stations
    console.log('\n3️⃣  Testing GET /api/stations/all-nearby?latitude=28.6139&longitude=77.2090&radius_km=10');
    const allNearbyRes = await axios.get(`${BASE_URL}/stations/all-nearby`, {
      params: { latitude: 28.6139, longitude: 77.2090, radius_km: 10 }
    });
    console.log('✅ Status:', allNearbyRes.status);
    console.log('✅ Message:', allNearbyRes.data.message);
    console.log('✅ Total Stations:', allNearbyRes.data.data.total_stations);
    console.log('✅ Available:', allNearbyRes.data.data.available);

    // Test 4: Get specific station details
    console.log('\n4️⃣  Testing GET /api/stations/1');
    const detailsRes = await axios.get(`${BASE_URL}/stations/1`);
    console.log('✅ Status:', detailsRes.status);
    console.log('✅ Station:', detailsRes.data.data.station.name);
    console.log('✅ District:', detailsRes.data.data.station.district);
    console.log('✅ Price:', detailsRes.data.data.station.price);
    console.log('✅ Available:', detailsRes.data.data.station.available);

    // Test 5: Check notifications
    console.log('\n5️⃣  Testing GET /api/notifications/check?latitude=28.6139&longitude=77.2090&radius=10');
    const notifRes = await axios.get(`${BASE_URL}/notifications/check`, {
      params: { latitude: 28.6139, longitude: 77.2090, radius: 10 }
    });
    console.log('✅ Status:', notifRes.status);
    console.log('✅ Message:', notifRes.data.message);
    if (notifRes.data.data.notification) {
      console.log('✅ Should Notify:', notifRes.data.data.notification.should_notify);
      console.log('✅ Title:', notifRes.data.data.notification.title);
      console.log('✅ Total Available:', notifRes.data.data.total_available);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests passed successfully!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

testAPI();
