import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/network/api_client.dart';

import '../../core/widgets/error_state_widget.dart';

class FacilityDetailsScreen extends StatefulWidget {
  final String facilityId;

  const FacilityDetailsScreen({super.key, required this.facilityId});

  @override
  State<FacilityDetailsScreen> createState() => _FacilityDetailsScreenState();
}

class _FacilityDetailsScreenState extends State<FacilityDetailsScreen> {
  Map<String, dynamic>? _data;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchDetails();
  }

  Future<void> _fetchDetails() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await ApiClient.instance.get('/facilities/${widget.facilityId}');
      if (res.data != null && res.data['facility'] != null) {
        setState(() {
          _data = res.data;
          _isLoading = false;
        });
        return;
      }
      throw Exception('Facility data not found');
    } catch (_) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load facility details. Please check your connection and try again.';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(appBar: AppBar(), body: const Center(child: CircularProgressIndicator()));
    }

    if (_errorMessage != null || _data == null || _data!['facility'] == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Facility Details')),
        body: Center(
          child: SingleChildScrollView(
            child: ErrorStateWidget(
              message: _errorMessage ?? 'Facility details could not be loaded.',
              onRetry: _fetchDetails,
            ),
          ),
        ),
      );
    }

    final facility = _data!['facility'];
    final ratePkr = (num.tryParse(facility['hourly_rate_paisa'].toString()) ?? 0) / 100;

    return Scaffold(
      appBar: AppBar(title: Text(facility['name'])),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(facility['name'], style: AppTypography.heading1),
            const SizedBox(height: 8),
            Text('${facility['address']}, ${facility['city']}', style: AppTypography.bodyLarge),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Hourly Rate', style: TextStyle(fontSize: 16)),
                    Text('PKR $ratePkr / hour', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primaryBlue)),
                  ],
                ),
              ),
            ),
            const Spacer(),
            PrimaryButton(
              label: 'Select Slot & Book',
              onPressed: () => context.push('/book/slots/${widget.facilityId}'),
            ),
          ],
        ),
      ),
    );
  }
}
