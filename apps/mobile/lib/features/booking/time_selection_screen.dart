import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/network/api_client.dart';

class TimeSelectionScreen extends StatefulWidget {
  final String facilityId;

  const TimeSelectionScreen({super.key, required this.facilityId});

  @override
  State<TimeSelectionScreen> createState() => _TimeSelectionScreenState();
}

class _TimeSelectionScreenState extends State<TimeSelectionScreen> {
  bool _isLoadingFacility = true;
  String? _facilityName;
  double _hourlyRate = 200.0;

  late DateTime _selectedDate;
  late TimeOfDay _selectedTime;
  int _durationHours = 2;

  final List<DateTime> _availableDates = [];
  final List<TimeOfDay> _availableTimes = [];

  @override
  void initState() {
    super.initState();
    _initDateAndTimes();
    _loadFacilityInfo();
  }

  void _initDateAndTimes() {
    final now = DateTime.now();
    // 7 days window
    for (int i = 0; i < 7; i++) {
      final date = DateTime(now.year, now.month, now.day).add(Duration(days: i));
      _availableDates.add(date);
    }
    _selectedDate = _availableDates.first;

    _generateTimesForSelectedDate();
  }

  void _generateTimesForSelectedDate() {
    _availableTimes.clear();
    final now = DateTime.now();
    final isToday = _selectedDate.year == now.year &&
        _selectedDate.month == now.month &&
        _selectedDate.day == now.day;

    int startHour = 0;
    int startMinute = 0;

    if (isToday) {
      // Find the next 30-minute interval at least 15 minutes ahead
      DateTime minTime = now.add(const Duration(minutes: 15));
      if (minTime.minute == 0) {
        startMinute = 0;
        startHour = minTime.hour;
      } else if (minTime.minute <= 30) {
        startMinute = 30;
        startHour = minTime.hour;
      } else {
        startMinute = 0;
        startHour = minTime.hour + 1;
      }
    } else {
      startHour = 6; // Start from 6:00 AM on future days
      startMinute = 0;
    }

    for (int h = startHour; h < 24; h++) {
      if (h == startHour && startMinute == 30) {
        _availableTimes.add(TimeOfDay(hour: h, minute: 30));
      } else {
        _availableTimes.add(TimeOfDay(hour: h, minute: 0));
        _availableTimes.add(TimeOfDay(hour: h, minute: 30));
      }
    }

    if (_availableTimes.isNotEmpty) {
      _selectedTime = _availableTimes.first;
    } else {
      // Fallback if late at night
      _selectedTime = const TimeOfDay(hour: 0, minute: 0);
    }
  }

