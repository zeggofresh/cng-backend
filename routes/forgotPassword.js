const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');

// Validation for forgot password request
const forgotPasswordValidation = [
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
    })
];

// Validation for reset password
const resetPasswordValidation = [
  body('token')
    .notEmpty().withMessage('Reset token is required'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter'),
  
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// @route   POST /api/auth/forgot-password
// @desc    Request password reset token
// @access  Public
router.post('/forgot-password', forgotPasswordValidation, async (req, res) => {
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

    const { emailOrPhone } = req.body;

    // Determine if input is email or phone
    const isEmail = emailOrPhone.includes('@');
    const identifier = isEmail ? emailOrPhone.toLowerCase() : emailOrPhone;
    
    // Find user by email or phone
    const query = isEmail
      ? 'SELECT * FROM users WHERE email = $1 AND is_active = true'
      : 'SELECT * FROM users WHERE phone = $1 AND is_active = true';
    
    const result = await pool.query(query, [identifier]);

    // If user not found, still return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If an account exists with this email or phone, you will receive a password reset code shortly.'
      });
    }

    const user = result.rows[0];

    // Generate reset token (6 digit code)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save token to database
    await pool.query(
      `UPDATE users 
       SET reset_token = $1, reset_token_expiry = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [resetToken, resetTokenExpiry, user.id]
    );

    // In production, send SMS or email with resetToken
    // For now, we'll return it in the response for testing
    console.log('Password reset code for ' + emailOrPhone + ': ' + resetToken);
    
    // TODO: Implement actual SMS/Email sending here
    // Example: await sendSms(user.phone, `Your password reset code is: ${resetToken}`);
    // Example: await sendEmail(user.email, 'Password Reset', `Your reset code: ${resetToken}`);

    res.json({
      success: true,
      message: 'If an account exists with this email or phone, you will receive a password reset code shortly.',
      // Remove this in production - only for testing
      debug_resetToken: resetToken
    });

  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: error.message
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', resetPasswordValidation, async (req, res) => {
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

    const { token, newPassword } = req.body;

    // Verify token exists and is not expired
    const result = await client.query(
      `SELECT id, password_hash, reset_token, reset_token_expiry 
       FROM users 
       WHERE reset_token = $1 
       AND reset_token_expiry > NOW() 
       AND is_active = true`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new one.'
      });
    }

    const user = result.rows[0];

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password and clear reset token
    await client.query(
      `UPDATE users 
       SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    res.json({
      success: true,
      message: 'Password reset successful. Please login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;
