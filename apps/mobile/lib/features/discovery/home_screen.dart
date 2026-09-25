import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../core/network/api_client.dart';
import '../../core/widgets/error_state_widget.dart';
import '../../core/widgets/empty_state_widget.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<dynamic> _facilities = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchFacilities();
  }

  Future<void> _fetchFacilities() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await ApiClient.instance.get('/facilities');
      if (res.data is List) {
        setState(() {
          _facilities = res.data;
          _isLoading = false;
        });
        return;
      }
      throw Exception('Unexpected data format');
    } catch (_) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Cannot connect to backend server (${ApiClient.instance.options.baseUrl}). Make sure the API is running.';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('ParkSmart'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () => context.push('/profile'),
          ),
          IconButton(
            icon: const Icon(Icons.bookmark),
            onPressed: () => context.push('/bookings'),
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            color: AppColors.brandNavy,
            padding: const EdgeInsets.all(16),
            child: TextField(
              readOnly: true,
              onTap: () => context.push('/search'),
              decoration: InputDecoration(
                hintText: 'Search city or plaza name...',
                prefixIcon: const Icon(Icons.search, color: AppColors.primaryBlue),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(24)),
              ),
            ),
          ),
          Expanded(
            child: _buildBody(),
          ),
        ],
      ),
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
            onRetry: _fetchFacilities,
          ),
        ),
      );
    }

    if (_facilities.isEmpty) {
      return const Center(
        child: EmptyStateWidget(
          title: 'No Facilities Found',
          subtitle: 'There are currently no approved parking facilities available.',
          icon: Icons.local_parking,
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _facilities.length,
      itemBuilder: (context, index) {
        final f = _facilities[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            title: Text(f['name'] ?? 'Facility', style: AppTypography.heading3),
            subtitle: Text('${f['address'] ?? ''}, ${f['city'] ?? ''}'),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('PKR ${parseNum(f['hourly_rate_paisa'] ?? f['hourlyRatePaisa']) / 100}/h',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryBlue)),
                const Text('Available', style: TextStyle(color: AppColors.successTeal, fontSize: 12)),
              ],
            ),
            onTap: () => context.push('/facility/${f['id']}'),
          ),
        );
      },
    );
  }

  num parseNum(dynamic val) => num.tryParse(val.toString()) ?? 0;
}
