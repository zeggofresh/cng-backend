const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// @route   GET /api/stations/search
// @desc    Search stations by name, district, city, or address
// @access  Public
router.get('/search', [
  query('q').notEmpty().withMessage('Search query is required'),
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

    // Search in name, address, city, district, state
    const searchQuery = `
      SELECT 
        id,
        name,
        address,
        district,
        city,
        state,
        pincode,
        latitude,
        longitude,
        price,
        is_open,
        out_of_stock,
        available,
        phone_number,
        last_updated,
        ts_rank(
          to_tsvector('english', name || ' ' || address || ' ' || city || ' ' || district || ' ' || state),
          plainto_tsquery('english', $1)
        ) AS relevance
      FROM stations
      WHERE is_active = true
      AND (
        name ILIKE $2 OR
        address ILIKE $2 OR
        city ILIKE $2 OR
        district ILIKE $2 OR
        state ILIKE $2 OR
        pincode ILIKE $2
      )
      ORDER BY 
        available DESC,
        is_open DESC,
        relevance DESC,
        name ASC
      LIMIT 20
    `;

    const result = await pool.query(searchQuery, [searchTerm, `%${searchTerm}%`]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No stations found matching "${searchTerm}"`
      });
    }

    const stations = result.rows.map(station => {
      const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
      
      return {
        id: station.id,
        name: station.name,
        address: station.address,
        district: station.district,
        city: station.city,
        state: station.state,
        pincode: station.pincode,
        price: parseFloat(station.price) || 0,
        is_open: station.is_open,
        status: station.is_open ? 'Open' : 'Closed',
        out_of_stock: station.out_of_stock,
        available: station.available,
        availability_message: station.available ? 'Available' : 'Not Available',
        location: {
          latitude: parseFloat(station.latitude),
          longitude: parseFloat(station.longitude)
        },
        phone: station.phone_number || 'Not available',
        navigation_url: navigationUrl,
        maps_link: `https://www.google.com/maps?q=${station.latitude},${station.longitude}`,
        last_updated: station.last_updated
      };
    });

    const availableStations = stations.filter(s => s.available).length;
    const openStations = stations.filter(s => s.is_open).length;

    res.json({
      success: true,
      message: `Found ${stations.length} station(s) matching "${searchTerm}"`,
      data: {
        search_term: searchTerm,
        total_results: stations.length,
        available: availableStations,
        open_now: openStations,
        stations: stations
      }
    });

  } catch (error) {
    console.error('Search stations error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while searching stations.',
      error: error.message
    });
  }
});

// @route   GET /api/stations/nearest
// @desc    Get nearest station with availability and navigation
// @access  Public
router.get('/nearest', [
  query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required')
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

    // Find nearest station with availability
    const query = `
      SELECT 
        id,
        name,
        address,
        district,
        city,
        state,
        pincode,
        latitude,
        longitude,
        price,
        is_open,
        out_of_stock,
        available,
        phone_number,
        last_updated,
        (6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians($2)) + 
          sin(radians($1)) * sin(radians(latitude))
        )) AS distance_km
      FROM stations
      WHERE is_active = true
      ORDER BY distance_km ASC
      LIMIT 1
    `;

    const result = await pool.query(query, [latitude, longitude]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No stations found in your area.'
      });
    }

    const station = result.rows[0];
    const distanceKm = parseFloat(station.distance_km).toFixed(2);
    
    // Generate Google Maps navigation URL
    const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
    
    const statusMessage = station.is_open ? 'Open' : 'Closed';
    const availabilityMessage = station.available ? '✅ Available' : '❌ Not Available';

    res.json({
      success: true,
      message: `Nearest station found ${distanceKm} km away`,
      data: {
        station: {
          id: station.id,
          name: station.name,
          address: station.address,
          district: station.district,
          city: station.city,
          state: station.state,
          price: parseFloat(station.price) || 0,
          distance_km: distanceKm,
          status: statusMessage,
          is_open: station.is_open,
          out_of_stock: station.out_of_stock,
          available: station.available,
          availability_message: availabilityMessage,
          phone: station.phone_number || 'Not available',
          location: {
            latitude: parseFloat(station.latitude),
            longitude: parseFloat(station.longitude)
          },
          navigation: {
            google_maps: navigationUrl,
            directions: `Navigate ${distanceKm} km to ${station.name}`,
            estimated_time: `${(distanceKm * 3).toFixed(0)} mins by car`
          },
          last_updated: station.last_updated
        }
      }
    });

  } catch (error) {
    console.error('Get nearest station error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while finding nearest station.',
      error: error.message
    });
  }
});

