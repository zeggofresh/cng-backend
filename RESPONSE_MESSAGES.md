# API Response Messages - Clean Format

All response messages are now clean and professional without emojis.

## Success Responses

### Signup Success (201)
```json
{
  "success": true,
  "message": "User registered successfully. Welcome!",
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

### Login Success (200)
```json
{
  "success": true,
  "message": "Login successful. Welcome back!",
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

### Forgot Password Request (200)
```json
{
  "success": true,
  "message": "If an account exists with this email or phone, you will receive a password reset code shortly.",
  "debug_resetToken": "123456"
}
```

### Reset Password Success (200)
```json
{
  "success": true,
  "message": "Password reset successful. Please login with your new password."
}
```

### Verify Token Success (200)
```json
{
  "success": true,
  "message": "Token is valid"
}
```

---

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed. Please check the input fields.",
  "errors": [
    {
      "field": "password",
      "message": "Password must be at least 6 characters long"
    },
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### User Already Exists (409)
```json
{
  "success": false,
  "message": "User already exists with this email or phone number. Please login instead."
}
```

### Invalid Credentials - User Not Found (401)
```json
{
  "success": false,
  "message": "Invalid credentials. User not found."
}
```

### Invalid Credentials - Wrong Password (401)
```json
{
  "success": false,
  "message": "Invalid credentials. Wrong password."
}
```

### Invalid/Expired Reset Token (400)
```json
{
  "success": false,
  "message": "Invalid or expired reset token. Please request a new one."
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Server error during registration. Please try again later.",
  "error": "Detailed error message here"
}
```

### No Token Provided (401)
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### Invalid Token (403)
```json
{
  "success": false,
  "message": "Invalid token."
}
```

### Token Expired (403)
```json
{
  "success": false,
  "message": "Token expired."
}
```

### User Not Found or Inactive (401)
```json
{
  "success": false,
  "message": "User not found or inactive."
}
```

---

## Console Logs (Clean Format)

### Server Start
```
========================================
   CNG Finder Backend Started!
========================================
Port: 3000
Mode: development
Time: 4/1/2026, 12:00:00 PM
----------------------------------------
Endpoints:
  POST /api/auth/signup
  POST /api/auth/login
  GET  /api/auth/me
  POST /api/auth/forgot-password
  POST /api/auth/reset-password
  POST /api/auth/verify-token
========================================
```

### Database Connection
```
Database connected successfully
Users table created successfully
```

### Request Logging
```
2026-04-01T12:00:00.000Z - POST /api/auth/signup
2026-04-01T12:00:01.000Z - POST /api/auth/login
```

### Password Reset Code (Development Only)
```
Password reset code for john@example.com: 123456
```

### Errors
```
Unexpected database error: [error details]
Error creating users table: [error details]
Signup error: [error details]
Login error: [error details]
Forgot password error: [error details]
Reset password error: [error details]
Verify token error: [error details]
Server Error: [error stack]
SIGTERM received. Shutting down gracefully...
Uncaught Exception: [error details]
Unhandled Rejection at: [promise] reason: [reason]
```

---

## Message Format Guidelines

All messages follow these principles:

1. **Professional** - No emojis in production responses
2. **Clear** - Direct and easy to understand
3. **Helpful** - Guide users on next steps
4. **Consistent** - Standard format across all endpoints
5. **Secure** - Don't expose sensitive information

### Success Message Pattern
- Registration: "User registered successfully. Welcome!"
- Login: "Login successful. Welcome back!"
- Reset: "Password reset successful. Please login with your new password."

### Error Message Pattern
- Validation: "Validation failed. Please check the input fields."
- Server Errors: "[Operation] error. Please try again later."
- Auth Errors: Specific message about what went wrong

### Development vs Production
- Debug info (like reset tokens) only shown in development
- Generic messages for security-sensitive errors
- Detailed error stack only in development mode
