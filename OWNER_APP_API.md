# 🎯 Owner App API - CNG Pump Management

## 📋 Overview
This API allows CNG pump owners to manage their pump information including:
- ✅ Stock Toggle (Available / Out of Stock)
- 💰 Price Input (Editable)
- ⚡ Pressure Dropdown (200 / 300 / 400)
- 👥 Crowd Dropdown (Low / Medium / High)

---

## 🔐 Authentication
All owner endpoints require JWT authentication. Include the token in the header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📝 API Endpoints

### 1️⃣ Register New Pump (First Time Data Add)
**POST** `/api/pump/register`

Register a new CNG pump with all details.

**Request Body:**
```json
{
  "name": "Andheri CNG Pump",
  "lat": 19.1197,
  "lng": 72.8468,
  "price": 76,
  "stock": "Available",
  "pressure": 400,
  "crowd": "Low",
  "phone": "9876543210"
}
```

**Field Details:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | ✅ Yes | Pump name |
| lat | number | ✅ Yes | Latitude |
| lng | number | ✅ Yes | Longitude |
| price | number | ❌ No | Price per unit (default: 0) |
| stock | string | ❌ No | "Available" or "Out of Stock" (default: "Available") |
| pressure | number | ❌ No | 200, 300, or 400 (default: 200) |
| crowd | string | ❌ No | "Low", "Medium", or "High" (default: "Low") |
| phone | string | ❌ No | Contact phone number |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "CNG pump registered successfully",
  "data": {
    "id": 1,
    "name": "Andheri CNG Pump",
    "lat": 19.1197,
    "lng": 72.8468,
    "price": 76,
    "stock": "Available",
    "pressure": 400,
    "crowd": "Low",
    "phone": "9876543210",
    "isActive": true,
    "createdAt": "2026-04-17T10:30:00.000Z",
    "updatedAt": "2026-04-17T10:30:00.000Z"
  }
}
```

---

### 2️⃣ Get Pump Details
**GET** `/api/pump/:id`

Get details of a specific pump (public endpoint).

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Andheri CNG Pump",
    "lat": 19.1197,
    "lng": 72.8468,
    "price": 76,
    "stock": "Available",
    "pressure": 400,
    "crowd": "Low",
    "phone": "9876543210",
    "ownerId": 5,
    "isActive": true,
    "createdAt": "2026-04-17T10:30:00.000Z",
    "updatedAt": "2026-04-17T10:30:00.000Z"
  }
}
```

---

### 3️⃣ Update Pump Details (Full Edit)
**PUT** `/api/pump/:id`

Update all pump details. Owner can edit everything.

**Request Body:**
```json
{
  "name": "Andheri CNG Pump Updated",
  "lat": 19.1197,
  "lng": 72.8468,
  "price": 80,
  "stock": "Available",
  "pressure": 300,
  "crowd": "Medium",
  "phone": "9876543210"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "CNG pump updated successfully",
  "data": {
    "id": 1,
    "name": "Andheri CNG Pump Updated",
    "lat": 19.1197,
    "lng": 72.8468,
    "price": 80,
    "stock": "Available",
    "pressure": 300,
    "crowd": "Medium",
    "phone": "9876543210",
    "isActive": true,
    "updatedAt": "2026-04-17T11:00:00.000Z"
  }
}
```

---

### 4️⃣ Quick Stock Toggle
**PATCH** `/api/pump/:id/status`

Quickly toggle stock status only (🟢 Available / 🔴 Out of Stock).

**Request Body:**
```json
{
  "stock": "Out of Stock"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Stock status updated to Out of Stock",
  "data": {
    "id": 1,
    "stock": "Out of Stock",
    "updatedAt": "2026-04-17T11:30:00.000Z"
  }
}
```

---

### 5️⃣ Get My Pumps (Owner's All Pumps)
**GET** `/api/pump/owner/my-pumps`

Get all pumps registered by the authenticated owner.

**Response (200 OK):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Andheri CNG Pump",
      "lat": 19.1197,
      "lng": 72.8468,
      "price": 76,
      "stock": "Available",
      "pressure": 400,
      "crowd": "Low",
      "phone": "9876543210",
      "isActive": true,
      "createdAt": "2026-04-17T10:30:00.000Z",
      "updatedAt": "2026-04-17T10:30:00.000Z"
    },
    {
      "id": 2,
      "name": "Bandra CNG Pump",
      "lat": 19.0596,
      "lng": 72.8295,
      "price": 75,
      "stock": "Out of Stock",
      "pressure": 200,
      "crowd": "High",
      "phone": "9876543211",
      "isActive": true,
      "createdAt": "2026-04-17T09:00:00.000Z",
      "updatedAt": "2026-04-17T09:00:00.000Z"
    }
  ]
}
```

---

### 6️⃣ Get All Active Pumps (For Users)
**GET** `/api/pump/all`

Get all active CNG pumps (public endpoint for app users).

**Response (200 OK):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "name": "Andheri CNG Pump",
      "lat": 19.1197,
      "lng": 72.8468,
      "price": 76,
      "stock": "Available",
      "pressure": 400,
      "crowd": "Low",
      "phone": "9876543210",
      "updatedAt": "2026-04-17T10:30:00.000Z"
    }
  ]
}
```

