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

    // Search for nearby CNG pumps using Google Maps API
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Google Maps API key not configured'
      });
    }

    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    const placesResponse = await axios.get(placesUrl, {
      params: {
        location: `${latitude},${longitude}`,
        radius: radiusMeters,
        keyword: 'CNG pump station',
        type: 'gas_station',
        key: apiKey
      }
    });

    if (placesResponse.data.status !== 'OK' && placesResponse.data.status !== 'ZERO_RESULTS') {
      return res.status(500).json({
        success: false,
        message: 'Error fetching data from Google Maps',
        error: placesResponse.data.status
      });
    }

    const places = placesResponse.data.results || [];

    if (places.length === 0) {
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

    // Get details for each pump and filter for open ones
    const availablePumps = [];
    
    for (const place of places.slice(0, 10)) { // Check first 10 pumps
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json`;
      const detailsResponse = await axios.get(detailsUrl, {
        params: {
          place_id: place.place_id,
          fields: 'name,opening_hours,formatted_phone_number,formatted_address,geometry,user_rating',
          key: apiKey
        }
      });

      if (detailsResponse.data.status === 'OK') {
        const details = detailsResponse.data.result;
        const isOpen = details.opening_hours?.open_now;

        if (isOpen) {
          const location = place.geometry.location;
          const distance = calculateDistance(
            latitude,
            longitude,
            location.lat,
            location.lng
          );

          availablePumps.push({
            place_id: place.place_id,
            name: details.name || place.name,
            address: details.formatted_address || place.vicinity,
            phone: details.formatted_phone_number || 'Not available',
            latitude: location.lat,
            longitude: location.lng,
            distance_km: distance.toFixed(2),
            rating: details.user_rating || null,
            is_open: true,
            navigation_url: `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`
          });
        }
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
    console.error('Check CNG notifications error:', error.message);
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
