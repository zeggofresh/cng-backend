const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');

// Validation rules for signup
const signupValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  
  body('emailOrPhone')
    .notEmpty().withMessage('Email or phone number is required')
    .custom((value) => {
      // Check if it's an email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // Check if it's a phone number (10-15 digits)
      const phoneRegex = /^[0-9]{10,15}$/;
      
      if (!emailRegex.test(value) && !phoneRegex.test(value)) {
        throw new Error('Please provide a valid email address or phone number (10-15 digits)');
      }
      return true;
    }),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter'),
  
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', signupValidation, async (req, res) => {
  const client = await pool.connect();
  
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

    const { name, emailOrPhone, password } = req.body;

    // Determine if input is email or phone
    const isEmail = emailOrPhone.includes('@');
    const identifier = isEmail ? emailOrPhone.toLowerCase() : emailOrPhone;

    // Check if user already exists with email or phone
    const existingUser = await client.query(
      'SELECT id, email, phone FROM users WHERE email = $1 OR phone = $2',
      [isEmail ? identifier : null, isEmail ? null : identifier]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email or phone number. Please login instead.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new user - store in appropriate column based on type
    const result = await client.query(
      `INSERT INTO users (name, email, phone, password_hash) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, email, phone, created_at`,
      [name.trim(), isEmail ? identifier : null, isEmail ? null : identifier, passwordHash]
    );

    const newUser = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Welcome!',
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone
        },
        token
      }
    });

  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again later.',
      error: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;
