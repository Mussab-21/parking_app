import 'package:flutter/material.dart';

class PlateField extends StatelessWidget {
  final TextEditingController controller;
  final String? errorText;

  const PlateField({
    super.key,
    required this.controller,
    this.errorText,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      textCapitalization: TextCapitalization.characters,
      decoration: InputDecoration(
        labelText: 'Car Registration Plate',
        hintText: 'LEA-1234',
        prefixIcon: const Icon(Icons.directions_car),
        errorText: errorText,
      ),
    );
  }
}
