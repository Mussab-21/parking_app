import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
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
  String? _vehiclePlate;
  String? _vehicleId;

  late DateTime _startTime;
  late int _durationHours;
  late double _hourlyRate;

  @override
  void initState() {
    super.initState();
    _initParams();
    _fetchVehicle();
  }

  void _initParams() {
    _durationHours = widget.data['durationHours'] is int
        ? widget.data['durationHours']
        : int.tryParse(widget.data['durationHours']?.toString() ?? '2') ?? 2;

    _hourlyRate = widget.data['hourlyRate'] is num
        ? (widget.data['hourlyRate'] as num).toDouble()
        : double.tryParse(widget.data['hourlyRate']?.toString() ?? '200') ?? 200.0;

    if (widget.data['startTime'] != null) {
      final parsed = DateTime.tryParse(widget.data['startTime'].toString());
      if (parsed != null) {
        _startTime = _cleanTimeGrid(parsed);
      } else {
        _startTime = _defaultNext30Min();
      }
    } else {
      _startTime = _defaultNext30Min();
    }
  }

  DateTime _cleanTimeGrid(DateTime dt) {
    int minute = dt.minute;
    int roundedMinute = (minute < 30) ? 0 : 30;
    return DateTime(dt.year, dt.month, dt.day, dt.hour, roundedMinute, 0, 0);
  }

  DateTime _defaultNext30Min() {
    final now = DateTime.now().add(const Duration(minutes: 20));
    int minute = now.minute < 30 ? 30 : 0;
    int hour = now.minute < 30 ? now.hour : now.hour + 1;
    return DateTime(now.year, now.month, now.day, hour, minute, 0, 0);
  }

  Future<void> _fetchVehicle() async {
    try {
      final vehRes = await ApiClient.instance.get('/me/vehicles');
      if (vehRes.data is List && (vehRes.data as List).isNotEmpty) {
        final first = vehRes.data[0];
        if (mounted) {
          setState(() {
            _vehicleId = first['id'];
            _vehiclePlate = first['plate_normalised'] ?? first['plate_raw'];
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _createBookingHold() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // 1. Ensure user has a vehicle
      String targetVehicleId = _vehicleId ?? '';
      if (targetVehicleId.isEmpty) {
        final vehRes = await ApiClient.instance.get('/me/vehicles');
        if (vehRes.data is List && (vehRes.data as List).isNotEmpty) {
          targetVehicleId = vehRes.data[0]['id'];
        } else {
          final newVeh = await ApiClient.instance.post('/me/vehicles', data: {'plate': 'LEA-100'});
          targetVehicleId = newVeh.data['id'];
        }
      }

      // 2. Strict 30-minute grid alignment formatted for API
      final alignedUtc = DateTime.utc(
        _startTime.year,
        _startTime.month,
        _startTime.day,
        _startTime.hour,
        _startTime.minute,
        0,
        0,
      );

      final bookingRes = await ApiClient.instance.post('/bookings', data: {
        'facilityId': widget.data['facilityId'],
        'slotId': widget.data['slotId'],
        'vehicleId': targetVehicleId,
        'startTime': alignedUtc.toIso8601String(),
        'durationHours': _durationHours,
      });

      if (!mounted) return;
      context.push('/pay/${bookingRes.data['id']}');
    } catch (e) {
      String msg = 'Failed to create booking hold. Slot may be unavailable.';
      if (e is DioException) {
        if (e.response?.data is Map && e.response?.data['message'] != null) {
          msg = e.response!.data['message'].toString();
        } else if (e.type == DioExceptionType.connectionError) {
          msg = 'Cannot reach API server. Please check your internet connection.';
        }
      }
      setState(() => _error = msg);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final endTime = _startTime.add(Duration(hours: _durationHours));
    final totalAmount = _hourlyRate * _durationHours;
    final slotCode = widget.data['slotCode'] ?? 'General';
    final facilityName = widget.data['facilityName'] ?? 'Parking Facility';

    return Scaffold(
      appBar: AppBar(title: const Text('Booking Summary')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Confirm Reservation', style: AppTypography.heading1),
            const SizedBox(height: 6),
            Text(facilityName, style: AppTypography.bodyLarge),
            const SizedBox(height: 20),

            Card(
              elevation: 0,
              color: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Parking Slot:', style: TextStyle(fontSize: 15, color: Colors.grey)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.successTeal.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            slotCode,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.successTeal),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Arrival Time:', style: TextStyle(fontSize: 15, color: Colors.grey)),
                        Text(
                          DateFormat('MMM d, h:mm a').format(_startTime),
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Exit Time:', style: TextStyle(fontSize: 15, color: Colors.grey)),
                        Text(
                          DateFormat('h:mm a').format(endTime),
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Duration:', style: TextStyle(fontSize: 15, color: Colors.grey)),
                        Text(
                          '$_durationHours ${_durationHours == 1 ? "Hour" : "Hours"}',
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                        ),
                      ],
                    ),
                    if (_vehiclePlate != null) ...[
                      const Divider(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Vehicle:', style: TextStyle(fontSize: 15, color: Colors.grey)),
                          Text(
                            _vehiclePlate!,
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                          ),
                        ],
                      ),
                    ],
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Amount:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Text(
                          'PKR ${totalAmount.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppColors.primaryBlue,
                            fontSize: 22,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: 16),
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

            const SizedBox(height: 32),
            PrimaryButton(
              label: 'Proceed to Payment (Hold Slot)',
              isLoading: _isLoading,
              onPressed: _createBookingHold,
            ),
          ],
        ),
      ),
    );
  }
}
