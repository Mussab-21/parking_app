import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_typography.dart';
import '../../core/widgets/phone_field.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/utils/phone_utils.dart';
import '../../core/widgets/server_settings_dialog.dart';
import 'auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  Future<void> _login() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final phone = formatPakistaniPhone(_phoneController.text.trim());
    final password = _passwordController.text.trim();

    final success = await ref.read(authProvider.notifier).login(phone, password);

    if (!mounted) return;
    setState(() {
      _isLoading = false;
    });

    if (success) {
      final status = ref.read(authProvider).status;
      if (status == AuthStatus.attendant) {
        context.go('/staff/home');
      } else {
        context.go('/home');
      }
    } else {
      final authError = ref.read(authProvider).error;
      setState(() {
        _error = authError ?? 'Invalid credentials or account locked';
      });
    }
  }

  void _fillAndLogin(String phone, String password) {
    setState(() {
      _phoneController.text = phone;
      _passwordController.text = password;
    });
    _login();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Log In'),
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
            const Text('Welcome Back', style: AppTypography.heading1),
            const SizedBox(height: 8),
            const Text('Log in with your registered phone number', style: AppTypography.bodyMedium),
            const SizedBox(height: 24),
            PhoneField(controller: _phoneController),
            const SizedBox(height: 16),
            TextField(
              controller: _passwordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Password'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _error!,
                        style: const TextStyle(color: Colors.red, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 24),
            PrimaryButton(
              label: 'Log In',
              isLoading: _isLoading,
              onPressed: _login,
            ),
            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 12),
            const Text(
              'Quick Demo Accounts (Live Backend)',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(
                  avatar: const Icon(Icons.directions_car, size: 16),
                  label: const Text('Driver (+923459998887)'),
                  onPressed: _isLoading ? null : () => _fillAndLogin('+923459998887', 'DemoPass123!'),
                ),
                ActionChip(
                  avatar: const Icon(Icons.badge, size: 16),
                  label: const Text('Attendant (+923001112223)'),
                  onPressed: _isLoading ? null : () => _fillAndLogin('+923001112223', 'DemoPass123!'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
