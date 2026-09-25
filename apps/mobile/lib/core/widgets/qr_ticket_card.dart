import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../theme/app_colors.dart';

class QrTicketCard extends StatelessWidget {
  final String qrToken;
  final String bookingRef;
  final String slotCode;
  final String facilityName;
  final String validFrom;
  final String validUntil;

  const QrTicketCard({
    super.key,
    required this.qrToken,
    required this.bookingRef,
    required this.slotCode,
    required this.facilityName,
    required this.validFrom,
    required this.validUntil,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 10,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Column(
        children: [
          Text(facilityName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.brandNavy)),
          const SizedBox(height: 4),
          Text('Slot: $slotCode | Ref: $bookingRef', style: const TextStyle(fontSize: 16, color: AppColors.primaryBlue, fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: Colors.black, width: 2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: QrImageView(
              data: qrToken,
              version: QrVersions.auto,
              size: 200.0,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Column(
                children: [
                  const Text('Valid From', style: TextStyle(fontSize: 12, color: AppColors.neutral500)),
                  Text(validFrom, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                ],
              ),
              Column(
                children: [
                  const Text('Valid Until', style: TextStyle(fontSize: 12, color: AppColors.neutral500)),
                  Text(validUntil, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
