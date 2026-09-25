import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/network/api_client.dart';

class BookingSummaryScreen extends StatefulWidget {
  final Map<String, dynamic> data;

  const BookingSummaryScreen({super.key, required this.data});

  @override
  State<BookingSummaryScreen> createState() => _BookingSummaryScreenState();
}

class _BookingSummaryScreenState extends State<BookingSummaryScreen> {
  bool _isLoading = false;
  String? _error;

  Future<void> _createBookingHold() async {
    setState(() => _isLoading = true);

    try {
      final startTime = DateTime.now().add(const Duration(hours: 1));
      startTime.subtract(Duration(minutes: startTime.minute % 30, seconds: startTime.second, milliseconds: startTime.millisecond));

      // Fetch user's vehicle or pass first vehicle
      final vehRes = await ApiClient.instance.get('/me/vehicles');
      String vehicleId;
      if ((vehRes.data as List).isNotEmpty) {
        vehicleId = vehRes.data[0]['id'];
      } else {
        // Add default vehicle
        final newVeh = await ApiClient.instance.post('/me/vehicles', data: {'plate': 'LEA-100'});
        vehicleId = newVeh.data['id'];
      }

      final bookingRes = await ApiClient.instance.post('/bookings', data: {
        'facilityId': widget.data['facilityId'],
        'slotId': widget.data['slotId'],
        'vehicleId': vehicleId,
        'startTime': startTime.toIso8601String(),
        'durationHours': 2,
      });

      if (!mounted) return;
      context.push('/pay/${bookingRes.data['id']}');
    } catch (e) {
      setState(() => _error = 'Failed to create booking hold. Slot may be unavailable.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Booking Summary')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Confirm Reservation', style: AppTypography.heading1),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      const Text('Slot Code:'),
                      Text(widget.data['slotCode'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                    ]),
                    const Divider(height: 24),
                    const Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Text('Duration:'),
                      Text('2 Hours', style: TextStyle(fontWeight: FontWeight.bold)),
                    ]),
                    const Divider(height: 24),
                    const Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Text('Total Amount:'),
                      Text('PKR 400', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryBlue, fontSize: 20)),
                    ]),
                  ],
                ),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const Spacer(),
            PrimaryButton(
              label: 'Proceed to Pay',
              isLoading: _isLoading,
              onPressed: _createBookingHold,
            ),
          ],
        ),
      ),
    );
  }
}
