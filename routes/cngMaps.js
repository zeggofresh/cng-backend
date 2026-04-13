const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const axios = require('axios');

// @route   GET /api/cng/maps/nearby
// @desc    Find nearby CNG pumps using TomTom API
// @access  Public
router.get('/nearby', [
  query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required (-90 to 90)'),
  query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required (-180 to 180)'),
  query('radius').optional().isInt({ min: 1000, max: 50000 }).withMessage('Radius must be 1000-50000 meters')
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
    const radius = parseInt(req.query.radius) || 10000; // Default 10km in meters

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'TomTom API key not configured'
      });
    }

    // Search for CNG stations using TomTom Search API
    const searchUrl = `https://api.tomtom.com/search/2/nearbySearch/.json`;
    const searchResponse = await axios.get(searchUrl, {
      params: {
        lat: latitude,
        lon: longitude,
        radius: radius,
        query: 'CNG gas station',
        key: apiKey,
        limit: 50
      }
    });

    if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No CNG pumps found in this area'
      });
    }

    const results = searchResponse.data.results;

    // Transform TomTom results to our format
    const pumps = results.map((result) => {

      const location = result.position;
      const distance = result.dist / 1000; // Convert meters to km

      // Determine stock status based on opening hours
      const isOpen = result.openingHours?.isOpen ?? null;
      const stockStatus = isOpen === true ? 'Available' : isOpen === false ? 'Out of Stock' : 'Unknown';

      // Generate navigation URL using TomTom Routing API
      const navigationUrl = `https://www.tomtom.com/en_gb/maps/route-planner/?from=${latitude},${longitude}&to=${location.lat},${location.lon}`;
      const mapsUrl = `https://www.tomtom.com/en_gb/maps/place/${result.poi.name}/${location.lat},${location.lon}`;

      return {
        place_id: result.id || `${location.lat}-${location.lon}`,
        name: result.poi?.name || 'CNG Station',
        address: result.address?.freeformAddress || result.address?.street || 'Address not available',
        phone: result.poi?.phone || 'Not available',
        location: {
          latitude: location.lat,
          longitude: location.lon
        },
        distance_km: distance.toFixed(2),
        distance_meters: result.dist,
        estimated_time: `${(distance * 3).toFixed(0)} mins by car`,
        stock_status: stockStatus,
        is_open: isOpen,
        rating: null,
        total_ratings: 0,
        price_level: null,
        navigation: {
          tomtom_dir: navigationUrl,
          tomtom_view: mapsUrl
        }
      };
    });

    // Sort by distance
    pumps.sort((a, b) => parseFloat(a.distance_km) - parseFloat(b.distance_km));

    const availableCount = pumps.filter(p => p.stock_status === 'Available').length;
    const outOfStockCount = pumps.filter(p => p.stock_status === 'Out of Stock').length;

    res.json({
      success: true,
      message: `Found ${pumps.length} CNG pump(s) within ${(radius / 1000).toFixed(1)} km`,
      data: {
        total_pumps: pumps.length,
        available: availableCount,
        out_of_stock: outOfStockCount,
        unknown_status: pumps.length - availableCount - outOfStockCount,
        search_location: {
          latitude: latitude,
          longitude: longitude,
          radius_km: (radius / 1000).toFixed(1)
        },
        pumps: pumps
      }
    });

  } catch (error) {
    console.error('TomTom CNG search error:', error.message);
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
  query('place_id').notEmpty().withMessage('place_id is required')
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

    const placeId = req.query.place_id;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'TomTom API key not configured'
      });
    }

    // Parse place_id to get coordinates (format: lat-lon or use as is)
    let lat, lon;
    const coords = placeId.split('-');
    if (coords.length === 2) {
      lat = parseFloat(coords[0]);
      lon = parseFloat(coords[1]);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid place_id format. Expected: lat-lon'
      });
    }

    // Get detailed info using TomTom Search API
    const detailsUrl = `https://api.tomtom.com/search/2/search/.json`;
    const detailsResponse = await axios.get(detailsUrl, {
      params: {
        query: 'CNG gas station',
        lat: lat,
        lon: lon,
        radius: 100,
        key: apiKey,
        limit: 1
      }
    });

    if (!detailsResponse.data.results || detailsResponse.data.results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'CNG pump not found'
      });
    }

    const result = detailsResponse.data.results[0];
    const location = result.position;

    const isOpen = result.openingHours?.isOpen ?? null;
    const stockStatus = isOpen === true ? 'Available' : isOpen === false ? 'Out of Stock' : 'Unknown';

    const navigationUrl = `https://www.tomtom.com/en_gb/maps/route-planner/?to=${location.lat},${location.lon}`;
    const mapsUrl = `https://www.tomtom.com/en_gb/maps/place/${result.poi.name}/${location.lat},${location.lon}`;

    res.json({
      success: true,
      message: 'CNG pump details retrieved successfully',
      data: {
        pump: {
          place_id: placeId,
          name: result.poi?.name || 'CNG Station',
          address: result.address?.freeformAddress || 'Address not available',
          phone: result.poi?.phone || 'Not available',
          website: null,
          location: {
            latitude: location.lat,
            longitude: location.lon
          },
          stock_status: stockStatus,
          is_open: isOpen,
          opening_hours: result.openingHours?.weekdayText || null,
          rating: null,
          total_ratings: 0,
          price_level: null,
          photos: [],
          navigation: {
            tomtom_dir: navigationUrl,
            tomtom_view: mapsUrl
          }
        }
      }
    });

  } catch (error) {
    console.error('TomTom pump details error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching pump details',
      error: error.message
    });
  }
});

// Helper function to calculate distance between two coordinates (Haversine formula)
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
