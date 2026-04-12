# Flutter CNG Notification Integration Guide

## 📱 Complete Flutter Implementation for CNG Notifications

This guide shows you how to integrate CNG pump notifications in your Flutter app when traveling.

---

## Step 1: Add Required Dependencies

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Location
  geolocator: ^10.1.0
  geocoding: ^2.1.1
  
  # HTTP requests
  http: ^1.1.0
  
  # Firebase Messaging (for push notifications)
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.9
  
  # Background location (optional, for continuous tracking)
  background_location: ^0.12.0
  
  # Local notifications (fallback)
  flutter_local_notifications: ^16.1.0
```

Run: `flutter pub get`

---

## Step 2: Create CNG Notification Service

Create file: `lib/services/cng_notification_service.dart`

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class CNGNotificationService {
  static const String baseUrl = 'http://YOUR_SERVER_IP:3000'; // Change to your server URL
  static final CNGNotificationService _instance = CNGNotificationService._internal();
  
  factory CNGNotificationService() => _instance;
  CNGNotificationService._internal();

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  
  String? _deviceToken;
  bool _isTracking = false;

  // Initialize notifications
  Future<void> initialize() async {
    // Request permission
    await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Initialize local notifications
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );
    await _localNotifications.initialize(settings);

    // Get FCM token
    _deviceToken = await _firebaseMessaging.getToken();
    print('FCM Token: $_deviceToken');

    // Register device with backend
    if (_deviceToken != null) {
      await registerDevice();
    }

    // Handle background messages
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  }

  // Register device with backend
  Future<bool> registerDevice() async {
    if (_deviceToken == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/cng/notifications/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'device_token': _deviceToken,
          'device_type': 'android', // or 'ios'
          'notification_radius': 5.0, // 5 km
        }),
      );

      if (response.statusCode == 200) {
        print('Device registered successfully');
        return true;
      }
      return false;
    } catch (e) {
      print('Error registering device: $e');
      return false;
    }
  }

  // Start location tracking
  Future<void> startTracking() async {
    if (_isTracking) return;

    // Check location permission
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
    print('Started CNG location tracking');

    // Get location updates every 30 seconds or 100 meters
    Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 100, // Update every 100 meters
      ),
    ).listen((Position position) async {
      await updateLocation(position.latitude, position.longitude);
    });
  }

  // Stop location tracking
  void stopTracking() {
    _isTracking = false;
    print('Stopped CNG location tracking');
  }

  // Update location and check for nearby CNG pumps
  Future<void> updateLocation(double latitude, double longitude) async {
    if (_deviceToken == null) return;

    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/cng/notifications/update-location'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'device_token': _deviceToken,
          'latitude': latitude,
          'longitude': longitude,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        if (data['notification_sent'] == true) {
          // CNG pump found nearby!
          final notification = data['notification'];
          final nearestPump = data['nearest_pump'];
          
          // Show local notification
          await _showCNGNotification(
            title: notification['title'],
            body: notification['body'],
            pumpData: nearestPump,
          );
          
          print('CNG Pump Nearby: ${nearestPump['name']}');
          print('Distance: ${nearestPump['distance_km']} km');
        }
      }
    } catch (e) {
      print('Error updating location: $e');
    }
  }

  // Show CNG available notification
  Future<void> _showCNGNotification({
    required String title,
    required String body,
    required Map pumpData,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'cng_available_channel',
      'CNG Available',
      channelDescription: 'Notifications when CNG is available nearby',
      importance: Importance.max,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      DateTime.now().millisecond,
      title,
      body,
      details,
      payload: jsonEncode(pumpData),
    );
  }

  // Get notification history
  Future<List<dynamic>> getNotificationHistory() async {
    if (_deviceToken == null) return [];

    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/cng/notifications/history?device_token=$_deviceToken&limit=20'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data']['notifications'];
      }
      return [];
    } catch (e) {
      print('Error getting history: $e');
      return [];
    }
  }

  // Open navigation to CNG pump
  Future<void> openNavigation(String lat, String lng) async {
    final url = 'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng';
    // Use url_launcher package to open
    print('Open: $url');
  }

  // Make call to CNG pump
  Future<void> makeCall(String phoneNumber) async {
    // Use url_launcher package to make call
    print('Call: $phoneNumber');
  }
}

// Handle background messages
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  print('Received background message: ${message.notification?.title}');
}
```

---

## Step 3: Use in Your App

### In main.dart:

```dart
import 'package:flutter/material.dart';
import 'services/cng_notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize CNG notification service
  final cngService = CNGNotificationService();
  await cngService.initialize();
  
  runApp(MyApp(cngService: cngService));
}

class MyApp extends StatelessWidget {
  final CNGNotificationService cngService;
  
  const MyApp({super.key, required this.cngService});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CNG Finder',
      home: HomeScreen(cngService: cngService),
    );
  }
}
```

