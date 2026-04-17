const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const { pool } = require('../config/database');

// @route   GET /api/notifications/check
// @desc    Check for nearby stations (Call this from Flutter while traveling)
// @access  Public
router.get('/check', [
  query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  query('radius').optional().isFloat({ min: 0.5, max: 50 }).withMessage('Radius must be 0.5-50 km')
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

    const { latitude, longitude, radius = 5 } = req.query;

    // Find nearby stations from database that are available
    const query = `
      SELECT * FROM (
        SELECT 
          id,
          name,
          address,
          district,
          city,
          latitude,
          longitude,
          price,
          is_open,
          available,
          phone_number,
          (6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians($2)) + 
            sin(radians($1)) * sin(radians(latitude))
          )) AS distance_km
        FROM stations
        WHERE is_active = true
        AND available = true
        AND is_open = true
      ) AS subquery
      WHERE distance_km <= $3
      ORDER BY distance_km ASC
      LIMIT 10
    `;

    const result = await pool.query(query, [latitude, longitude, radius]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'No available stations found in this area',
        data: {
          notification: null,
          nearby_stations: 0,
          searched_radius_km: radius
        }
      });
    }

    const availableStations = result.rows.map(station => {
      const distance = parseFloat(station.distance_km).toFixed(2);
      const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
      
      return {
        id: station.id,
        name: station.name,
        address: station.address,
        district: station.district,
        city: station.city,
        price: parseFloat(station.price) || 0,
        phone: station.phone_number || 'Not available',
        latitude: parseFloat(station.latitude),
        longitude: parseFloat(station.longitude),
        distance_km: distance,
        is_open: station.is_open,
        available: station.available,
        navigation_url: navigationUrl
      };
    });

    // Prepare response
    if (availableStations.length > 0) {
      const nearestStation = availableStations[0];

      res.json({
        success: true,
        message: `Found ${availableStations.length} station(s) available!`,
        data: {
          notification: {
            should_notify: true,
            title: 'Station Nearby!',
            body: `${nearestStation.name} is ${nearestStation.distance_km} km away - Available!`,
            sound: true,
            vibration: true
          },
          nearest_station: nearestStation,
          total_available: availableStations.length,
          all_stations: availableStations,
          searched_radius_km: radius
        }
      });
    } else {
      res.json({
        success: true,
        message: 'No available stations found nearby',
        data: {
          notification: {
            should_notify: false,
            title: null,
            body: null
          },
          nearest_station: null,
          total_available: 0,
          all_stations: [],
          searched_radius_km: radius
        }
      });
    }

  } catch (error) {
    console.error('Check notifications error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while checking for stations',
      error: error.message
    });
  }
});

// Helper function to calculate distance (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * Math.PI / 180;
}

module.exports = router;
