import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/countdown_timer.dart';
import '../../core/network/api_client.dart';

class PaymentScreen extends StatefulWidget {
  final String bookingId;

  const PaymentScreen({super.key, required this.bookingId});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  Map<String, dynamic>? _booking;
  bool _isLoading = true;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _fetchBooking();
  }

  Future<void> _fetchBooking() async {
    try {
      final res = await ApiClient.instance.get('/bookings/${widget.bookingId}');
      setState(() {
        _booking = res.data;
        _isLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _payMock() async {
    setState(() => _isProcessing = true);
    try {
      // 1. Create Checkout
      final checkoutRes = await ApiClient.instance.post('/payments/checkout/${widget.bookingId}');
      final providerRef = checkoutRes.data['providerReference'];

      // 2. Simulate Mock Webhook Signature
      final webhookPayload = {
        'providerEventId': 'EVT_${DateTime.now().millisecondsSinceEpoch}',
        'bookingId': widget.bookingId,
        'providerReference': providerRef,
        'amountPaisa': _booking!['amount_paisa'],
        'currency': 'PKR',
        'status': 'SUCCEEDED',
      };

      // Call Webhook endpoint directly to simulate payment completion
      await ApiClient.instance.post(
        '/webhooks/payments/MOCK_PROVIDER',
        data: webhookPayload,
        options: Options(headers: {'x-mock-signature': 'mock-signature-dev'}),
      );

      if (!mounted) return;
      context.go('/ticket/${widget.bookingId}');
    } catch (_) {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(appBar: AppBar(), body: const Center(child: CircularProgressIndicator()));
    }

    final expiresAt = DateTime.parse(_booking!['hold_expires_at']);

    return Scaffold(
      appBar: AppBar(title: const Text('Payment')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            CountdownTimerWidget(
              expiresAt: expiresAt,
              onExpired: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Booking hold expired! Please re-book.')),
                );
                context.go('/home');
              },
            ),
            const SizedBox(height: 24),
            const Text('Choose Payment Method', style: AppTypography.heading2),
            const SizedBox(height: 16),
            Card(
              child: ListTile(
                leading: const Icon(Icons.payment, color: AppColors.primaryBlue),
                title: const Text('Mock Gateway (JazzCash/Easypaisa/Card)'),
                subtitle: const Text('Sandbox test payment'),
                trailing: const Icon(Icons.check_circle, color: AppColors.successTeal),
                onTap: () {},
              ),
            ),
            const Spacer(),
            PrimaryButton(
              label: 'Complete Payment PKR ${num.parse(_booking!['amount_paisa']) / 100}',
              isLoading: _isProcessing,
              onPressed: _payMock,
            ),
          ],
        ),
      ),
    );
  }
}
