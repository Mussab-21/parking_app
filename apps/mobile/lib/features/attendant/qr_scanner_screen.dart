import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_colors.dart';

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  final MobileScannerController _cameraController = MobileScannerController();
  bool _isProcessing = false;

  void _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final String? code = barcodes.first.rawValue;
    if (code == null) return;

    _processTicket(code);
  }

  Future<void> _processTicket(String code) async {
    setState(() => _isProcessing = true);

    try {
      final res = await ApiClient.instance.post('/staff/scan', data: {'qrToken': code});
      if (!mounted) return;

      final data = res.data;
      final isAlreadyCheckedIn = data['result'] == 'ALREADY_CHECKED_IN';

      if (isAlreadyCheckedIn) {
        // Vehicle is already checked in -> offer Exit checkout
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Text('VEHICLE CHECKED IN', style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Driver: ${data['driverName']}'),
                Text('Plate: ${data['plate']}'),
                Text('Slot: ${data['slotCode']}'),
                const SizedBox(height: 12),
                const Text('Vehicle is currently parked. Process vehicle exit now?'),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  setState(() => _isProcessing = false);
                },
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryBlue),
                onPressed: () async {
                  Navigator.of(ctx).pop();
                  await _processExit(data['bookingId']);
                },
                child: const Text('Confirm Exit', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
      } else {
        // Successful entry check-in
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Text('ENTRY CONFIRMED', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Slot: ${data['slotCode']}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('Plate: ${data['plate']}'),
                Text('Driver: ${data['driverName']}'),
                const Divider(),
                const Text('Check-in status: Active in slot.', style: TextStyle(color: Colors.grey, fontSize: 12)),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  setState(() => _isProcessing = false);
                },
                child: const Text('Done'),
              ),
            ],
          ),
        );
      }
    } on DioException catch (e) {
      if (!mounted) return;
      final errorMsg = e.response?.data?['message'] ?? 'QR ticket is invalid, expired, or for another facility.';
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Text('SCAN ERROR', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          content: Text(errorMsg.toString()),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                setState(() => _isProcessing = false);
              },
              child: const Text('OK'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Text('SCAN ERROR', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          content: Text(e.toString()),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                setState(() => _isProcessing = false);
              },
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
  }

  Future<void> _processExit(String bookingId) async {
    setState(() => _isProcessing = true);
    try {
      final res = await ApiClient.instance.post('/staff/exit/$bookingId');
      if (!mounted) return;

      final overstayPkr = res.data['overstayAmountPkr'] ?? 0;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Text('EXIT RECORDED', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Booking session completed successfully.'),
              const SizedBox(height: 8),
              if (overstayPkr > 0)
                Text('Overstay Fee: PKR $overstayPkr', style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold))
              else
                const Text('Overstay: None (Within time window)', style: TextStyle(color: Colors.green)),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                setState(() => _isProcessing = false);
              },
              child: const Text('OK'),
            ),
          ],
        ),
      );
    } on DioException catch (err) {
      if (!mounted) return;
      final msg = err.response?.data?['message'] ?? 'Failed to complete exit.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg.toString())));
      setState(() => _isProcessing = false);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to complete exit.')));
      setState(() => _isProcessing = false);
    }
  }

  void _showManualInputDialog() {
    final textController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Manual Entry / Simulator'),
        content: TextField(
          controller: textController,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Ticket Token or Reference',
            hintText: 'e.g. PSP1.TICKET_... or PB-...',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              if (textController.text.trim().isNotEmpty) {
                _processTicket(textController.text.trim());
              }
            },
            child: const Text('Verify'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan QR Ticket'),
        actions: [
          IconButton(
            icon: const Icon(Icons.keyboard),
            tooltip: 'Manual Code Entry',
            onPressed: _showManualInputDialog,
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _cameraController,
            onDetect: _onDetect,
          ),
          if (_isProcessing)
            Container(
              color: Colors.black45,
              child: const Center(child: CircularProgressIndicator()),
            ),
          Positioned(
            bottom: 24,
            left: 24,
            right: 24,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.brandNavy,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              icon: const Icon(Icons.edit_note, color: Colors.white),
              label: const Text('Type Code Manually', style: TextStyle(color: Colors.white, fontSize: 16)),
              onPressed: _showManualInputDialog,
            ),
          ),
        ],
      ),
    );
  }
}
