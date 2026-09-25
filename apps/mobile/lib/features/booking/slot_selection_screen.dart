import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/widgets/slot_tile.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/error_state_widget.dart';
import '../../core/widgets/empty_state_widget.dart';
import '../../core/network/api_client.dart';

class SlotSelectionScreen extends StatefulWidget {
  final String facilityId;
  final Map<String, dynamic>? bookingParams;

  const SlotSelectionScreen({
    super.key,
    required this.facilityId,
    this.bookingParams,
  });

  @override
  State<SlotSelectionScreen> createState() => _SlotSelectionScreenState();
}

class _SlotSelectionScreenState extends State<SlotSelectionScreen> {
  List<dynamic> _slots = [];
  String? _selectedSlotId;
  String? _selectedSlotCode;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchAvailability();
  }

  Future<void> _fetchAvailability() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _selectedSlotId = null;
      _selectedSlotCode = null;
    });

    try {
      String startTimeStr;
      int hours = 2;

      if (widget.bookingParams != null && widget.bookingParams!['startTime'] != null) {
        startTimeStr = widget.bookingParams!['startTime'];
        hours = widget.bookingParams!['durationHours'] ?? 2;
      } else {
        final now = DateTime.now();
        final aligned = DateTime(now.year, now.month, now.day, now.hour + 1, (now.minute < 30 ? 30 : 0), 0, 0);
        startTimeStr = aligned.toIso8601String();
      }

      final res = await ApiClient.instance.get('/facilities/${widget.facilityId}/availability', queryParameters: {
        'start': startTimeStr,
        'hours': hours,
      });

      if (res.data is Map && res.data['slots'] is List) {
        setState(() {
          _slots = res.data['slots'] as List<dynamic>;
          _isLoading = false;
        });
        return;
      }
      throw Exception('Unexpected availability data format');
    } catch (_) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load slot availability. Please check your connection and try again.';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Select Slot')),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: SingleChildScrollView(
          child: ErrorStateWidget(
            message: _errorMessage!,
            onRetry: _fetchAvailability,
          ),
        ),
      );
    }

    if (_slots.isEmpty) {
      return const Center(
        child: EmptyStateWidget(
          title: 'No Slots Found',
          subtitle: 'There are no active parking slots configured for this facility.',
          icon: Icons.grid_off,
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
                  Expanded(
                    child: GridView.builder(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 4,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: _slots.length,
                      itemBuilder: (context, index) {
                        final s = _slots[index];
                        final isSelected = s['id'] == _selectedSlotId;

                        SlotState state = SlotState.available;
                        if (s['state'] == 'Reserved') state = SlotState.reserved;
                        if (s['state'] == 'Occupied') state = SlotState.occupied;
                        if (s['state'] == 'Unavailable') state = SlotState.unavailable;
                        if (isSelected) state = SlotState.selected;

                        return SlotTile(
                          slotCode: s['slotCode'],
                          state: state,
                          onTap: () {
                            setState(() {
                              _selectedSlotId = s['id'];
                              _selectedSlotCode = s['slotCode'];
                            });
                          },
                        );
                      },
                    ),
                  ),
                  PrimaryButton(
                    label: _selectedSlotCode != null ? 'Continue with Slot $_selectedSlotCode' : 'Select a Slot',
                    onPressed: _selectedSlotId != null
                        ? () {
                            final summaryData = <String, dynamic>{
                              'facilityId': widget.facilityId,
                              'slotId': _selectedSlotId,
                              'slotCode': _selectedSlotCode,
                            };
                            if (widget.bookingParams != null) {
                              summaryData.addAll(widget.bookingParams!);
                            }
                            context.push(
                              '/book/summary',
                              extra: summaryData,
                            );
                          }
                        : null,
                  ),
                ],
              ),
            );
  }
}
