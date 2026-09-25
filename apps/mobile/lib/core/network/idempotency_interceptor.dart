import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';

class IdempotencyInterceptor extends Interceptor {
  final _uuid = const Uuid();

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (options.method == 'POST' &&
        (options.path.contains('/bookings') || options.path.contains('/payments'))) {
      if (!options.headers.containsKey('idempotency-key')) {
        options.headers['idempotency-key'] = 'MOB_${_uuid.v4()}';
      }
    }
    handler.next(options);
  }
}
