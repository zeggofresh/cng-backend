// Test CNG Notification API
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Fake device token for testing
const DEVICE_TOKEN = 'test_device_token_' + Date.now();

async function testNotifications() {
  console.log('\n========================================');
  console.log('Testing CNG Notification API');
  console.log('========================================\n');

  try {
    // Test 1: Register device
    console.log('Test 1: Registering device for notifications...');
    const registerResponse = await axios.post(`${BASE_URL}/api/cng/notifications/register`, {
      device_token: DEVICE_TOKEN,
      device_type: 'android',
      notification_radius: 5.0 // 5 km
    });

    console.log('✅ Device registered:', registerResponse.data.message);

    // Test 2: Update location (Delhi coordinates)
    console.log('\n========================================');
    console.log('Test 2: Updating location...');
    console.log('========================================\n');
    
    const TEST_LAT = 28.6139;
    const TEST_LNG = 77.2090;
    console.log(`Location: ${TEST_LAT}, ${TEST_LNG} (Delhi)`);

    const locationResponse = await axios.post(`${BASE_URL}/api/cng/notifications/update-location`, {
      device_token: DEVICE_TOKEN,
      latitude: TEST_LAT,
      longitude: TEST_LNG
    });

    console.log('\n✅ Location updated');
    console.log('Notification sent:', locationResponse.data.notification_sent);
    
    if (locationResponse.data.notification_sent) {
      console.log('\n🎉 CNG Pump Found!');
      console.log('Title:', locationResponse.data.notification.title);
      console.log('Message:', locationResponse.data.notification.body);
      console.log('\nNearest Pump:');
      console.log('  Name:', locationResponse.data.nearest_pump.name);
      console.log('  Distance:', locationResponse.data.nearest_pump.distance_km, 'km');
      console.log('  Phone:', locationResponse.data.nearest_pump.phone);
      console.log('  Address:', locationResponse.data.nearest_pump.address);
    } else {
      console.log('Reason:', locationResponse.data.reason);
    }

    // Test 3: Try again immediately (should be in cooldown)
    console.log('\n========================================');
    console.log('Test 3: Testing cooldown period...');
    console.log('========================================\n');

    const cooldownResponse = await axios.post(`${BASE_URL}/api/cng/notifications/update-location`, {
      device_token: DEVICE_TOKEN,
      latitude: TEST_LAT + 0.001, // Slightly different location
      longitude: TEST_LNG + 0.001
    });

    console.log('Notification sent:', cooldownResponse.data.notification_sent);
    console.log('Reason:', cooldownResponse.data.reason);
    if (cooldownResponse.data.next_notification_in) {
      console.log('Next notification in:', cooldownResponse.data.next_notification_in);
    }

    // Test 4: Get notification history
    console.log('\n========================================');
    console.log('Test 4: Getting notification history...');
    console.log('========================================\n');

    const historyResponse = await axios.get(
      `${BASE_URL}/api/cng/notifications/history?device_token=${DEVICE_TOKEN}&limit=10`
    );

    console.log('Total notifications:', historyResponse.data.data.total);
    if (historyResponse.data.data.notifications.length > 0) {
      console.log('\nRecent notifications:');
      historyResponse.data.data.notifications.forEach((notif, index) => {
        console.log(`${index + 1}. ${notif.message}`);
        console.log(`   Distance: ${notif.distance_km} km`);
        console.log(`   Time: ${new Date(notif.created_at).toLocaleString()}`);
      });
    }

    console.log('\n========================================');
    console.log('✅ All tests completed!');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run tests
testNotifications();