---

## 🎨 UI Controls Mapping

### Owner App UI Controls:

1️⃣ **Stock Toggle**
   - 🟢 Available → `"stock": "Available"`
   - 🔴 Out of Stock → `"stock": "Out of Stock"`

2️⃣ **Price Input**
   - Editable number field
   - Example: `₹76` → `"price": 76`

3️⃣ **Pressure Dropdown**
   - Options: `200`, `300`, `400`
   - Example: `"pressure": 400`

4️⃣ **Crowd Dropdown**
   - Options: `Low`, `Medium`, `High`
   - Example: `"crowd": "Low"`

---

## 🧪 Testing with cURL

### 1. Register a New Pump
```bash
curl -X POST http://localhost:3000/api/pump/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Andheri CNG Pump",
    "lat": 19.1197,
    "lng": 72.8468,
    "price": 76,
    "stock": "Available",
    "pressure": 400,
    "crowd": "Low",
    "phone": "9876543210"
  }'
```

### 2. Update Pump Details
```bash
curl -X PUT http://localhost:3000/api/pump/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "price": 80,
    "stock": "Available",
    "pressure": 300,
    "crowd": "Medium"
  }'
```

### 3. Quick Stock Toggle
```bash
curl -X PATCH http://localhost:3000/api/pump/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "stock": "Out of Stock"
  }'
```

### 4. Get My Pumps
```bash
curl -X GET http://localhost:3000/api/pump/owner/my-pumps \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## ⚠️ Error Responses

### 400 Bad Request (Validation Error)
```json
{
  "success": false,
  "message": "Stock must be either \"Available\" or \"Out of Stock\""
}
```

### 401 Unauthorized (No Token)
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### 403 Forbidden (Invalid Token)
```json
{
  "success": false,
  "message": "Invalid token."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Pump not found or you do not have permission to update it"
}
```

---

## 📊 Database Schema

**Table:** `cng_pumps`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| owner_id | INTEGER | NOT NULL, FK → users(id) | Owner reference |
| name | VARCHAR(255) | NOT NULL | Pump name |
| lat | DECIMAL(10,8) | NOT NULL | Latitude |
| lng | DECIMAL(11,8) | NOT NULL | Longitude |
| price | DECIMAL(10,2) | DEFAULT 0 | Price per unit |
| stock | VARCHAR(50) | DEFAULT 'Available' | Stock status |
| pressure | INTEGER | DEFAULT 200 | Pressure level |
| crowd | VARCHAR(50) | DEFAULT 'Low' | Crowd level |
| phone | VARCHAR(20) | NULL | Contact number |
| is_active | BOOLEAN | DEFAULT true | Active status |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

---

## 🔥 Key Features

✅ **Authentication** - All owner endpoints protected with JWT  
✅ **Validation** - Proper validation for stock, pressure, and crowd values  
✅ **Owner-only Access** - Owners can only update their own pumps  
✅ **Quick Stock Toggle** - Dedicated endpoint for fast stock updates  
✅ **Full Edit Support** - Update all fields with PUT endpoint  
✅ **First-time Registration** - Easy pump registration with POST /register  
✅ **Auto Timestamps** - created_at and updated_at managed automatically  

---

## 📱 Flutter Integration Example

```dart
// Register Pump
Future<void> registerPump(Map<String, dynamic> pumpData) async {
  final response = await http.post(
    Uri.parse('http://localhost:3000/api/pump/register'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    },
    body: jsonEncode(pumpData),
  );
  
  if (response.statusCode == 201) {
    print('Pump registered successfully!');
  }
}

// Update Stock (Quick Toggle)
Future<void> updateStock(int pumpId, String stockStatus) async {
  final response = await http.patch(
    Uri.parse('http://localhost:3000/api/pump/$pumpId/status'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    },
    body: jsonEncode({'stock': stockStatus}),
  );
  
  if (response.statusCode == 200) {
    print('Stock updated to: $stockStatus');
  }
}
```

---

## 🚀 Server Status

✅ Server running on: `http://localhost:3000`  
✅ Database: PostgreSQL (Neon)  
✅ Table: `cng_pumps` created successfully  

---

**API Created:** April 17, 2026  
**Version:** 1.0.0
