// Test API Endpoints
// Run this after starting the server with: npm start

const API_BASE = 'http://localhost:3000/api/auth';

let authToken = '';
let testUser = {
  name: 'Test User',
  email: `test_${Date.now()}@example.com`,
  phone: `9999999999`,
  password: 'TestPass123',
  confirmPassword: 'TestPass123'
};

console.log('🧪 Starting API Tests...\n');

// Helper function for API calls
async function apiCall(method, endpoint, data = null, token = null) {
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();
    
    console.log(`\n${method} ${endpoint}`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    return { response, result };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
}

// Test 1: Signup
async function testSignup() {
  console.log('='.repeat(50));
  console.log('TEST 1: User Signup');
  console.log('='.repeat(50));
  
  const { result } = await apiCall('POST', '/signup', testUser);
  
  if (result && result.success) {
    authToken = result.data.token;
    console.log('Signup successful! Token saved.');
    return true;
  } else {
    console.log('Signup failed!');
    return false;
  }
}

// Test 2: Login
async function testLogin() {
  console.log('\n' + '='.repeat(50));
  console.log('TEST 2: User Login');
  console.log('='.repeat(50));
  
  const { result } = await apiCall('POST', '/login', {
    emailOrPhone: testUser.email,
    password: testUser.password
  });
  
  if (result && result.success) {
    authToken = result.data.token;
    console.log('Login successful! Token updated.');
    return true;
  } else {
    console.log('Login failed!');
    return false;
  }
}

// Test 3: Get Current User (Protected Route)
async function testGetUser() {
  console.log('\n' + '='.repeat(50));
  console.log('TEST 3: Get Current User (Protected Route)');
  console.log('='.repeat(50));
  
  const { result } = await apiCall('GET', '/me', null, authToken);
  
  if (result && result.success) {
    console.log('✅ Protected route accessed successfully!');
    return true;
  } else {
    console.log('❌ Failed to access protected route!');
    return false;
  }
}

// Test 4: Forgot Password
async function testForgotPassword() {
  console.log('\n' + '='.repeat(50));
  console.log('TEST 4: Forgot Password');
  console.log('='.repeat(50));
  
  const { result } = await apiCall('POST', '/forgot-password', {
    emailOrPhone: testUser.email
  });
  
  if (result && result.success) {
    console.log('✅ Password reset requested!');
    if (result.debug_resetToken) {
      console.log(`Reset Token: ${result.debug_resetToken}`);
      return result.debug_resetToken;
    }
    return true;
  } else {
    console.log('❌ Forgot password failed!');
    return false;
  }
}

// Test 5: Reset Password
async function testResetPassword(token) {
  console.log('\n' + '='.repeat(50));
  console.log('TEST 5: Reset Password');
  console.log('='.repeat(50));
  
  const newPassword = 'NewPass456';
  
  const { result } = await apiCall('POST', '/reset-password', {
    token: token,
    newPassword: newPassword,
    confirmPassword: newPassword
  });
  
  if (result && result.success) {
    console.log('✅ Password reset successful!');
    
    // Test login with new password
    console.log('\nTesting login with new password...');
    const loginResult = await apiCall('POST', '/login', {
      emailOrPhone: testUser.email,
      password: newPassword
    });
    
    if (loginResult.result && loginResult.result.success) {
      console.log('✅ New password works!');
      return true;
    }
  } else {
    console.log('❌ Password reset failed!');
    return false;
  }
}

// Test 6: Validation Errors
async function testValidationErrors() {
  console.log('\n' + '='.repeat(50));
  console.log('TEST 6: Validation Errors');
  console.log('='.repeat(50));
  
  // Test invalid signup (missing password)
  const { result } = await apiCall('POST', '/signup', {
    name: 'Test',
    email: 'test@example.com'
  });
  
  if (result && !result.success && result.errors) {
    console.log('✅ Validation errors caught correctly!');
    return true;
  } else {
    console.log('❌ Validation should have failed!');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  try {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const test1 = await testSignup();
    if (!test1) throw new Error('Signup test failed');
    
    const test2 = await testLogin();
    if (!test2) throw new Error('Login test failed');
    
    const test3 = await testGetUser();
    if (!test3) throw new Error('Get user test failed');
    
    const resetToken = await testForgotPassword();
    if (!resetToken) throw new Error('Forgot password test failed');
    
    const test5 = await testResetPassword(resetToken);
    if (!test5) throw new Error('Reset password test failed');
    
    const test6 = await testValidationErrors();
    if (!test6) throw new Error('Validation test failed');
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 ALL TESTS PASSED! 🎉');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
  }
}

// Execute tests
runAllTests();