// @route   GET /api/stations/all-nearby
// @desc    Get all nearby stations sorted by distance
// @access  Public
router.get('/all-nearby', [
  query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
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

    // Find all nearby stations
    const query = `
      SELECT * FROM (
        SELECT 
          id,
          name,
          address,
          district,
          city,
          state,
          pincode,
          latitude,
          longitude,
          price,
          is_open,
          out_of_stock,
          available,
          phone_number,
          last_updated,
          (6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians($2)) + 
            sin(radians($1)) * sin(radians(latitude))
          )) AS distance_km
        FROM stations
        WHERE is_active = true
      ) AS subquery
      WHERE distance_km <= $3
      ORDER BY 
        available DESC,
        distance_km ASC
    `;

    const result = await pool.query(query, [latitude, longitude, radiusKm]);

    const stations = result.rows.map(station => {
      const distanceKm = parseFloat(station.distance_km).toFixed(2);
      const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
      
      return {
        id: station.id,
        name: station.name,
        address: station.address,
        district: station.district,
        city: station.city,
        state: station.state,
        price: parseFloat(station.price) || 0,
        distance_km: distanceKm,
        is_open: station.is_open,
        status: station.is_open ? 'Open' : 'Closed',
        out_of_stock: station.out_of_stock,
        available: station.available,
        availability_message: station.available ? 'Available' : 'Not Available',
        phone: station.phone_number || 'Not available',
        navigation_url: navigationUrl,
        estimated_time: `${(distanceKm * 3).toFixed(0)} mins`,
        last_updated: station.last_updated
      };
    });

    const availableStations = stations.filter(s => s.available).length;
    const openStations = stations.filter(s => s.is_open).length;

    res.json({
      success: true,
      message: `Found ${stations.length} station(s) within ${radiusKm} km`,
      data: {
        total_stations: stations.length,
        available: availableStations,
        open_now: openStations,
        stations: stations
      }
    });

  } catch (error) {
    console.error('Get all nearby stations error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while finding stations.',
      error: error.message
    });
  }
});

// @route   GET /api/stations/:id
// @desc    Get details of specific station
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const stationId = req.params.id;

    const query = `
      SELECT 
        id,
        name,
        address,
        district,
        city,
        state,
        pincode,
        latitude,
        longitude,
        price,
        is_open,
        out_of_stock,
        available,
        operating_hours,
        phone_number,
        last_updated,
        created_at
      FROM stations
      WHERE id = $1 AND is_active = true
    `;

    const result = await pool.query(query, [stationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Station not found.'
      });
    }

    const station = result.rows[0];
    const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;

    res.json({
      success: true,
      message: 'Station details retrieved successfully.',
      data: {
        station: {
          id: station.id,
          name: station.name,
          address: station.address,
          district: station.district,
          city: station.city,
          state: station.state,
          pincode: station.pincode,
          price: parseFloat(station.price) || 0,
          is_open: station.is_open,
          status: station.is_open ? 'Open' : 'Closed',
          out_of_stock: station.out_of_stock,
          available: station.available,
          availability_message: station.available ? '✅ Available' : '❌ Not Available',
          location: {
            latitude: parseFloat(station.latitude),
            longitude: parseFloat(station.longitude)
          },
          contact: {
            phone: station.phone_number || 'Not available',
            operating_hours: station.operating_hours || '24/7'
          },
          navigation: {
            google_maps: navigationUrl,
            open_in_maps: `https://www.google.com/maps?q=${station.latitude},${station.longitude}`
          },
          last_updated: station.last_updated,
          created_at: station.created_at
        }
      }
    });

  } catch (error) {
    console.error('Get station details error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching station details.',
      error: error.message
    });
  }
});

// @route   POST /api/stations/update-availability
// @desc    Update station availability status (for admin panel)
// @access  Public (or add auth if needed)
router.post('/update-availability', [
  body('station_id').isInt().withMessage('Valid station_id required'),
  body('available').isBoolean().withMessage('available must be true or false'),
  body('out_of_stock').optional().isBoolean().withMessage('out_of_stock must be true or false')
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

    const { station_id, available, out_of_stock = false } = req.body;

    const result = await pool.query(
      `UPDATE stations 
       SET available = $1, out_of_stock = $2, last_updated = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND is_active = true
       RETURNING id, name, available, out_of_stock, last_updated`,
      [available, out_of_stock, station_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Station not found.'
      });
    }

    const station = result.rows[0];

    res.json({
      success: true,
      message: available 
        ? `Status updated: Now available at ${station.name}`
        : `Status updated: Not available at ${station.name}`,
      data: {
        station: {
          id: station.id,
          name: station.name,
          available: station.available,
          out_of_stock: station.out_of_stock,
          last_updated: station.last_updated
        }
      }
    });

  } catch (error) {
    console.error('Update availability error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while updating availability.',
      error: error.message
    });
  }
});

// @route   POST /api/stations/update-price
// @desc    Update station price (for admin panel)
// @access  Public (or add auth if needed)
router.post('/update-price', [
  body('station_id').isInt().withMessage('Valid station_id required'),
  body('price').isFloat({ min: 0 }).withMessage('price must be a positive number')
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

    const { station_id, price } = req.body;

    const result = await pool.query(
      `UPDATE stations 
       SET price = $1, last_updated = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND is_active = true
       RETURNING id, name, price, last_updated`,
      [price, station_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Station not found.'
      });
    }

    const station = result.rows[0];

    res.json({
      success: true,
      message: `Price updated for ${station.name}`,
      data: {
        station: {
          id: station.id,
          name: station.name,
          price: parseFloat(station.price),
          last_updated: station.last_updated
        }
      }
    });

  } catch (error) {
    console.error('Update price error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while updating price.',
      error: error.message
    });
  }
});

module.exports = router;
