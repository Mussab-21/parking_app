import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

enum SlotState { available, selected, reserved, occupied, unavailable }

class SlotTile extends StatelessWidget {
  final String slotCode;
  final SlotState state;
  final VoidCallback? onTap;

  const SlotTile({
    super.key,
    required this.slotCode,
    required this.state,
    this.onTap,
  });

  Color _getColor() {
    switch (state) {
      case SlotState.available:
        return AppColors.slotAvailable;
      case SlotState.selected:
        return AppColors.slotSelected;
      case SlotState.reserved:
        return AppColors.slotReserved;
      case SlotState.occupied:
        return AppColors.slotOccupied;
      case SlotState.unavailable:
        return AppColors.slotUnavailable;
    }
  }

  IconData _getIcon() {
    switch (state) {
      case SlotState.available:
        return Icons.local_parking;
      case SlotState.selected:
        return Icons.check_circle;
      case SlotState.reserved:
        return Icons.access_time;
      case SlotState.occupied:
        return Icons.directions_car;
      case SlotState.unavailable:
        return Icons.block;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _getColor();
    final isSelectable = state == SlotState.available || state == SlotState.selected;

    return InkWell(
      onTap: isSelectable ? onTap : null,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          border: Border.all(color: color, width: state == SlotState.selected ? 2.5 : 1.5),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(_getIcon(), size: 20, color: color),
            const SizedBox(height: 2),
            Text(
              slotCode,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
