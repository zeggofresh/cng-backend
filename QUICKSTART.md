# 🚀 Quick Start Guide - CNG Finder Backend

## Setup Instructions (5 minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Setup Database (PostgreSQL)

**Option A: Using PostgreSQL locally**
1. Install PostgreSQL from https://www.postgresql.org/download/
2. Create database:
```sql
CREATE DATABASE cngfinder;
```

**Option B: Using cloud PostgreSQL**
- Use services like Supabase, Railway, or Neon for free cloud PostgreSQL

### Step 3: Configure Environment

Edit `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cngfinder
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### Step 4: Start Server

```bash
# Development mode (auto-reload on changes)
npm run dev

# OR Production mode
npm start
```

Server runs on: `http://localhost:3000`

---

## 🧪 Test the API

### Option 1: Automated Tests
```bash
npm test
```

### Option 2: Manual Testing with Postman/Thunder Client

**1. Signup a User**
```
POST http://localhost:3000/api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "Pass123",
  "confirmPassword": "Pass123"
}
```

**2. Login**
```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "emailOrPhone": "john@example.com",
  "password": "Pass123"
}
```

**3. Forgot Password**
```
POST http://localhost:3000/api/auth/forgot-password
Content-Type: application/json

{
  "emailOrPhone": "john@example.com"
}
```

**4. Reset Password**
```
POST http://localhost:3000/api/auth/reset-password
Content-Type: application/json

{
  "token": "123456",
  "newPassword": "NewPass123",
  "confirmPassword": "NewPass123"
}
```

---

## 📱 Frontend Integration Example

### React/Vue/Angular - Any Framework

```javascript
// Save token after login/signup
localStorage.setItem('token', response.data.token);

// Use in API calls
const token = localStorage.getItem('token');
fetch('http://localhost:3000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 🔧 Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED
```
**Solution:** Make sure PostgreSQL is running and credentials in `.env` are correct.

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:** Change PORT in `.env` file or kill the process using port 3000.

### Module Not Found
```
Error: Cannot find module 'express'
```
**Solution:** Run `npm install` again.

---

## 📋 API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/signup` | Register new user | ❌ |
| POST | `/api/auth/login` | Login user | ❌ |
| GET | `/api/auth/me` | Get current user | ✅ |
| POST | `/api/auth/forgot-password` | Request reset code | ❌ |
| POST | `/api/auth/reset-password` | Reset password | ❌ |
| POST | `/api/auth/verify-token` | Verify reset token | ❌ |

---

## 🎯 Next Steps

1. ✅ Backend is ready!
2. 🔨 Integrate with your frontend
3. 📲 Build your CNG finder features
4. 🚀 Deploy to production

---

## 📞 Need Help?

Check `API_DOCS.md` for detailed documentation.

**Server logs show all requests** - Watch the console for debugging info.
