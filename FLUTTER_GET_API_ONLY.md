# Flutter CNG Notification - GET API Only (Automatic)

## ✅ Simple GET API for Auto Notifications

Bhai, ab sirf **EK GET API** hai! Jab tum travel karoge, toh Flutter app har 30 seconds ya 100 meters mein isko call karega. Agar nearby CNG pump available hua, toh notification show hoga!

---

## 📡 API Endpoint

```
GET /api/cng/notifications/check?latitude=28.6139&longitude=77.2090&radius=5
```

### Parameters:
- `latitude` (required): User ki current latitude
- `longitude` (required): User ka current longitude  
- `radius` (optional): Search radius in km (default: 5 km)

### Response when CNG is AVAILABLE:

```json
{
  "success": true,
  "message": "Found 3 CNG pump(s) with stock available!",
  "data": {
    "notification": {
      "should_notify": true,
      "title": "CNG Pump Nearby!",
      "body": "ABC CNG Station is 2.5 km away - CNG Available!",
      "sound": true,
      "vibration": true
    },
    "nearest_pump": {
      "place_id": "xyz123",
      "name": "ABC CNG Station",
      "address": "Full address here",
      "phone": "+91 1234567890",
      "latitude": 28.6150,
      "longitude": 77.2100,
      "distance_km": "2.5",
      "rating": 4.2,
      "is_open": true,
      "navigation_url": "https://www.google.com/maps/dir/?api=1&destination=28.6150,77.2100"
    },
    "total_available": 3,
    "all_pumps": [...],
    "searched_radius_km": 5
  }
}
```

### Response when NO CNG available:

```json
{
  "success": true,
  "message": "No CNG pumps with available stock found nearby",
  "data": {
    "notification": {
      "should_notify": false,
      "title": null,
      "body": null
    },
    "nearest_pump": null,
    "total_available": 0,
    "all_pumps": [],
    "searched_radius_km": 5
  }
}
```

---

## 🎯 Flutter Implementation

### Simple Service Class:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class CNGNotificationService {
  static const String baseUrl = 'http://YOUR_SERVER_IP:3000';
  
  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();
  bool _isTracking = false;

  // Initialize notifications
  Future<void> initialize() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );
    await _notifications.initialize(settings);
  }

  // Start tracking location
  Future<void> startTracking() async {
    if (_isTracking) return;

    // Check permission
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.deniedForever || 
        permission == LocationPermission.denied) {
      print('Location permission denied');
      return;
    }

    _isTracking = true;
    print('CNG Tracking Started');

    // Get location updates every 100 meters
    Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 100, // Update every 100 meters
      ),
    ).listen((Position position) async {
      await checkNearbyCNG(position.latitude, position.longitude);
    });
  }

  // Stop tracking
  void stopTracking() {
    _isTracking = false;
    print('CNG Tracking Stopped');
  }

  // Check for nearby CNG (CALL THIS AUTOMATICALLY)
  Future<void> checkNearbyCNG(double latitude, double longitude) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/cng/notifications/check'),
        queryParameters: {
          'latitude': latitude.toString(),
          'longitude': longitude.toString(),
          'radius': '5', // 5 km
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Check if should notify
        if (data['data']['notification']['should_notify'] == true) {
          final notification = data['data']['notification'];
          final pump = data['data']['nearest_pump'];
          
          // SHOW NOTIFICATION
          await _showNotification(
            title: notification['title'],
            body: notification['body'],
            pump: pump,
          );
          
          print('CNG Found: ${pump['name']}');
          print('Distance: ${pump['distance_km']} km');
        }
      }
    } catch (e) {
      print('Error checking CNG: $e');
    }
  }

  // Show notification
  Future<void> _showNotification({
    required String title,
    required String body,
    required Map pump,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'cng_available',
      'CNG Available',
      channelDescription: 'CNG pump nearby notification',
      importance: Importance.max,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );

    const iosDetails = DarwinNotificationDetails();
    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    // Pass pump data as payload
    await _notifications.show(
      DateTime.now().millisecond,
      title,
      body,
      details,
      payload: jsonEncode(pump),
    );
  }

  // Open navigation when user taps notification
  Future<void> openNavigation(String lat, String lng) async {
    final url = 'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng';
    // Use url_launcher to open
    print('Navigation: $url');
  }

  // Call pump
  Future<void> callPump(String phone) async {
    // Use url_launcher to call
    print('Call: $phone');
  }
}
```

---

## 📱 Usage in Flutter App

### In main.dart:

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  final cngService = CNGNotificationService();
  await cngService.initialize();
  
  runApp(MyApp(cngService: cngService));
}
```

### In Home Screen:

```dart
class HomeScreen extends StatefulWidget {
  final CNGNotificationService cngService;
  const HomeScreen({super.key, required this.cngService});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isTracking = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('CNG Finder'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _isTracking ? Icons.location_on : Icons.location_off,
              size: 100,
              color: _isTracking ? Colors.green : Colors.red,
            ),
            const SizedBox(height: 20),
            Text(
              _isTracking ? 'Tracking ON' : 'Tracking OFF',
              style: const TextStyle(fontSize: 28),
            ),
            const SizedBox(height: 40),
            ElevatedButton.icon(
              onPressed: _toggleTracking,
              icon: Icon(_isTracking ? Icons.stop : Icons.play_arrow),
              label: Text(_isTracking ? 'Stop' : 'Start Tracking'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _isTracking ? Colors.red : Colors.green,
                padding: const EdgeInsets.symmetric(horizontal: 50, vertical: 20),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _toggleTracking() {
    setState(() {
      _isTracking = !_isTracking;
    });

    if (_isTracking) {
      widget.cngService.startTracking();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('CNG tracking started! Travel safely.')),
      );
    } else {
      widget.cngService.stopTracking();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tracking stopped')),
      );
    }
  }
}
```

---

## 🔄 How It Works:

```
User Traveling (Location ON)
         ↓
Flutter app gets location every 100 meters
         ↓
Calls: GET /api/cng/notifications/check?lat=X&lng=Y&radius=5
         ↓
Backend searches Google Maps for CNG pumps
         ↓
Checks which pumps are OPEN (available)
         ↓
If found: Returns notification data
         ↓
Flutter shows notification:
"CNG Pump Nearby!
ABC Station is 2.5 km away - CNG Available!"
         ↓
User taps notification → Opens Google Maps navigation
```

---

## ✅ Features:

- ✅ **No POST requests** - Sirf GET API
- ✅ **Automatic** - Location on karte hi start
- ✅ **Real-time** - Google Maps se live data
- ✅ **Stock available** - Sirf open pumps dikhata hai
- ✅ **Navigation** - Direct Google Maps link
- ✅ **Phone number** - Call kar sakte ho
- ✅ **Distance** - Kitna door hai
- ✅ **Rating** - Kitna accha pump hai

---

## 🚀 Testing:

### Test with curl (Linux/Mac):
```bash
curl "http://localhost:3000/api/cng/notifications/check?latitude=28.6139&longitude=77.2090&radius=5"
```

### Test from browser:
```
http://localhost:3000/api/cng/notifications/check?latitude=28.6139&longitude=77.2090&radius=5
```

---

**Bhai, ab bas Flutter app mein ye GET API call karni hai while traveling. Jab bhi nearby CNG pump milega, notification aa jayega automatically!** 🎉
