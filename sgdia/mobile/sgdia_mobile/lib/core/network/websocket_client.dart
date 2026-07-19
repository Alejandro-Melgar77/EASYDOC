import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../config/environment.dart';
import '../storage/secure_storage.dart';

class WebSocketClient {
  WebSocketClient({SecureStorage? secureStorage})
    : _secureStorage = secureStorage ?? SecureStorage();

  final SecureStorage _secureStorage;
  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _subscription;

  Future<void> connectNotifications(
    void Function(Map<String, dynamic>) onMessage,
  ) async {
    final token = await _secureStorage.getAccessToken();
    if (token == null || token.isEmpty) return;

    await disconnect();
    final uri = Uri.parse(
      '${Environment.wsUrl}/notifications',
    ).replace(queryParameters: {'token': token});
    _channel = WebSocketChannel.connect(uri);
    _subscription = _channel!.stream.listen((event) {
      if (event is Map<String, dynamic>) {
        onMessage(event);
        return;
      }

      if (event is String) {
        final decoded = jsonDecode(event);
        if (decoded is Map<String, dynamic>) onMessage(decoded);
      }
    });
  }

  Future<void> disconnect() async {
    await _subscription?.cancel();
    _subscription = null;
    await _channel?.sink.close();
    _channel = null;
  }
}
