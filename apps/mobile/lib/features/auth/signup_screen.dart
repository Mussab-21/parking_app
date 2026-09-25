import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_typography.dart';
import '../../core/widgets/phone_field.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/network/api_client.dart';

import 'package:dio/dio.dart';
import '../../core/utils/phone_utils.dart';
import '../../core/widgets/server_settings_dialog.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  Future<void> _signup() async {
    final rawPhone = _phoneController.text.trim();
    if (rawPhone.isEmpty || _nameController.text.trim().isEmpty || _passwordController.text.trim().isEmpty) {
      setState(() => _error = 'Please fill in all fields');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    final phone = formatPakistaniPhone(rawPhone);
    try {
      await ApiClient.instance.post('/auth/register', data: {
        'name': _nameController.text.trim(),
        'phone': phone,
        'password': _passwordController.text.trim(),
        'role': 'DRIVER',
      });

      if (!mounted) return;
      context.push('/verify-otp', extra: phone);
    } catch (e) {
      String message = 'Registration failed. Phone or password invalid.';
      if (e is DioException) {
        if (e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout ||
            e.type == DioExceptionType.connectionError) {
          message = 'Cannot connect to backend server (${ApiClient.instance.options.baseUrl}). Make sure the API is running.';
        } else if (e.response?.data is Map && e.response?.data['message'] != null) {
          final resMsg = e.response!.data['message'];
          message = resMsg is List ? resMsg.join(', ') : resMsg.toString();
        }
      }
      setState(() {
        _error = message;
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sign Up'),
        actions: [
          if (!kReleaseMode)
            IconButton(
              icon: const Icon(Icons.settings_outlined),
              tooltip: 'Server Settings',
              onPressed: () => ServerSettingsDialog.show(context),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Create Account', style: AppTypography.heading1),
            const SizedBox(height: 24),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Full Name'),
            ),
            const SizedBox(height: 16),
            PhoneField(controller: _phoneController),
            const SizedBox(height: 16),
            TextField(
              controller: _passwordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Password (min 10 chars)'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const Spacer(),
            PrimaryButton(
              label: 'Sign Up',
              isLoading: _isLoading,
              onPressed: _signup,
            ),
          ],
        ),
      ),
    );
  }
}
