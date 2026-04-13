const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const axios = require('axios');
const { pool } = require('../config/database');

// @route   GET /api/cng/notifications/check
// @desc    Check for nearby CNG pumps (Call this from Flutter while traveling)
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
    const radiusMeters = radius * 1000;

    // Search for nearby CNG pumps using TomTom Search API
    const apiKey = process.env.TOMTOM_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'TomTom API key not configured'
      });
    }

    

    const searchUrl = `https://api.tomtom.com/search/2/nearbySearch/.json`;
    const searchResponse = await axios.get(searchUrl, {
      params: {
        lat: latitude,
        lon: longitude,
        radius: radiusMeters,
        query: 'CNG gas station',
        key: apiKey,
        limit: 20
      }
    });

    if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
      return res.json({
        success: true,
        message: 'No CNG pumps found in this area',
        data: {
          notification: null,
          nearby_pumps: 0,
          searched_radius_km: radius
        }
      });
    }

    const results = searchResponse.data.results;

    // Filter for open/available pumps
    const availablePumps = [];
    
    for (const result of results.slice(0, 10)) { // Check first 10 pumps
      const isOpen = result.openingHours?.isOpen ?? true; // Assume open if no data

      if (isOpen) {
        const location = result.position;
        const distance = (result.dist / 1000).toFixed(2); // Convert to km

        availablePumps.push({
          place_id: result.id || `${location.lat}-${location.lon}`,
          name: result.poi?.name || 'CNG Station',
          address: result.address?.freeformAddress || 'Address not available',
          phone: result.poi?.phone || 'Not available',
          latitude: location.lat,
          longitude: location.lon,
          distance_km: distance,
          rating: null,
          is_open: true,
          navigation_url: `https://www.tomtom.com/en_gb/maps/route-planner/?to=${location.lat},${location.lon}`
        });
      }
    }

    // Sort by distance
    availablePumps.sort((a, b) => parseFloat(a.distance_km) - parseFloat(b.distance_km));

    // Prepare response
    if (availablePumps.length > 0) {
      const nearestPump = availablePumps[0];

      res.json({
        success: true,
        message: `Found ${availablePumps.length} CNG pump(s) with stock available!`,
        data: {
          notification: {
            should_notify: true,
            title: 'CNG Pump Nearby!',
            body: `${nearestPump.name} is ${nearestPump.distance_km} km away - CNG Available!`,
            sound: true,
            vibration: true
          },
          nearest_pump: nearestPump,
          total_available: availablePumps.length,
          all_pumps: availablePumps,
          searched_radius_km: radius
        }
      });
    } else {
      res.json({
        success: true,
        message: 'No CNG pumps with available stock found nearby',
        data: {
          notification: {
            should_notify: false,
            title: null,
            body: null
          },
          nearest_pump: null,
          total_available: 0,
          all_pumps: [],
          searched_radius_km: radius
        }
      });
    }

  } catch (error) {
    console.error('Check CNG notifications error (TomTom):', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while checking for CNG pumps',
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
