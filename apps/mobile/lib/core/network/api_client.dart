import 'package:dio/dio.dart';
import '../storage/storage_service.dart';
import 'auth_interceptor.dart';
import 'idempotency_interceptor.dart';

class ApiClient {
  // Base URL defaults to localhost / 10.0.2.2 for Android emulator
  static const String defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api/v1',
  );

  static final Dio instance = _createDio();

  static Future<void> init() async {
    final custom = await StorageService.getCustomBaseUrl();
    if (custom != null && custom.trim().isNotEmpty) {
      instance.options.baseUrl = custom.trim();
    }
  }

  static Future<void> updateBaseUrl(String newUrl) async {
    final trimmed = newUrl.trim();
    instance.options.baseUrl = trimmed;
    await StorageService.saveCustomBaseUrl(trimmed);
  }

  static Dio _createDio() {
    final dio = Dio(
      BaseOptions(
        baseUrl: defaultBaseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(IdempotencyInterceptor());
    dio.interceptors.add(AuthInterceptor(dio));

    return dio;
  }
}
