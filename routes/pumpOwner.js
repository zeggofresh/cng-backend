const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// POST /api/pump/register - Register a new CNG pump (First time data add)
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { name, lat, lng, price, stock, pressure, crowd, phone } = req.body;

    // Validation
    if (!name || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, latitude (lat), and longitude (lng) are required'
      });
    }

    // Validate stock values
    const validStock = ['Available', 'Out of Stock'];
    const stockValue = stock || 'Available';
    if (!validStock.includes(stockValue)) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be either "Available" or "Out of Stock"'
      });
    }

    // Validate pressure values
    const validPressures = [200, 300, 400];
    const pressureValue = pressure ? parseInt(pressure) : 200;
    if (!validPressures.includes(pressureValue)) {
      return res.status(400).json({
        success: false,
        message: 'Pressure must be 200, 300, or 400'
      });
    }

    // Validate crowd values
    const validCrowds = ['Low', 'Medium', 'High'];
    const crowdValue = crowd || 'Low';
    if (!validCrowds.includes(crowdValue)) {
      return res.status(400).json({
        success: false,
        message: 'Crowd must be "Low", "Medium", or "High"'
      });
    }

    // Check if owner already has a pump (optional - can allow multiple pumps)
    // const existingPump = await pool.query('SELECT id FROM cng_pumps WHERE owner_id = $1', [req.user.id]);
    // if (existingPump.rows.length > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'You already have a registered pump'
    //   });
    // }

    // Insert new pump
    const result = await pool.query(
      `INSERT INTO cng_pumps (owner_id, name, lat, lng, price, stock, pressure, crowd, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.user.id,
        name,
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(price) || 0,
        stockValue,
        pressureValue,
        crowdValue,
        phone || null
      ]
    );

    const pump = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'CNG pump registered successfully',
      data: {
        id: pump.id,
        name: pump.name,
        lat: parseFloat(pump.lat),
        lng: parseFloat(pump.lng),
        price: parseFloat(pump.price),
        stock: pump.stock,
        pressure: pump.pressure,
        crowd: pump.crowd,
        phone: pump.phone,
        isActive: pump.is_active,
        createdAt: pump.created_at,
        updatedAt: pump.updated_at
      }
    });
  } catch (error) {
    console.error('Error registering pump:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register CNG pump',
      error: error.message
    });
  }
});

// GET /api/pump/nearby - Get pumps near user's location
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

// GET /api/pump/list - Get all active pumps (for users/customers)
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

// GET /api/pump/owner/my-pumps - Get all pumps owned by the authenticated user
router.get('/owner/my-pumps', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM cng_pumps WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.user.id]
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
      isActive: pump.is_active,
      createdAt: pump.created_at,
      updatedAt: pump.updated_at
    }));

    res.json({
      success: true,
      count: pumps.length,
      data: pumps
    });
  } catch (error) {
    console.error('Error fetching owner pumps:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your pumps',
      error: error.message
    });
  }
});

// GET /api/pump/:id - Get pump details by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM cng_pumps WHERE id = $1 AND is_active = true',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'CNG pump not found'
      });
    }

    const pump = result.rows[0];

    res.json({
      success: true,
      data: {
        id: pump.id,
        name: pump.name,
        lat: parseFloat(pump.lat),
        lng: parseFloat(pump.lng),
        price: parseFloat(pump.price),
        stock: pump.stock,
        pressure: pump.pressure,
        crowd: pump.crowd,
        phone: pump.phone,
        ownerId: pump.owner_id,
        isActive: pump.is_active,
        createdAt: pump.created_at,
        updatedAt: pump.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching pump:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CNG pump details',
      error: error.message
    });
  }
});

// PUT /api/pump/:id - Update pump details (Owner only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, lat, lng, price, stock, pressure, crowd, phone } = req.body;

    // Check if pump exists and belongs to the owner
    const existingPump = await pool.query(
      'SELECT * FROM cng_pumps WHERE id = $1 AND owner_id = $2',
      [id, req.user.id]
    );

    if (existingPump.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pump not found or you do not have permission to update it'
      });
    }

    // Validate stock values if provided
    const validStock = ['Available', 'Out of Stock'];
    const stockValue = stock !== undefined ? stock : existingPump.rows[0].stock;
    if (!validStock.includes(stockValue)) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be either "Available" or "Out of Stock"'
      });
    }

    // Validate pressure values if provided
    const validPressures = [200, 300, 400];
    const pressureValue = pressure !== undefined ? parseInt(pressure) : existingPump.rows[0].pressure;
    if (!validPressures.includes(pressureValue)) {
      return res.status(400).json({
        success: false,
        message: 'Pressure must be 200, 300, or 400'
      });
    }

    // Validate crowd values if provided
    const validCrowds = ['Low', 'Medium', 'High'];
    const crowdValue = crowd !== undefined ? crowd : existingPump.rows[0].crowd;
    if (!validCrowds.includes(crowdValue)) {
      return res.status(400).json({
        success: false,
        message: 'Crowd must be "Low", "Medium", or "High"'
      });
    }

    // Update pump
    const result = await pool.query(
      `UPDATE cng_pumps 
       SET name = COALESCE($1, name),
           lat = COALESCE($2, lat),
           lng = COALESCE($3, lng),
           price = COALESCE($4, price),
           stock = $5,
           pressure = $6,
           crowd = $7,
           phone = COALESCE($8, phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND owner_id = $10
       RETURNING *`,
      [
        name,
        lat !== undefined ? parseFloat(lat) : null,
        lng !== undefined ? parseFloat(lng) : null,
        price !== undefined ? parseFloat(price) : null,
        stockValue,
        pressureValue,
        crowdValue,
        phone,
        id,
        req.user.id
      ]
    );

    const pump = result.rows[0];

    res.json({
      success: true,
      message: 'CNG pump updated successfully',
      data: {
        id: pump.id,
        name: pump.name,
        lat: parseFloat(pump.lat),
        lng: parseFloat(pump.lng),
        price: parseFloat(pump.price),
        stock: pump.stock,
        pressure: pump.pressure,
        crowd: pump.crowd,
        phone: pump.phone,
        isActive: pump.is_active,
        updatedAt: pump.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating pump:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update CNG pump',
      error: error.message
    });
  }
});

// PATCH /api/pump/:id/status - Update only stock status (Quick toggle)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    // Validate stock value
    const validStock = ['Available', 'Out of Stock'];
    if (!stock || !validStock.includes(stock)) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be either "Available" or "Out of Stock"'
      });
    }

    // Update only stock status
    const result = await pool.query(
      `UPDATE cng_pumps 
       SET stock = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND owner_id = $3
       RETURNING *`,
      [stock, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pump not found or you do not have permission to update it'
      });
    }

    const pump = result.rows[0];

    res.json({
      success: true,
      message: `Stock status updated to ${stock}`,
      data: {
        id: pump.id,
        stock: pump.stock,
        updatedAt: pump.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating stock status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock status',
      error: error.message
    });
  }
});

module.exports = router;
