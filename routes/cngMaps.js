const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const axios = require('axios');

// @route   GET /api/cng/maps/nearby
// @desc    Find nearby CNG pumps using Google Maps API
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
        message: 'Google Maps API key not configured'
      });
    }

    // Search for CNG stations using Google Places API
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    const placesResponse = await axios.get(placesUrl, {
      params: {
        location: `${latitude},${longitude}`,
        radius: radius,
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
      return res.status(404).json({
        success: false,
        message: 'No CNG pumps found in this area'
      });
    }

    // Get detailed information for each place
    const pumps = await Promise.all(places.map(async (place) => {
      // Get place details
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json`;
      const detailsResponse = await axios.get(detailsUrl, {
        params: {
          place_id: place.place_id,
          fields: 'name,formatted_phone_number,opening_hours,formatted_address,geometry,price_level,user_ratings_total,user_rating',
          key: apiKey
        }
      });

      const details = detailsResponse.data.result || {};
      const location = place.geometry.location;

      // Calculate distance from user location
      const distance = calculateDistance(
        latitude,
        longitude,
        location.lat,
        location.lng
      );

      // Determine stock status (Google doesn't provide real-time stock, so we use opening status)
      const isOpen = details.opening_hours?.open_now ?? null;
      const stockStatus = isOpen === true ? 'Available' : isOpen === false ? 'Out of Stock' : 'Unknown';

      // Generate navigation URL
      const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
      const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;

      return {
        place_id: place.place_id,
        name: details.name || place.name,
        address: details.formatted_address || place.vicinity || 'Address not available',
        phone: details.formatted_phone_number || 'Not available',
        location: {
          latitude: location.lat,
          longitude: location.lng
        },
        distance_km: distance.toFixed(2),
        distance_meters: Math.round(distance * 1000),
        estimated_time: `${(distance * 3).toFixed(0)} mins by car`,
        stock_status: stockStatus,
        is_open: isOpen,
        rating: details.user_rating || null,
        total_ratings: details.user_ratings_total || 0,
        price_level: details.price_level || null,
        navigation: {
          google_maps_dir: navigationUrl,
          google_maps_view: mapsUrl
        }
      };
    }));

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
    console.error('Google Maps CNG search error:', error.message);
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
        message: 'Google Maps API key not configured'
      });
    }

    // Get place details
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json`;
    const detailsResponse = await axios.get(detailsUrl, {
      params: {
        place_id: placeId,
        fields: 'name,formatted_phone_number,opening_hours,formatted_address,geometry,price_level,user_ratings_total,user_rating,website,reviews,photos',
        key: apiKey
      }
    });

    if (detailsResponse.data.status !== 'OK') {
      return res.status(404).json({
        success: false,
        message: 'CNG pump not found',
        error: detailsResponse.data.status
      });
    }

    const place = detailsResponse.data.result;
    const location = place.geometry.location;

    const isOpen = place.opening_hours?.open_now ?? null;
    const stockStatus = isOpen === true ? 'Available' : isOpen === false ? 'Out of Stock' : 'Unknown';

    const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
    const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;

    res.json({
      success: true,
      message: 'CNG pump details retrieved successfully',
      data: {
        pump: {
          place_id: placeId,
          name: place.name,
          address: place.formatted_address || 'Address not available',
          phone: place.formatted_phone_number || 'Not available',
          website: place.website || null,
          location: {
            latitude: location.lat,
            longitude: location.lng
          },
          stock_status: stockStatus,
          is_open: isOpen,
          opening_hours: place.opening_hours?.weekday_text || null,
          rating: place.user_rating || null,
          total_ratings: place.user_ratings_total || 0,
          price_level: place.price_level || null,
          photos: place.photos?.map(photo => 
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${apiKey}`
          ) || [],
          navigation: {
            google_maps_dir: navigationUrl,
            google_maps_view: mapsUrl
          }
        }
      }
    });

  } catch (error) {
    console.error('Google Maps pump details error:', error.message);
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
