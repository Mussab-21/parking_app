import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class CountdownTimerWidget extends StatefulWidget {
  final DateTime expiresAt;
  final VoidCallback onExpired;

  const CountdownTimerWidget({
    super.key,
    required this.expiresAt,
    required this.onExpired,
  });

  @override
  State<CountdownTimerWidget> createState() => _CountdownTimerWidgetState();
}

class _CountdownTimerWidgetState extends State<CountdownTimerWidget> {
  Timer? _timer;
  Duration _remaining = Duration.zero;

  @override
  void initState() {
    super.initState();
    _updateRemaining();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _updateRemaining());
  }

  void _updateRemaining() {
    final now = DateTime.now();
    final diff = widget.expiresAt.difference(now);
    if (diff.isNegative) {
      _timer?.cancel();
      setState(() {
        _remaining = Duration.zero;
      });
      widget.onExpired();
    } else {
      setState(() {
        _remaining = diff;
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final minutes = _remaining.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = _remaining.inSeconds.remainder(60).toString().padLeft(2, '0');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.warningAmber.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.warningAmber),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.timer, color: AppColors.warningAmber),
          const SizedBox(width: 8),
          Text(
            'Hold expires in $minutes:$seconds',
            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.brandNavy),
          ),
        ],
      ),
    );
  }
}
