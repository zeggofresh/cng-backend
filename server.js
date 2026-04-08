// Load environment variables FIRST before anything else
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createUsersTable } = require('./config/database');
const { 
  createCngPumpsTable, 
  createUserLocationsTable, 
  createNotificationsTable, 
  insertSampleCngPumps 
} = require('./config/cngDatabase');

// Import routes
const signupRoutes = require('./routes/signup');
const loginRoutes = require('./routes/login');
const forgotPasswordRoutes = require('./routes/forgotPassword');
const userProfileRoutes = require('./routes/userProfile');
const cngSimpleRoutes = require('./routes/cngSimple');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(new Date().toISOString() + ' - ' + req.method + ' ' + req.path);
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CNG Finder Backend API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', signupRoutes);
app.use('/api/auth', loginRoutes);
app.use('/api/auth', forgotPasswordRoutes);
app.use('/api/auth', userProfileRoutes);
app.use('/api/cng', cngSimpleRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Validate environment variables before starting
    if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
      throw new Error(
        'Database configuration missing!\n' +
        'Please set either DATABASE_URL or (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD) environment variables.\n' +
        'Check your deployment platform\'s environment variable settings.'
      );
    }
    
    // Initialize database tables
    console.log('\n🗄️  Initializing database tables...');
    await createUsersTable();
    await createCngPumpsTable();
    await createUserLocationsTable();
    await createNotificationsTable();
    await insertSampleCngPumps();
    console.log('✅ All database tables initialized\n');
    
    // Start listening
    app.listen(PORT, () => {
      console.log('');
      console.log('========================================');
      console.log('   CNG Finder Backend Started!');
      console.log('========================================');
      console.log('Port: ' + PORT);
      console.log('Mode: ' + (process.env.NODE_ENV || 'development'));
      console.log('Time: ' + new Date().toLocaleString());
      console.log('----------------------------------------');
      console.log('Auth Endpoints:');
      console.log('  POST /api/auth/signup');
      console.log('  POST /api/auth/login');
      console.log('  POST /api/auth/forgot-password');
      console.log('  POST /api/auth/reset-password');
      console.log('  GET  /api/auth/user');
      console.log('----------------------------------------');
      console.log('CNG Pump Endpoints (ALL GET - No POST):');
      console.log('  GET  /api/cng/search            - Search CNG pumps by name/city/area');
      console.log('  GET  /api/cng/nearest           - Get nearest CNG pump (lat/long in URL)');
      console.log('  GET  /api/cng/all-nearby        - Get all nearby pumps (lat/long in URL)');
      console.log('  GET  /api/cng/pump/:id          - Get specific pump details');
      console.log('  POST /api/cng/update-stock      - Update pump stock status');
      console.log('========================================');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('\n📝 Troubleshooting steps:');
    console.error('1. Check that environment variables are set in your hosting platform');
    console.error('2. Required: DATABASE_URL or (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD)');
    console.error('3. Current NODE_ENV:', process.env.NODE_ENV || 'not set');
    console.error('4. DATABASE_URL status:', process.env.DATABASE_URL ? '✓ SET' : '✗ NOT SET');
    process.exit(1);
  }
};

startServer();

module.exports = app;
