# Google Maps CNG Finder API - Setup Guide

## ✅ What's Been Created

I've created a new Google Maps-based CNG pump finder API that includes:

### New Endpoints:
1. **GET /api/cng/maps/nearby** - Find nearby CNG pumps using Google Maps
2. **GET /api/cng/maps/details** - Get detailed information about a specific pump

### Features:
- ✅ Pump name
- ✅ Address
- ✅ Phone number (call button)
- ✅ Map navigation (Google Maps directions)
- ✅ Stock status (Available/Out of Stock based on open/closed status)
- ✅ Distance from your location
- ✅ Estimated travel time
- ✅ Ratings and reviews
- ✅ Real-time data from Google Maps (no manual data entry needed!)

## ⚠️ IMPORTANT: Google Maps API Setup Required

Your API key is configured, but you need to **enable the Places API** in Google Cloud Console:

### Steps to Enable:

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/

2. **Select your project** (or create a new one)

3. **Enable Required APIs:**
   - Go to: **APIs & Services** > **Library**
   - Search and enable these APIs:
     - ✅ **Places API** (required)
     - ✅ **Maps JavaScript API** (optional, for web maps)
     - ✅ **Directions API** (optional, for advanced routing)

4. **Verify API Key:**
   - Go to: **APIs & Services** > **Credentials**
   - Find your API key: `AIzaSyDMFTO91qW1QWOwRCarA7B-zxFvNqN5_2Q`
   - Make sure it has no restrictions blocking Places API

5. **Enable Billing** (Required by Google):
   - Google requires a billing account even for free tier
   - Free tier includes: 1000+ requests/day at no cost

## 📝 How to Use the API

### Example 1: Find Nearby CNG Pumps

```
GET http://localhost:3000/api/cng/maps/nearby?latitude=28.6139&longitude=77.2090&radius=10000
```

**Parameters:**
- `latitude` (required): Your current latitude
- `longitude` (required): Your current longitude  
- `radius` (optional): Search radius in meters (default: 10000 = 10km)

**Response:**
```json
{
  "success": true,
  "message": "Found 5 CNG pump(s) within 10.0 km",
  "data": {
    "total_pumps": 5,
    "available": 3,
    "out_of_stock": 1,
    "unknown_status": 1,
    "pumps": [
      {
        "place_id": "...",
        "name": "ABC CNG Station",
        "address": "Full address here",
        "phone": "+91 1234567890",
        "distance_km": "2.5",
        "stock_status": "Available",
        "is_open": true,
        "rating": 4.2,
        "navigation": {
          "google_maps_dir": "https://www.google.com/maps/dir/?api=1&destination=...",
          "google_maps_view": "https://www.google.com/maps/place/?q=place_id:..."
        }
      }
    ]
  }
}
```

### Example 2: Get Pump Details

```
GET http://localhost:3000/api/cng/maps/details?place_id=PLACE_ID_HERE
```

**Parameters:**
- `place_id` (required): The place_id from the nearby search

**Response includes:**
- Full details
- Opening hours
- Photos
- Website
- Reviews
- Navigation links

## 🎯 Frontend Integration

### For Mobile App (React Native / Flutter):

```javascript
// Get user's current location
navigator.geolocation.getCurrentPosition((position) => {
  const { latitude, longitude } = position.coords;
  
  // Fetch nearby CNG pumps
  fetch(`http://your-server.com/api/cng/maps/nearby?latitude=${latitude}&longitude=${longitude}&radius=10000`)
    .then(res => res.json())
    .then(data => {
      console.log(data.data.pumps);
      // Display on map or list
    });
});
```

### Open Navigation:
```javascript
// Open Google Maps navigation
const openNavigation = (lat, lng) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  // Open in browser or maps app
  window.open(url, '_blank');
};
```

### Make Call:
```javascript
// Make phone call
const makeCall = (phoneNumber) => {
  window.open(`tel:${phoneNumber}`);
};
```

## 🔄 Stock Status Logic

Since Google Maps doesn't provide real-time CNG stock information, the API uses:
- **Available** = Pump is currently open (based on Google's open_now status)
- **Out of Stock** = Pump is currently closed
- **Unknown** = Opening hours not available

**Note:** This is an approximation. For real-time stock data, you would need:
- Integration with pump operators' systems, OR
- User-reported stock updates (like Waze traffic reports)

## 🚀 Next Steps

1. Enable Places API in Google Cloud Console
2. Test the API again: `node test-google-maps.js`
3. Integrate with your frontend app
4. Deploy to production

## 📞 Support

If you need help:
- Check Google Cloud Console for API usage and errors
- Verify billing is enabled
- Make sure API key has correct permissions
