import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_typography.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/network/api_client.dart';

import 'package:dio/dio.dart';

class VerifyOtpScreen extends StatefulWidget {
  const VerifyOtpScreen({super.key});

  @override
  State<VerifyOtpScreen> createState() => _VerifyOtpScreenState();
}

class _VerifyOtpScreenState extends State<VerifyOtpScreen> {
  final _otpController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  Future<void> _verifyOtp(String phone) async {
    final code = _otpController.text.trim();
    if (code.length != 6) {
      setState(() => _error = 'Please enter a 6-digit code');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await ApiClient.instance.post('/auth/verify-otp', data: {
        'phone': phone,
        'code': code,
        'purpose': 'PHONE_VERIFICATION',
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Phone verified successfully! You can now log in.')),
      );
      context.go('/login');
    } catch (e) {
      String msg = 'Invalid or expired OTP code';
      if (e is DioException) {
        if (e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout ||
            e.type == DioExceptionType.connectionError) {
          msg = 'Cannot connect to backend server. Make sure API is running.';
        } else if (e.response?.data is Map && e.response?.data['message'] != null) {
          msg = e.response!.data['message'].toString();
        }
      }
      setState(() {
        _error = msg;
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final phone = (GoRouterState.of(context).extra as String?) ?? '+923000000000';

    return Scaffold(
      appBar: AppBar(title: const Text('Verify Phone')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Enter 6-Digit OTP', style: AppTypography.heading1),
            const SizedBox(height: 8),
            Text('Sent to $phone', style: AppTypography.bodyMedium),
            const SizedBox(height: 24),
            TextField(
              controller: _otpController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              decoration: const InputDecoration(labelText: 'OTP Code'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const Spacer(),
            PrimaryButton(
              label: 'Verify & Continue',
              isLoading: _isLoading,
              onPressed: () => _verifyOtp(phone),
            ),
          ],
        ),
      ),
    );
  }
}
