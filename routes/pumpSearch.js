const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

console.log('✅ pumpSearch routes loaded - /api/pumps');

// Test route
router.get('/test', (req, res) => {
  console.log('Test route hit!');
  res.json({ success: true, message: 'pumpSearch router is working!' });
});

// GET /api/pumps/nearby - Get pumps near user's location
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;

    // Validate location parameters
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude (lat) and Longitude (lng) are required',
        hint: 'Get user location from device GPS and pass as query parameters'
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const searchRadius = parseFloat(radius) || 10; // Default 10 km radius

    // Validate coordinates
    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude values'
      });
    }

    // Haversine formula to calculate distance and filter pumps within radius
    const query = `
      SELECT *,
        (6371 * ACOS(
          COS(RADIANS($1)) * COS(RADIANS(lat)) * 
          COS(RADIANS(lng) - RADIANS($2)) + 
          SIN(RADIANS($1)) * SIN(RADIANS(lat))
        )) AS distance_km
      FROM cng_pumps
      WHERE is_active = true
        AND lat IS NOT NULL
        AND lng IS NOT NULL
      HAVING distance_km <= $3
      ORDER BY distance_km ASC, 
               CASE WHEN stock = 'Available' THEN 0 ELSE 1 END ASC,
               updated_at DESC
    `;

    const result = await pool.query(query, [userLat, userLng, searchRadius]);

    const pumps = result.rows.map(pump => ({
      id: pump.id,
      name: pump.name,
      lat: parseFloat(pump.lat),
      lng: parseFloat(pump.lng),
      price: parseFloat(pump.price),
      stock: pump.stock,
      pressure: pump.pressure,
      crowd: pump.crowd,
      phone: pump.phone,
      distance: parseFloat(pump.distance_km).toFixed(2), // Distance in km
      updatedAt: pump.updated_at
    }));

    res.json({
      success: true,
      count: pumps.length,
      userLocation: {
        lat: userLat,
        lng: userLng,
        radius: searchRadius
      },
      data: pumps
    });
  } catch (error) {
    console.error('Error fetching nearby pumps:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby CNG pumps',
      error: error.message
    });
  }
});

// GET /api/pumps/list - Get all active pumps
router.get('/list', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM cng_pumps WHERE is_active = true ORDER BY updated_at DESC'
    );

    const pumps = result.rows.map(pump => ({
      id: pump.id,
      name: pump.name,
      lat: parseFloat(pump.lat),
      lng: parseFloat(pump.lng),
      price: parseFloat(pump.price),
      stock: pump.stock,
      pressure: pump.pressure,
      crowd: pump.crowd,
      phone: pump.phone,
      updatedAt: pump.updated_at
    }));

    res.json({
      success: true,
      count: pumps.length,
      data: pumps
    });
  } catch (error) {
    console.error('Error fetching all pumps:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CNG pumps',
      error: error.message
    });
  }
});

module.exports = router;