  Future<void> _loadFacilityInfo() async {
    try {
      final res = await ApiClient.instance.get('/facilities/${widget.facilityId}');
      if (mounted) {
        final fac = res.data['facility'];
        final rate = (num.tryParse(fac['hourly_rate_paisa'].toString()) ?? 20000) / 100;
        setState(() {
          _facilityName = fac['name'];
          _hourlyRate = rate;
          _isLoadingFacility = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoadingFacility = false);
      }
    }
  }

  DateTime _buildSelectedDateTime() {
    return DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _selectedTime.hour,
      _selectedTime.minute,
      0,
      0,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingFacility) {
      return Scaffold(
        appBar: AppBar(title: const Text('Select Schedule')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final startDateTime = _buildSelectedDateTime();
    final endDateTime = startDateTime.add(Duration(hours: _durationHours));
    final totalAmount = _hourlyRate * _durationHours;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Date & Time'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_facilityName != null) ...[
              Text(
                _facilityName!,
                style: AppTypography.heading2,
              ),
              const SizedBox(height: 4),
              const Text(
                'Choose when you plan to arrive and your parking duration',
                style: AppTypography.bodyMedium,
              ),
              const SizedBox(height: 20),
            ],

            // 1. Date Selection
            const Text('Select Date', style: AppTypography.heading3),
            const SizedBox(height: 10),
            SizedBox(
              height: 70,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _availableDates.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final date = _availableDates[index];
                  final isSelected = date.year == _selectedDate.year &&
                      date.month == _selectedDate.month &&
                      date.day == _selectedDate.day;

                  final dayName = index == 0
                      ? 'Today'
                      : index == 1
                          ? 'Tmrw'
                          : DateFormat('EEE').format(date);
                  final dayNum = DateFormat('dd').format(date);

                  return InkWell(
                    onTap: () {
                      setState(() {
                        _selectedDate = date;
                        _generateTimesForSelectedDate();
                      });
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: 65,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primaryBlue : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? AppColors.primaryBlue : Colors.grey.shade300,
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            dayName,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isSelected ? Colors.white : Colors.grey.shade600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            dayNum,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: isSelected ? Colors.white : AppColors.brandNavy,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 24),

            // 2. Start Time Selection (30-min grid)
            const Text('Arrival Time (30-min interval)', style: AppTypography.heading3),
            const SizedBox(height: 10),
            if (_availableTimes.isEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text('No more slots available for today. Please select tomorrow.'),
              )
            else
              SizedBox(
                height: 48,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _availableTimes.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final time = _availableTimes[index];
                    final isSelected = time.hour == _selectedTime.hour &&
                        time.minute == _selectedTime.minute;
                    final timeStr = DateFormat('hh:mm a').format(
                      DateTime(2026, 1, 1, time.hour, time.minute),
                    );

                    return ChoiceChip(
                      label: Text(timeStr),
                      selected: isSelected,
                      selectedColor: AppColors.brandNavy,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : AppColors.brandNavy,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                      onSelected: (val) {
                        if (val) {
                          setState(() => _selectedTime = time);
                        }
                      },
                    );
                  },
                ),
              ),
            const SizedBox(height: 24),

            // 3. Duration Selection (1 to 12 hours)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Duration', style: AppTypography.heading3),
                Text(
                  '$_durationHours ${_durationHours == 1 ? "Hour" : "Hours"}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primaryBlue,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                IconButton.filledTonal(
                  icon: const Icon(Icons.remove),
                  onPressed: _durationHours > 1
                      ? () => setState(() => _durationHours--)
                      : null,
                ),
                Expanded(
                  child: Slider(
                    value: _durationHours.toDouble(),
                    min: 1,
                    max: 12,
                    divisions: 11,
                    label: '$_durationHours hrs',
                    onChanged: (val) => setState(() => _durationHours = val.toInt()),
                  ),
                ),
                IconButton.filledTonal(
                  icon: const Icon(Icons.add),
                  onPressed: _durationHours < 12
                      ? () => setState(() => _durationHours++)
                      : null,
                ),
              ],
            ),
            const SizedBox(height: 24),

            // 4. Summary Preview Card
            Card(
              elevation: 0,
              color: Colors.grey.shade100,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Time Window:', style: TextStyle(color: Colors.grey)),
                        Text(
                          '${DateFormat('MMM d, h:mm a').format(startDateTime)} – ${DateFormat('h:mm a').format(endDateTime)}',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Hourly Rate:', style: TextStyle(color: Colors.grey)),
                        Text('PKR ${_hourlyRate.toStringAsFixed(0)} / hr'),
                      ],
                    ),
                    const Divider(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Estimated Total:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Text(
                          'PKR ${totalAmount.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                            color: AppColors.primaryBlue,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),

            // 5. Proceed button
            PrimaryButton(
              label: 'View Available Slots',
              onPressed: _availableTimes.isEmpty
                  ? null
                  : () {
                      final isoStart = startDateTime.toIso8601String();
                      context.push(
                        '/book/slots/${widget.facilityId}',
                        extra: {
                          'facilityId': widget.facilityId,
                          'facilityName': _facilityName ?? 'Parking Facility',
                          'startTime': isoStart,
                          'durationHours': _durationHours,
                          'hourlyRate': _hourlyRate,
                        },
                      );
                    },
            ),
          ],
        ),
      ),
    );
  }
}
