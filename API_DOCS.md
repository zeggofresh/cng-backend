# CNG Finder Backend - Authentication API

Heavy-duty authentication backend with complete security features.

## 🚀 Features

- ✅ **User Signup** - Register with name, email/phone, password
- ✅ **User Login** - Login with email OR phone + password
- ✅ **Forgot Password** - Request password reset code
- ✅ **Reset Password** - Set new password with verification code
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Password Validation** - Strong password requirements
- ✅ **Input Validation** - Express-validator for all inputs
- ✅ **Security** - Bcrypt password hashing (12 salt rounds)
- ✅ **PostgreSQL Database** - Production-ready database

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your database credentials
```

## 🏃‍♂️ Running the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will start on `http://localhost:3000`

## 📡 API Endpoints

### 1. **POST /api/auth/signup**
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "emailOrPhone": "john@example.com",
  "password": "Pass123",
  "confirmPassword": "Pass123"
}
```

**Note:** The `emailOrPhone` field accepts either an email address OR a phone number (10-15 digits).

**Success Response (201):****
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. **POST /api/auth/login**
Login with email/phone and password.

**Request Body:**
```json
{
  "emailOrPhone": "john@example.com",
  "password": "Pass123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 3. **GET /api/auth/me**
Get current logged-in user (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210"
    }
  }
}
```

---

### 4. **POST /api/auth/forgot-password**
Request a password reset code.

**Request Body:**
```json
{
  "emailOrPhone": "john@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "If an account exists with this email/phone, you will receive a password reset code",
  "debug_resetToken": "123456"
}
```

**Note:** The reset code is returned in the response for testing. In production, it would be sent via SMS/email.

---

### 5. **POST /api/auth/reset-password**
Reset password using the verification code.

**Request Body:**
```json
{
  "token": "123456",
  "newPassword": "NewPass123",
  "confirmPassword": "NewPass123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful. Please login with your new password."
}
```

---

### 6. **POST /api/auth/verify-token**
Verify if a reset token is valid.

**Request Body:**
```json
{
  "token": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token is valid"
}
```

---

## 🔒 Security Features

### Password Requirements
- Minimum 6 characters
- At least one letter (a-z, A-Z)
- At least one number (0-9)

### JWT Token
- Algorithm: HS256
- Expiry: 7 days (configurable)
- Stored in Authorization header as Bearer token

### Password Hashing
- Algorithm: bcrypt
- Salt rounds: 12
- Secure comparison on login

### Input Validation
- Email format validation
- Phone number format (10-15 digits)
- Name length (2-100 characters)
- SQL injection prevention (parameterized queries)

---

## 🗄️ Database Schema

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reset_token VARCHAR(255),
  reset_token_expiry TIMESTAMP
);
```

---

## 📝 Example Usage (Frontend Integration)

### JavaScript/Fetch Example

```javascript
// Signup with Email
const signup = async () => {
  const response = await fetch('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'John Doe',
      emailOrPhone: 'john@example.com',
      password: 'Pass123',
      confirmPassword: 'Pass123'
    })
  });
  const data = await response.json();
  console.log(data);
};

// Signup with Phone
const signupWithPhone = async () => {
  const response = await fetch('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Jane Smith',
      emailOrPhone: '9876543210',
      password: 'Pass123',
      confirmPassword: 'Pass123'
    })
  });
  const data = await response.json();
  console.log(data);
};

// Login
const login = async () => {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailOrPhone: 'john@example.com',
      password: 'Pass123'
    })
  });
  const data = await response.json();
  localStorage.setItem('token', data.data.token);
};

// Protected Route
const getUser = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:3000/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  console.log(data);
};

// Forgot Password
const forgotPassword = async () => {
  const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailOrPhone: 'john@example.com'
    })
  });
  const data = await response.json();
  console.log(data.debug_resetToken); // Get reset code
};

// Reset Password
const resetPassword = async (token, newPassword) => {
  const response = await fetch('http://localhost:3000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: token,
      newPassword: newPassword,
      confirmPassword: newPassword
    })
  });
  const data = await response.json();
  console.log(data);
};
```

---

## ⚠️ Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific error message"
    }
  ]
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials/token)
- `403` - Forbidden (invalid/expired token)
- `404` - Not Found
- `409` - Conflict (user already exists)
- `500` - Internal Server Error

---

## 🎯 Testing with cURL

```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"John Doe\",\"email\":\"john@example.com\",\"phone\":\"9876543210\",\"password\":\"Pass123\",\"confirmPassword\":\"Pass123\"}"

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"emailOrPhone\":\"john@example.com\",\"password\":\"Pass123\"}"

# Forgot Password
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d "{\"emailOrPhone\":\"john@example.com\"}"

# Reset Password
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"123456\",\"newPassword\":\"NewPass123\",\"confirmPassword\":\"NewPass123\"}"
```

---

## 📦 Project Structure

```
cngfinderbackend/
├── config/
│   └── database.js          # Database connection & setup
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── routes/
│   ├── signup.js            # Signup route
│   ├── login.js             # Login route
│   └── forgotPassword.js    # Password reset routes
├── .env                     # Environment variables
├── .env.example             # Environment template
├── .gitignore               # Git ignore file
├── server.js                # Main server file
└── package.json             # Dependencies
```

---

## 🔧 Configuration

Edit `.env` file to configure:

- `PORT` - Server port (default: 3000)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database settings
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRE` - Token expiration time
- `CORS_ORIGIN` - Allowed origins for CORS

---

## 📞 Support

For issues or questions, check the logs in the console for detailed error messages.
