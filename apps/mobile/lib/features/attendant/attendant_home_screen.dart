import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/widgets/primary_button.dart';
import '../auth/auth_provider.dart';

class AttendantHomeScreen extends ConsumerWidget {
  const AttendantHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendant Mode'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Log Out',
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/welcome');
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            const Icon(Icons.qr_code_scanner, size: 80, color: AppColors.primaryBlue),
            const SizedBox(height: 16),
            const Text('Attendant Scanner Mode', style: AppTypography.heading1),
            const SizedBox(height: 8),
            const Text('Scan driver QR tickets to record entry or exit.', textAlign: TextAlign.center),
            const Spacer(),
            PrimaryButton(
              label: 'Open Camera QR Scanner',
              onPressed: () => context.push('/staff/scan'),
            ),
          ],
        ),
      ),
    );
  }
}
