import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sgdia_mobile/main.dart';

void main() {
  testWidgets('EASYDOC app renders smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const SgdiaApp());

    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
