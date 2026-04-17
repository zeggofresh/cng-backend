require('dotenv').config();
const http = require('http');

const BASE_URL = 'http://localhost:3000';
let authToken = '';
let pumpId = '';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

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
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test the API
async function testAPI() {
  try {
    console.log('\n🧪 Testing Owner App API\n');
    console.log('=' .repeat(50));

    // Step 1: Sign up a new user (pump owner)
    console.log('\n1️⃣  Signing up a new pump owner...');
    const testEmail = `owner${Date.now()}@test.com`;
    const signupResult = await makeRequest('POST', '/api/auth/signup', {
      name: 'Test Pump Owner',
      emailOrPhone: testEmail,
      password: 'Test@1234',
      confirmPassword: 'Test@1234'
    });

    if (signupResult.status === 201 || signupResult.data.success) {
      console.log('✅ Signup successful');
    } else {
      console.log('⚠️  Signup response:', signupResult.data);
    }

    // Step 2: Login to get auth token
    console.log('\n2️⃣  Logging in to get auth token...');
    const loginResult = await makeRequest('POST', '/api/auth/login', {
      emailOrPhone: testEmail,
      password: 'Test@1234'
    });

    if (loginResult.data.success) {
      authToken = loginResult.data.data?.token;
      console.log('✅ Login successful');
      console.log('🔑 Token received:', authToken ? 'Yes' : 'No');
    } else {
      console.log('❌ Login failed:', loginResult.data.message);
      return;
    }

    // Step 3: Register a new CNG pump
    console.log('\n3️⃣  Registering a new CNG pump...');
    const registerResult = await makeRequest('POST', '/api/pump/register', {
      name: 'Andheri CNG Pump',
      lat: 19.1197,
      lng: 72.8468,
      price: 76,
      stock: 'Available',
      pressure: 400,
      crowd: 'Low',
      phone: '9876543210'
    }, authToken);

    if (registerResult.data.success) {
      pumpId = registerResult.data.data.id;
      console.log('✅ Pump registered successfully');
      console.log('📝 Pump ID:', pumpId);
      console.log('📊 Pump Details:', JSON.stringify(registerResult.data.data, null, 2));
    } else {
      console.log('❌ Registration failed:', registerResult.data.message);
      return;
    }

    // Step 4: Get pump details
    console.log('\n4️⃣  Getting pump details...');
    const getPumpResult = await makeRequest('GET', `/api/pump/${pumpId}`);
    
    if (getPumpResult.data.success) {
      console.log('✅ Pump details retrieved');
      console.log('📊 Details:', JSON.stringify(getPumpResult.data.data, null, 2));
    } else {
      console.log('❌ Failed to get pump:', getPumpResult.data.message);
    }

    // Step 5: Update pump (change price, pressure, crowd)
    console.log('\n5️⃣  Updating pump details...');
    const updateResult = await makeRequest('PUT', `/api/pump/${pumpId}`, {
      price: 80,
      stock: 'Available',
      pressure: 300,
      crowd: 'Medium'
    }, authToken);

    if (updateResult.data.success) {
      console.log('✅ Pump updated successfully');
      console.log('📊 Updated Details:', JSON.stringify(updateResult.data.data, null, 2));
    } else {
      console.log('❌ Update failed:', updateResult.data.message);
    }

    // Step 6: Quick stock toggle (Out of Stock)
    console.log('\n6️⃣  Quick stock toggle - Out of Stock...');
    const stockToggle1 = await makeRequest('PATCH', `/api/pump/${pumpId}/status`, {
      stock: 'Out of Stock'
    }, authToken);

    if (stockToggle1.data.success) {
      console.log('✅ Stock updated to Out of Stock');
      console.log('📊 Response:', JSON.stringify(stockToggle1.data.data, null, 2));
    } else {
      console.log('❌ Stock toggle failed:', stockToggle1.data.message);
    }

    // Step 7: Quick stock toggle (Available)
    console.log('\n7️⃣  Quick stock toggle - Available...');
    const stockToggle2 = await makeRequest('PATCH', `/api/pump/${pumpId}/status`, {
      stock: 'Available'
    }, authToken);

    if (stockToggle2.data.success) {
      console.log('✅ Stock updated to Available');
      console.log('📊 Response:', JSON.stringify(stockToggle2.data.data, null, 2));
    } else {
      console.log('❌ Stock toggle failed:', stockToggle2.data.message);
    }

    // Step 8: Get all my pumps
    console.log('\n8️⃣  Getting all my pumps...');
    const myPumpsResult = await makeRequest('GET', '/api/pump/owner/my-pumps', null, authToken);

    if (myPumpsResult.data.success) {
      console.log('✅ Retrieved my pumps');
      console.log('📊 Total pumps:', myPumpsResult.data.count);
      console.log('📊 Pumps:', JSON.stringify(myPumpsResult.data.data, null, 2));
    } else {
      console.log('❌ Failed to get pumps:', myPumpsResult.data.message);
    }

    // Step 9: Get all active pumps (public)
    console.log('\n9️⃣  Getting all active pumps (public)...');
    const allPumpsResult = await makeRequest('GET', '/api/pump/list');

    if (allPumpsResult.data.success) {
      console.log('✅ Retrieved all active pumps');
      console.log('📊 Total active pumps:', allPumpsResult.data.count);
    } else {
      console.log('❌ Failed to get pumps:', allPumpsResult.data.message);
    }

    console.log('\n' + '=' .repeat(50));
    console.log('\n✅ All tests completed successfully!\n');
    console.log('📝 API Documentation: OWNER_APP_API.md\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Full error:', error);
  }
}

// Run tests
testAPI();
