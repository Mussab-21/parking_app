import 'package:flutter/material.dart';
import '../network/api_client.dart';
import '../theme/app_colors.dart';

class ServerSettingsDialog extends StatefulWidget {
  const ServerSettingsDialog({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      builder: (context) => const ServerSettingsDialog(),
    );
  }

  @override
  State<ServerSettingsDialog> createState() => _ServerSettingsDialogState();
}

class _ServerSettingsDialogState extends State<ServerSettingsDialog> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: ApiClient.instance.options.baseUrl);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('API Server URL'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Specify the backend API URL. For testing on a physical phone, use your PC Wi-Fi IP (e.g. http://192.168.1.100:3000/api/v1) or cloud tunnel.',
            style: TextStyle(fontSize: 12, color: AppColors.neutral700),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            decoration: const InputDecoration(
              labelText: 'Backend URL',
              hintText: 'http://192.168.1.X:3000/api/v1',
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () {
            _controller.text = ApiClient.defaultBaseUrl;
          },
          child: const Text('Reset Default'),
        ),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () async {
            final newUrl = _controller.text.trim();
            if (newUrl.isNotEmpty) {
              await ApiClient.updateBaseUrl(newUrl);
            }
            if (context.mounted) {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Server URL set to: $newUrl')),
              );
            }
          },
          child: const Text('Save'),
        ),
      ],
    );
  }
}
