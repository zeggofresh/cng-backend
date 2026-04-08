const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// @route   GET /api/cng/search
// @desc    Search CNG pumps by name, city, area, or address
// @access  Public
router.get('/search', [
  query('q').notEmpty().withMessage('Search query is required (name, city, or area)'),
  query('radius_km').optional().isFloat({ min: 0.5, max: 50 }).withMessage('Radius must be 0.5-50 km')
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

    const searchTerm = req.query.q;
    const radiusKm = req.query.radius_km || 50;

    // Search in name, address, city, state
    const searchQuery = `
      SELECT 
        id,
        name,
        address,
        city,
        state,
        pincode,
        latitude,
        longitude,
        is_open,
        has_stock,
        stock_level,
        last_updated,
        ts_rank(
          to_tsvector('english', name || ' ' || address || ' ' || city || ' ' || state),
          plainto_tsquery('english', $1)
        ) AS relevance
      FROM cng_pumps
      WHERE is_active = true
      AND (
        name ILIKE $2 OR
        address ILIKE $2 OR
        city ILIKE $2 OR
        state ILIKE $2 OR
        pincode ILIKE $2
      )
      ORDER BY 
        has_stock DESC,
        is_open DESC,
        relevance DESC,
        name ASC
      LIMIT 20
    `;

    const result = await pool.query(searchQuery, [searchTerm, `%${searchTerm}%`]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No CNG pumps found matching "${searchTerm}"`
      });
    }

    const pumps = result.rows.map(pump => {
      const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${pump.latitude},${pump.longitude}`;
      
      return {
        id: pump.id,
        name: pump.name,
        address: pump.address,
        city: pump.city,
        state: pump.state,
        pincode: pump.pincode,
        is_open: pump.is_open,
        status: pump.is_open ? '🟢 Open' : '🔴 Closed',
        has_stock: pump.has_stock,
        stock_level: pump.stock_level || 'Unknown',
        stock_message: pump.has_stock ? `✅ Available (${pump.stock_level || 'Good'})` : '❌ Not Available',
        location: {
          latitude: parseFloat(pump.latitude),
          longitude: parseFloat(pump.longitude)
        },
        navigation_url: navigationUrl,
        maps_link: `https://www.google.com/maps?q=${pump.latitude},${pump.longitude}`
      };
    });

    const withStock = pumps.filter(p => p.has_stock).length;
    const openPumps = pumps.filter(p => p.is_open).length;

    res.json({
      success: true,
      message: `Found ${pumps.length} CNG pump(s) matching "${searchTerm}"`,
      data: {
        search_term: searchTerm,
        total_results: pumps.length,
        with_stock: withStock,
        open_now: openPumps,
        pumps: pumps
      }
    });

  } catch (error) {
    console.error('Search CNG pumps error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while searching CNG pumps.',
      error: error.message
    });
  }
});

// @route   GET /api/cng/nearest
// @desc    Get nearest CNG pump with stock status and navigation
// @access  Public (no auth required)
router.get('/nearest', [
  query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required (-90 to 90)'),
  query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required (-180 to 180)')
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

    // Find nearest CNG pump with stock
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
        is_open,
        has_stock,
        stock_level,
        last_updated,
        (6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians($2)) + 
          sin(radians($1)) * sin(radians(latitude))
        )) AS distance_km
      FROM cng_pumps
      WHERE is_active = true
      ORDER BY distance_km ASC
      LIMIT 1
    `;

    const result = await pool.query(query, [latitude, longitude]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No CNG pumps found in your area.'
      });
    }

    const pump = result.rows[0];
    const distanceKm = parseFloat(pump.distance_km).toFixed(2);
    
    // Generate Google Maps navigation URL
    const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${pump.latitude},${pump.longitude}`;
    
    // Generate navigation message
    let stockMessage = '';
    if (pump.has_stock) {
      stockMessage = `✅ CNG Stock Available (${pump.stock_level || 'Good'})`;
    } else {
      stockMessage = '❌ CNG Stock Not Available';
    }

    const statusMessage = pump.is_open ? '🟢 Open' : '🔴 Closed';

    res.json({
      success: true,
      message: `Nearest CNG pump found ${distanceKm} km away`,
      data: {
        pump: {
          id: pump.id,
          name: pump.name,
          address: pump.address,
          distance_km: distanceKm,
          status: statusMessage,
          is_open: pump.is_open,
          stock: {
            available: pump.has_stock,
            level: pump.stock_level || 'Unknown',
            message: stockMessage,
            last_updated: pump.last_updated
          },
          location: {
            latitude: parseFloat(pump.latitude),
            longitude: parseFloat(pump.longitude)
          },
          navigation: {
            google_maps: navigationUrl,
            directions: `Navigate ${distanceKm} km to ${pump.name}`,
            estimated_time: `${(distanceKm * 3).toFixed(0)} mins by car`
          }
        }
      }
    });

  } catch (error) {
    console.error('Get nearest CNG pump error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while finding nearest CNG pump.',
      error: error.message
    });
  }
});

