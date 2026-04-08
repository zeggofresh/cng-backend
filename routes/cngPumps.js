const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// @route   POST /api/cng/nearby
// @desc    Find nearby CNG pumps based on location
// @access  Public
router.post('/nearby', [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required (-90 to 90)'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required (-180 to 180)'),
  body('radius_km').optional().isFloat({ min: 0.5, max: 50 }).withMessage('Radius must be between 0.5 and 50 km')
], async (req, res) => {
  try {
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

    const { latitude, longitude, radius_km = 5 } = req.body;

    // Haversine formula to find nearby pumps
    const query = `
      SELECT 
        id,
        name,
        address,
        latitude,
        longitude,
        city,
        state,
        pincode,
        (6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians($2)) + 
          sin(radians($1)) * sin(radians(latitude))
        )) AS distance_km
      FROM cng_pumps
      WHERE is_active = true
      HAVING (6371 * acos(
        cos(radians($1)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians($2)) + 
        sin(radians($1)) * sin(radians(latitude))
      )) <= $3
      ORDER BY distance_km ASC
    `;

    const result = await pool.query(query, [latitude, longitude, radius_km]);

    res.json({
      success: true,
      message: `Found ${result.rows.length} CNG pump(s) within ${radius_km} km radius.`,
      data: {
        pumps: result.rows,
        total: result.rows.length,
        searchRadius: radius_km,
        yourLocation: {
          latitude,
          longitude
        }
      }
    });

  } catch (error) {
    console.error('Find nearby CNG pumps error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while finding nearby CNG pumps.',
      error: error.message
    });
  }
});

// @route   POST /api/cng/location
// @desc    Save/update user location for notifications
// @access  Private
router.post('/location', authenticateToken, [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required (-90 to 90)'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required (-180 to 180)'),
  body('radius_km').optional().isInt({ min: 1, max: 50 }).withMessage('Radius must be between 1 and 50 km'),
  body('notifications_enabled').optional().isBoolean().withMessage('notifications_enabled must be true or false')
], async (req, res) => {
  const client = await pool.connect();
  
  try {
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

    const { latitude, longitude, radius_km = 5, notifications_enabled = true } = req.body;
    const userId = req.user.id;

    // Upsert user location
    const upsertQuery = `
      INSERT INTO user_locations (user_id, latitude, longitude, radius_km, notifications_enabled, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        latitude = $2,
        longitude = $3,
        radius_km = $4,
        notifications_enabled = $5,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await client.query(upsertQuery, [userId, latitude, longitude, radius_km, notifications_enabled]);

    res.json({
      success: true,
      message: notifications_enabled 
        ? 'Location saved successfully! You will receive notifications for nearby CNG pumps.'
        : 'Location saved. Notifications disabled.',
      data: {
        location: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Save location error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while saving location.',
      error: error.message
    });
  } finally {
    client.release();
  }
});

// @route   GET /api/cng/notifications
// @desc    Get user's CNG pump notifications
// @access  Private
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        n.id,
        n.message,
        n.is_read,
        n.distance_km,
        n.created_at,
        cp.name as pump_name,
        cp.address as pump_address,
        cp.latitude as pump_latitude,
        cp.longitude as pump_longitude
      FROM notifications n
      JOIN cng_pumps cp ON n.cng_pump_id = cp.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      success: true,
      message: `Retrieved ${result.rows.length} notification(s).`,
      data: {
        notifications: result.rows,
        total: result.rows.length,
        unread: result.rows.filter(n => !n.is_read).length
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications.',
      error: error.message
    });
  }
});

// @route   PATCH /api/cng/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read.',
      data: {
        notification: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Mark notification read error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while updating notification.',
      error: error.message
    });
  }
});

// @route   POST /api/cng/check-notifications
// @desc    Check for nearby CNG pumps and create notifications
// @access  Private
router.post('/check-notifications', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;

    // Get user's saved location
    const locationQuery = `
      SELECT * FROM user_locations 
      WHERE user_id = $1 AND notifications_enabled = true
    `;
    const locationResult = await client.query(locationQuery, [userId]);

    if (locationResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No saved location found. Please save your location first using POST /api/cng/location'
      });
    }

    const userLocation = locationResult.rows[0];
    const { latitude, longitude, radius_km } = userLocation;

    // Find nearby pumps
    const pumpsQuery = `
      SELECT 
        id, name, address, latitude, longitude,
        (6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians($2)) + 
          sin(radians($1)) * sin(radians(latitude))
        )) AS distance_km
      FROM cng_pumps
      WHERE is_active = true
      HAVING (6371 * acos(
        cos(radians($1)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians($2)) + 
        sin(radians($1)) * sin(radians(latitude))
      )) <= $3
      ORDER BY distance_km ASC
    `;

    const pumpsResult = await client.query(pumpsQuery, [latitude, longitude, radius_km]);

    // Create notifications for each nearby pump
    const notifications = [];
    for (const pump of pumpsResult.rows) {
      // Check if notification already exists
      const existingNotif = await client.query(
        'SELECT id FROM notifications WHERE user_id = $1 AND cng_pump_id = $2 AND created_at > NOW() - INTERVAL \'1 hour\'',
        [userId, pump.id]
      );

      if (existingNotif.rows.length === 0) {
        const message = `🔔 New CNG Pump Nearby! ${pump.name} is only ${parseFloat(pump.distance_km).toFixed(2)} km away from you.`;
        
        const insertResult = await client.query(
          `INSERT INTO notifications (user_id, cng_pump_id, message, distance_km)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [userId, pump.id, message, pump.distance_km]
        );
        
        notifications.push(insertResult.rows[0]);
      }
    }

    res.json({
      success: true,
      message: `Checked for nearby CNG pumps. Created ${notifications.length} new notification(s).`,
      data: {
        nearbyPumps: pumpsResult.rows.length,
        newNotifications: notifications.length,
        notifications: notifications
      }
    });

  } catch (error) {
    console.error('Check notifications error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while checking for nearby CNG pumps.',
      error: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;
