import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('ParkSmart app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: ParkSmartApp()));
    await tester.pumpAndSettle(const Duration(seconds: 2));
    expect(find.byType(ParkSmartApp), findsOneWidget);
  });
}