// @route   GET /api/cng/all-nearby
// @desc    Get all nearby CNG pumps sorted by distance with stock
// @access  Public
router.get('/all-nearby', [
  query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required (-90 to 90)'),
  query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required (-180 to 180)'),
  query('radius_km').optional().isFloat({ min: 0.5, max: 50 }).withMessage('Radius must be 0.5-50 km')
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
    const radiusKm = parseFloat(req.query.radius_km) || 10;

    // Find all nearby pumps with stock info
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
        is_open,
        has_stock,
        stock_level,
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
      ORDER BY 
        has_stock DESC,
        distance_km ASC
    `;

    const result = await pool.query(query, [latitude, longitude, radiusKm]);

    const pumps = result.rows.map(pump => {
      const distanceKm = parseFloat(pump.distance_km).toFixed(2);
      const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${pump.latitude},${pump.longitude}`;
      
      return {
        id: pump.id,
        name: pump.name,
        address: pump.address,
        distance_km: distanceKm,
        is_open: pump.is_open,
        status: pump.is_open ? '🟢 Open' : '🔴 Closed',
        has_stock: pump.has_stock,
        stock_level: pump.stock_level || 'Unknown',
        stock_message: pump.has_stock ? `✅ Available (${pump.stock_level || 'Good'})` : '❌ Not Available',
        navigation_url: navigationUrl,
        estimated_time: `${(distanceKm * 3).toFixed(0)} mins`
      };
    });

    const withStock = pumps.filter(p => p.has_stock).length;
    const openPumps = pumps.filter(p => p.is_open).length;

    res.json({
      success: true,
      message: `Found ${pumps.length} CNG pump(s) within ${radiusKm} km`,
      data: {
        total_pumps: pumps.length,
        with_stock: withStock,
        open_now: openPumps,
        pumps: pumps
      }
    });

  } catch (error) {
    console.error('Get all nearby CNG pumps error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while finding CNG pumps.',
      error: error.message
    });
  }
});

// @route   GET /api/cng/pump/:id
// @desc    Get details of specific CNG pump
// @access  Public
router.get('/pump/:id', async (req, res) => {
  try {
    const pumpId = req.params.id;

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
        is_open,
        has_stock,
        stock_level,
        operating_hours,
        phone_number,
        last_updated,
        created_at
      FROM cng_pumps
      WHERE id = $1 AND is_active = true
    `;

    const result = await pool.query(query, [pumpId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'CNG pump not found.'
      });
    }

    const pump = result.rows[0];
    const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${pump.latitude},${pump.longitude}`;

    res.json({
      success: true,
      message: 'CNG pump details retrieved successfully.',
      data: {
        pump: {
          id: pump.id,
          name: pump.name,
          address: pump.address,
          city: pump.city,
          state: pump.state,
          pincode: pump.pincode,
          is_open: pump.is_open,
          status: pump.is_open ? '🟢 Open' : '🔴 Closed',
          stock: {
            available: pump.has_stock,
            level: pump.stock_level || 'Unknown',
            message: pump.has_stock ? '✅ CNG Available' : '❌ CNG Not Available',
            last_updated: pump.last_updated
          },
          location: {
            latitude: parseFloat(pump.latitude),
            longitude: parseFloat(pump.longitude)
          },
          contact: {
            phone: pump.phone_number || 'Not available',
            operating_hours: pump.operating_hours || '24/7'
          },
          navigation: {
            google_maps: navigationUrl,
            open_in_maps: `https://www.google.com/maps?q=${pump.latitude},${pump.longitude}`
          }
        }
      }
    });

  } catch (error) {
    console.error('Get pump details error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pump details.',
      error: error.message
    });
  }
});

// @route   POST /api/cng/update-stock
// @desc    Update CNG pump stock status (for admins or user reports)
// @access  Public
router.post('/update-stock', [
  body('pump_id').isInt().withMessage('Valid pump_id required'),
  body('has_stock').isBoolean().withMessage('has_stock must be true or false'),
  body('stock_level').optional().isIn(['Low', 'Medium', 'High']).withMessage('stock_level must be Low, Medium, or High')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
      });
    }

    const { pump_id, has_stock, stock_level = 'Medium' } = req.body;

    const result = await pool.query(
      `UPDATE cng_pumps 
       SET has_stock = $1, stock_level = $2, last_updated = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND is_active = true
       RETURNING id, name, has_stock, stock_level, last_updated`,
      [has_stock, stock_level, pump_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'CNG pump not found.'
      });
    }

    const pump = result.rows[0];

    res.json({
      success: true,
      message: has_stock 
        ? `Stock updated: CNG now available at ${pump.name}`
        : `Stock updated: CNG not available at ${pump.name}`,
      data: {
        pump: {
          id: pump.id,
          name: pump.name,
          has_stock: pump.has_stock,
          stock_level: pump.stock_level,
          last_updated: pump.last_updated
        }
      }
    });

  } catch (error) {
    console.error('Update stock error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while updating stock.',
      error: error.message
    });
  }
});

module.exports = router;
