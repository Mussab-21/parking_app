import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/network/api_client.dart';

import '../../core/widgets/error_state_widget.dart';
import '../../core/widgets/empty_state_widget.dart';

class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  List<dynamic> _bookings = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchBookings();
  }

  Future<void> _fetchBookings() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final res = await ApiClient.instance.get('/bookings');
      if (res.data is List) {
        setState(() {
          _bookings = res.data;
          _isLoading = false;
        });
        return;
      }
      throw Exception('Unexpected data format');
    } catch (_) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load bookings. Please check your network connection.';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Bookings')),
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
            onRetry: _fetchBookings,
          ),
        ),
      );
    }

    if (_bookings.isEmpty) {
      return const Center(
        child: EmptyStateWidget(
          title: 'No Bookings Yet',
          subtitle: 'You have not booked any parking slots yet.',
          icon: Icons.bookmark_border,
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _bookings.length,
      itemBuilder: (context, index) {
        final b = _bookings[index];
        return Card(
          child: ListTile(
            title: Text('${b['facility_name'] ?? 'Facility'} (${b['slot_code'] ?? 'Slot'})'),
            subtitle: Text('Ref: ${b['reference'] ?? ''} | Status: ${b['status'] ?? ''}'),
            onTap: () => context.push('/ticket/${b['id']}'),
          ),
        );
      },
    );
  }
}
