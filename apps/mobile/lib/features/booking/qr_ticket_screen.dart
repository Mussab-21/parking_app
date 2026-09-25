import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/widgets/qr_ticket_card.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/storage/storage_service.dart';
import '../../core/network/api_client.dart';

class QrTicketScreen extends StatefulWidget {
  final String bookingId;

  const QrTicketScreen({super.key, required this.bookingId});

  @override
  State<QrTicketScreen> createState() => _QrTicketScreenState();
}

class _QrTicketScreenState extends State<QrTicketScreen> {
  Map<String, dynamic>? _ticketData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadTicket();
  }

  Future<void> _loadTicket() async {
    // 1. Try local cache first (Offline support Section 15)
    final cached = await StorageService.getCachedTicket(widget.bookingId);
    if (cached != null) {
      setState(() {
        _ticketData = cached;
        _isLoading = false;
      });
      return;
    }

    // 2. Fetch from API if online
    try {
      final res = await ApiClient.instance.get('/bookings/${widget.bookingId}');
      final booking = res.data;

      final data = {
        'qrToken': 'PSP1.TICKET_${booking['id']}',
        'bookingRef': booking['reference'],
        'slotCode': booking['slot_code'],
        'facilityName': booking['facility_name'],
        'validFrom': booking['start_time'].toString().substring(11, 16),
        'validUntil': booking['end_time'].toString().substring(11, 16),
      };

      await StorageService.cacheTicket(widget.bookingId, data);

      setState(() {
        _ticketData = data;
        _isLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(appBar: AppBar(), body: const Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Parking QR Ticket')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            QrTicketCard(
              qrToken: _ticketData!['qrToken'],
              bookingRef: _ticketData!['bookingRef'],
              slotCode: _ticketData!['slotCode'],
              facilityName: _ticketData!['facilityName'],
              validFrom: _ticketData!['validFrom'],
              validUntil: _ticketData!['validUntil'],
            ),
            const Spacer(),
            PrimaryButton(
              label: 'Back to Home',
              onPressed: () => context.go('/home'),
            ),
          ],
        ),
      ),
    );
  }
}
