# Station Finder API - Simplified Documentation

## ✅ Changes Made:

1. **Removed all "CNG" references** - Now called "Stations"
2. **Simplified database structure**:
   - `name` - Station name (auto)
   - `price` - Price (you add from admin panel)
   - `district` - District (auto)
   - `out_of_stock` - Out of stock status (you add from admin panel)
   - `available` - Available status (you add from admin panel)
3. **Notification system working** - Uses database stations instead of external APIs

---

## 📍 API Endpoints:

### 1. Search Stations
```
GET /api/stations/search?q=Delhi
```
**Parameters:**
- `q` (required): Search term (name, district, city, address)
- `radius_km` (optional): Search radius (default: 50 km)

**Response:**
```json
{
  "success": true,
  "message": "Found 8 station(s) matching \"Delhi\"",
  "data": {
    "search_term": "Delhi",
    "total_results": 8,
    "available": 8,
    "open_now": 8,
    "stations": [
      {
        "id": 1,
        "name": "Delhi Station",
        "address": "Lajpat Nagar, New Delhi",
        "district": "South Delhi",
        "city": "New Delhi",
        "state": "Delhi",
        "price": 76.50,
        "is_open": true,
        "status": "Open",
        "out_of_stock": false,
        "available": true,
        "availability_message": "Available",
        "phone": "Not available",
        "navigation_url": "https://www.google.com/maps/dir/?api=1&destination=...",
        "last_updated": "2026-04-17T..."
      }
    ]
  }
}
```

---

### 2. Get Nearest Station
```
GET /api/stations/nearest?latitude=28.6139&longitude=77.2090
```
**Parameters:**
- `latitude` (required): Your latitude
- `longitude` (required): Your longitude

**Response:**
```json
{
  "success": true,
  "message": "Nearest station found 2.10 km away",
  "data": {
    "station": {
      "id": 2,
      "name": "IGL Station",
      "address": "Connaught Place, New Delhi",
      "district": "Central Delhi",
      "price": 76.00,
      "distance_km": "2.10",
      "status": "Open",
      "available": true,
      "availability_message": "✅ Available",
      "phone": "Not available",
      "navigation": {
        "google_maps": "https://www.google.com/maps/dir/?api=1&destination=...",
        "directions": "Navigate 2.10 km to IGL Station",
        "estimated_time": "6 mins by car"
      }
    }
  }
}
```

---

### 3. Get All Nearby Stations
```
GET /api/stations/all-nearby?latitude=28.6139&longitude=77.2090&radius_km=10
```
**Parameters:**
- `latitude` (required): Your latitude
- `longitude` (required): Your longitude
- `radius_km` (optional): Search radius (default: 10 km)

**Response:**
```json
{
  "success": true,
  "message": "Found 4 station(s) within 10 km",
  "data": {
    "total_stations": 4,
    "available": 4,
    "open_now": 4,
    "stations": [...]
  }
}
```

---

### 4. Get Station Details
```
GET /api/stations/1
```
**Parameters:**
- Station ID in URL

**Response:**
```json
{
  "success": true,
  "message": "Station details retrieved successfully.",
  "data": {
    "station": {
      "id": 1,
      "name": "Indraprastha Station",
      "district": "South West Delhi",
      "price": 75.50,
      "available": true,
      "out_of_stock": false,
      "contact": {
        "phone": "Not available",
        "operating_hours": "24/7"
      },
      "navigation": {
        "google_maps": "https://www.google.com/maps/dir/?api=1&destination=..."
      }
    }
  }
}
```

---

### 5. Update Station Availability (Admin Panel)
```
POST /api/stations/update-availability
```
**Body:**
```json
{
  "station_id": 1,
  "available": true,
  "out_of_stock": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Status updated: Now available at Indraprastha Station",
  "data": {
    "station": {
      "id": 1,
      "name": "Indraprastha Station",
      "available": true,
      "out_of_stock": false,
      "last_updated": "2026-04-17T..."
    }
  }
}
```

---

### 6. Update Station Price (Admin Panel)
```
POST /api/stations/update-price
```
**Body:**
```json
{
  "station_id": 1,
  "price": 78.50
}
```

**Response:**
```json
{
  "success": true,
  "message": "Price updated for Indraprastha Station",
  "data": {
    "station": {
      "id": 1,
      "name": "Indraprastha Station",
      "price": 78.50,
      "last_updated": "2026-04-17T..."
    }
  }
}
```

---

### 7. Check Notifications (While Traveling)
```
GET /api/notifications/check?latitude=28.6139&longitude=77.2090&radius=10
```
**Parameters:**
- `latitude` (required): User's current latitude
- `longitude` (required): User's current longitude
- `radius` (optional): Search radius in km (default: 5 km)

**Response:**
```json
{
  "success": true,
  "message": "Found 4 station(s) available!",
  "data": {
    "notification": {
      "should_notify": true,
      "title": "Station Nearby!",
      "body": "Indraprastha Station is 3.50 km away - Available!",
      "sound": true,
      "vibration": true
    },
    "nearest_station": {
      "id": 1,
      "name": "Indraprastha Station",
      "distance_km": "3.50",
      "price": 75.50,
      "available": true,
      "navigation_url": "https://www.google.com/maps/dir/?api=1&destination=..."
    },
    "total_available": 4,
    "all_stations": [...]
  }
}
```

---

## 🎯 How to Use:

### For Admin Panel:
1. **Add/Update Price**: Use `POST /api/stations/update-price`
2. **Update Availability**: Use `POST /api/stations/update-availability`
3. **Set out_of_stock**: Include in update-availability request

### For Flutter/Mobile App:
1. **Search Stations**: Use `GET /api/stations/search`
2. **Find Nearby**: Use `GET /api/stations/all-nearby`
3. **Get Navigation**: Use `navigation_url` from response
4. **Auto Notifications**: Call `GET /api/notifications/check` while traveling

---

## 📊 Database Fields:

| Field | Type | Description | Who Sets |
|-------|------|-------------|----------|
| `name` | VARCHAR | Station name | Auto |
| `district` | VARCHAR | District name | Auto |
| `price` | DECIMAL | Price | You (Admin) |
| `available` | BOOLEAN | Is available | You (Admin) |
| `out_of_stock` | BOOLEAN | Out of stock | You (Admin) |
| `is_open` | BOOLEAN | Is open | Auto |
| `latitude` | DECIMAL | Location lat | Auto |
| `longitude` | DECIMAL | Location lng | Auto |

---

## ✅ Testing:

Run the test file:
```bash
node test-stations.js
```

All endpoints are working and tested! 🎉
