const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const { pool } = require('../config/database');

// @route   GET /api/cng/maps/nearby
// @desc    Find nearby CNG pumps using Database
// @access  Public
router.get('/nearby', [
  query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required (-90 to 90)'),
  query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required (-180 to 180)'),
  query('radius').optional().isInt({ min: 1, max: 50 }).withMessage('Radius must be 1-50 km')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({ field: err.field, message: err.msg }))
      });
    }

    const latitude = parseFloat(req.query.latitude);
    const longitude = parseFloat(req.query.longitude);
    const radiusKm = parseInt(req.query.radius) || 10; // Default 10km

    // Query database for nearby CNG pumps using Haversine formula
    const queryText = `
      SELECT 
        id,
        name,
        address,
        latitude,
        longitude,
        city,
        state,
        pincode,
        is_open,
        has_stock,
        stock_level,
        operating_hours,
        phone_number,
        last_updated,
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

    const result = await pool.query(queryText, [latitude, longitude, radiusKm]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No CNG pumps found in this area'
      });
    }

    // Transform database results to API format
    const pumps = result.rows.map((pump) => {
      const distanceKm = parseFloat(pump.distance_km);
      
      return {
        id: pump.id,
        name: pump.name,
        address: pump.address,
        phone: pump.phone_number || 'Not available',
        location: {
          latitude: parseFloat(pump.latitude),
          longitude: parseFloat(pump.longitude)
        },
        distance_km: distanceKm.toFixed(2),
        distance_meters: (distanceKm * 1000).toFixed(2),
        estimated_time: `${(distanceKm * 3).toFixed(0)} mins by car`,
        stock_status: pump.has_stock === true ? 'Available' : pump.has_stock === false ? 'Out of Stock' : 'Unknown',
        is_open: pump.is_open,
        rating: null,
        total_ratings: 0,
        price_level: null,
        navigation: {
          google_maps_dir: `https://www.google.com/maps/dir/?api=1&destination=${pump.latitude},${pump.longitude}`,
          google_maps_view: `https://www.google.com/maps/search/?api=1&query=${pump.latitude},${pump.longitude}`
        }
      };
    });

    const availableCount = pumps.filter(p => p.stock_status === 'Available').length;
    const outOfStockCount = pumps.filter(p => p.stock_status === 'Out of Stock').length;

    res.json({
      success: true,
      message: `Found ${pumps.length} CNG pump(s) within ${radiusKm.toFixed(1)} km`,
      data: {
        total_pumps: pumps.length,
        available: availableCount,
        out_of_stock: outOfStockCount,
        unknown_status: pumps.length - availableCount - outOfStockCount,
        search_location: {
          latitude: latitude,
          longitude: longitude,
          radius_km: radiusKm.toFixed(1)
        },
        pumps: pumps
      }
    });

  } catch (error) {
    console.error('Database CNG search error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while searching CNG pumps',
      error: error.message
    });
  }
});

// @route   GET /api/cng/maps/details
// @desc    Get detailed information about a specific CNG pump
// @access  Public
router.get('/details', [
  query('id').notEmpty().withMessage('pump id is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({ field: err.field, message: err.msg }))
      });
    }

    const pumpId = req.query.id;

    // Get pump details from database
    const queryText = `
      SELECT 
        id,
        name,
        address,
        latitude,
        longitude,
        city,
        state,
        pincode,
        is_open,
        has_stock,
        stock_level,
        operating_hours,
        phone_number,
        last_updated
      FROM cng_pumps
      WHERE id = $1 AND is_active = true
    `;

    const result = await pool.query(queryText, [pumpId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'CNG pump not found'
      });
    }

    const pump = result.rows[0];

    res.json({
      success: true,
      message: 'CNG pump details retrieved successfully',
      data: {
        pump: {
          id: pump.id,
          name: pump.name,
          address: pump.address,
          phone: pump.phone_number || 'Not available',
          website: null,
          location: {
            latitude: parseFloat(pump.latitude),
            longitude: parseFloat(pump.longitude)
          },
          stock_status: pump.has_stock === true ? 'Available' : pump.has_stock === false ? 'Out of Stock' : 'Unknown',
          is_open: pump.is_open,
          opening_hours: pump.operating_hours,
          rating: null,
          total_ratings: 0,
          price_level: null,
          photos: [],
          navigation: {
            google_maps_dir: `https://www.google.com/maps/dir/?api=1&destination=${pump.latitude},${pump.longitude}`,
            google_maps_view: `https://www.google.com/maps/search/?api=1&query=${pump.latitude},${pump.longitude}`
          }
        }
      }
    });

  } catch (error) {
    console.error('Database pump details error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pump details',
      error: error.message
    });
  }
});

module.exports = router;
