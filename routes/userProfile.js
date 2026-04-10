const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// @route   GET /api/auth/user
// @desc    Get current user profile
// @access  Private (requires authentication)
router.get('/user', authenticateToken, async (req, res) => {
  try {
    // User is already attached to req by authenticateToken middleware
    // Check if user exists
    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.json({
      success: true,
      message: 'User profile retrieved successfully.',
      data: {
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          isActive: req.user.is_active
        }
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user profile.',
      error: error.message
    });
  }
});

module.exports = router;
