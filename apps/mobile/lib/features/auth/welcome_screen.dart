import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/secondary_button.dart';
import '../../core/widgets/server_settings_dialog.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          if (!kReleaseMode)
            IconButton(
              icon: const Icon(Icons.settings_outlined, color: AppColors.neutral700),
              tooltip: 'Server Settings',
              onPressed: () => ServerSettingsDialog.show(context),
            ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            children: [
              const Spacer(),
              const Icon(Icons.directions_car_filled, size: 100, color: AppColors.primaryBlue),
              const SizedBox(height: 24),
              const Text('ParkSmart Pakistan', style: AppTypography.heading1, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              const Text(
                'Find, reserve, and pay for parking slots across Pakistan in seconds.',
                style: AppTypography.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const Spacer(),
              PrimaryButton(
                label: 'Log In',
                onPressed: () => context.push('/login'),
              ),
              const SizedBox(height: 12),
              SecondaryButton(
                label: 'Sign Up',
                onPressed: () => context.push('/signup'),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => context.go('/home'),
                child: const Text('Browse as Guest', style: TextStyle(color: AppColors.neutral700)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
