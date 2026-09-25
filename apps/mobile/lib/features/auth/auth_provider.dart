import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/storage/storage_service.dart';
import '../../core/network/api_client.dart';

import 'package:dio/dio.dart';

enum AuthStatus { unauthenticated, authenticated, attendant }

class AuthState {
  final AuthStatus status;
  final Map<String, dynamic>? user;
  final String? error;

  const AuthState({
    required this.status,
    this.user,
    this.error,
  });
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState(status: AuthStatus.unauthenticated)) {
    checkAuth();
  }

  Future<void> checkAuth() async {
    final token = await StorageService.getAccessToken();
    final user = await StorageService.getUser();

    if (token != null && user != null) {
      final role = user['role'] as String?;
      final status = (role == 'ATTENDANT' || role == 'OWNER') ? AuthStatus.attendant : AuthStatus.authenticated;
      state = AuthState(status: status, user: user);
    } else {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<bool> login(String identifier, String password) async {
    try {
      final response = await ApiClient.instance.post('/auth/login', data: {
        'identifier': identifier,
        'password': password,
      });

      final accessToken = response.data['accessToken'] as String;
      final refreshToken = response.data['refreshToken'] as String;
      final user = response.data['user'] as Map<String, dynamic>;

      await StorageService.saveTokens(accessToken: accessToken, refreshToken: refreshToken);
      await StorageService.saveUser(user);

      final role = user['role'] as String?;
      final status = (role == 'ATTENDANT' || role == 'OWNER') ? AuthStatus.attendant : AuthStatus.authenticated;
      state = AuthState(status: status, user: user);
      return true;
    } catch (e) {
      String errorMessage = 'Login failed: Invalid credentials';
      if (e is DioException) {
        if (e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout ||
            e.type == DioExceptionType.connectionError) {
          errorMessage = 'Cannot reach API server (${ApiClient.instance.options.baseUrl}). Make sure the backend is running.';
        } else if (e.response?.data is Map && e.response?.data['message'] != null) {
          errorMessage = e.response!.data['message'].toString();
        }
      }
      state = AuthState(status: AuthStatus.unauthenticated, error: errorMessage);
      return false;
    }
  }


  Future<void> logout() async {
    try {
      final refreshToken = await StorageService.getRefreshToken();
      if (refreshToken != null) {
        await ApiClient.instance.post('/auth/logout', data: {'refreshToken': refreshToken});
      }
    } catch (_) {}
    await StorageService.clearAuth();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