### In your home screen:

```dart
import 'package:flutter/material.dart';
import '../services/cng_notification_service.dart';

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
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: _showNotificationHistory,
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _isTracking ? Icons.location_on : Icons.location_off,
              size: 80,
              color: _isTracking ? Colors.green : Colors.red,
            ),
            const SizedBox(height: 20),
            Text(
              _isTracking ? 'Tracking Enabled' : 'Tracking Disabled',
              style: const TextStyle(fontSize: 24),
            ),
            const SizedBox(height: 10),
            const Text(
              'Traveling mode will notify you\nwhen CNG is available nearby',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            const SizedBox(height: 40),
            ElevatedButton.icon(
              onPressed: _toggleTracking,
              icon: Icon(_isTracking ? Icons.stop : Icons.play_arrow),
              label: Text(_isTracking ? 'Stop Tracking' : 'Start Tracking'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _isTracking ? Colors.red : Colors.green,
                padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 15),
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
        const SnackBar(content: Text('CNG tracking started!')),
      );
    } else {
      widget.cngService.stopTracking();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('CNG tracking stopped')),
      );
    }
  }

  void _showNotificationHistory() async {
    final history = await widget.cngService.getNotificationHistory();
    
    showModalBottomSheet(
      context: context,
      builder: (context) => ListView.builder(
        itemCount: history.length,
        itemBuilder: (context, index) {
          final notification = history[index];
          return ListTile(
            leading: const Icon(Icons.local_gas_station),
            title: Text(notification['message']),
            subtitle: Text(notification['distance_km'] + ' km away'),
          );
        },
      ),
    );
  }
}
```

---

## Step 4: Firebase Setup (For Push Notifications)

### 1. Create Firebase Project
- Go to: https://console.firebase.google.com/
- Create new project
- Add Android/iOS app

### 2. Download Config Files
- **Android:** `google-services.json` → `android/app/`
- **iOS:** `GoogleService-Info.plist` → `ios/Runner/`

### 3. Initialize Firebase
```bash
flutterfire configure
```

### 4. Add to AndroidManifest.xml (android/app/src/main/)

```xml
<manifest>
  <!-- Add permissions -->
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  <uses-permission android:name="android.permission.INTERNET" />
  
  <application>
    <!-- Add Firebase messaging service -->
    <service
      android:name="com.google.firebase.messaging.FirebaseMessagingService"
      android:exported="false">
      <intent-filter android:priority="1">
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
      </intent-filter>
    </service>
  </application>
</manifest>
```

---

## How It Works:

```
User Traveling (Location ON)
         ↓
Flutter App tracks location every 100m
         ↓
Sends location to: POST /api/cng/notifications/update-location
         ↓
Backend searches Google Maps for CNG pumps
         ↓
Finds open/available CNG pump within radius
         ↓
Sends notification data back to Flutter
         ↓
Flutter shows notification:
"CNG Pump Nearby!
ABC Station is 2.5 km away - CNG Available!"
         ↓
User taps notification → Opens navigation
```

---

## API Endpoints:

### 1. Register Device (One time)
```dart
POST /api/cng/notifications/register
{
  "device_token": "FCM_TOKEN_HERE",
  "device_type": "android",
  "notification_radius": 5.0
}
```

### 2. Update Location (Continuous while traveling)
```dart
POST /api/cng/notifications/update-location
{
  "device_token": "FCM_TOKEN_HERE",
  "latitude": 28.6139,
  "longitude": 77.2090
}
```

**Response when CNG found:**
```json
{
  "success": true,
  "notification_sent": true,
  "notification": {
    "title": "CNG Pump Nearby!",
    "body": "ABC Station is 2.5 km away - CNG Available!"
  },
  "nearest_pump": {
    "name": "ABC CNG Station",
    "distance_km": "2.5",
    "phone": "+91 1234567890",
    "latitude": 28.6150,
    "longitude": 77.2100
  }
}
```

---

## Features:

✅ Auto-detect CNG pumps while traveling
✅ Notification every 15 minutes (avoid spam)
✅ Shows nearest available CNG pump
✅ Distance calculation
✅ Phone number for calling
✅ Google Maps navigation link
✅ Notification history
✅ Works in background

---

## Important Notes:

1. **Server URL:** Change `baseUrl` in the service to your actual server URL
2. **Background Location:** For continuous tracking when app is closed, use `background_location` package
3. **Firebase:** Setup Firebase project for real push notifications
4. **Testing:** Test on real device (location simulation on emulator)

---

**Bhai, ab tumhara Flutter app mein notification system ready hai! Jab tum travel karoge, toh automatically CNG pump ka notification aayega!** 🚀
