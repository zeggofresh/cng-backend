const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');

// Validation rules for login
const loginValidation = [
  body('emailOrPhone')
    .notEmpty().withMessage('Email or phone is required')
    .custom((value) => {
      // Check if it's an email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // Check if it's a phone number (10-15 digits)
      const phoneRegex = /^[0-9]{10,15}$/;
      
      if (!emailRegex.test(value) && !phoneRegex.test(value)) {
        throw new Error('Please provide a valid email address or phone number');
      }
      return true;
    }),
  
  body('password')
    .notEmpty().withMessage('Password is required')
];

// @route   POST /api/auth/login
// @desc    Login user with email/phone and password
// @access  Public
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed. Please check the input fields.',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }

    const { emailOrPhone, password } = req.body;

    // Determine if input is email or phone
    const isEmail = emailOrPhone.includes('@');
    const identifier = isEmail ? emailOrPhone.toLowerCase() : emailOrPhone;
    
    // Find user by email or phone
    const query = isEmail
      ? 'SELECT * FROM users WHERE email = $1 AND is_active = true'
      : 'SELECT * FROM users WHERE phone = $1 AND is_active = true';
    
    const result = await pool.query(query, [identifier]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Wrong password.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Update last login time (optional - you can add last_login column to table)
    await pool.query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    res.json({
      success: true,
      message: 'Login successful. Welcome back!',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again later.',
      error: error.message
    });
  }
});

module.exports = router;
