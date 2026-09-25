import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const _secureStorage = FlutterSecureStorage();
  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _userKey = 'user_data';
  static const _cachedTicketsKey = 'cached_qr_tickets';
  static const _baseUrlKey = 'custom_api_base_url';

  // API Base URL Configuration
  static Future<void> saveCustomBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_baseUrlKey, url);
  }

  static Future<String?> getCustomBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_baseUrlKey);
  }

  // Tokens
  static Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    await _secureStorage.write(key: _accessTokenKey, value: accessToken);
    await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
  }

  static Future<String?> getAccessToken() async {
    return await _secureStorage.read(key: _accessTokenKey);
  }

  static Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: _refreshTokenKey);
  }

  static Future<void> clearAuth() async {
    await _secureStorage.delete(key: _accessTokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);
    await _secureStorage.delete(key: _userKey);
  }

  // User Profile
  static Future<void> saveUser(Map<String, dynamic> userMap) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(userMap));
  }

  static Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final str = prefs.getString(_userKey);
    if (str != null) {
      return jsonDecode(str) as Map<String, dynamic>;
    }
    return null;
  }

  // Offline QR Ticket Caching (Section 15)
  static Future<void> cacheTicket(String bookingId, Map<String, dynamic> ticketData) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_cachedTicketsKey);
    Map<String, dynamic> map = raw != null ? jsonDecode(raw) : {};
    map[bookingId] = ticketData;
    await prefs.setString(_cachedTicketsKey, jsonEncode(map));
  }

  static Future<Map<String, dynamic>?> getCachedTicket(String bookingId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_cachedTicketsKey);
    if (raw != null) {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      return map[bookingId] as Map<String, dynamic>?;
    }
    return null;
  }
}
