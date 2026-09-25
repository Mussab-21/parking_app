import 'package:flutter/material.dart';

class PhoneField extends StatelessWidget {
  final TextEditingController controller;
  final String? errorText;

  const PhoneField({
    super.key,
    required this.controller,
    this.errorText,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.phone,
      decoration: InputDecoration(
        labelText: 'Phone Number',
        hintText: '3001234567',
        prefixIcon: const Padding(
          padding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          child: Text('+92 ', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        ),
        errorText: errorText,
      ),
    );
  }
}
