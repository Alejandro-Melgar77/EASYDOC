import 'dart:convert';

class JwtHelper {
  static Map<String, dynamic> decode(String token) {
    final parts = token.split('.');
    if (parts.length != 3) {
      throw const FormatException('Invalid token format');
    }
    final payload = parts[1];
    var normalized = base64Url.normalize(payload);
    final resp = utf8.decode(base64Url.decode(normalized));
    return json.decode(resp);
  }

  static bool isExpired(String token) {
    try {
      final decoded = decode(token);
      final exp = decoded['exp'] as int?;
      if (exp == null) return false;

      final expiryTime = DateTime.fromMillisecondsSinceEpoch(exp * 1000);
      return DateTime.now().isAfter(expiryTime);
    } catch (_) {
      return true;
    }
  }

  static bool shouldRefresh(
    String token, {
    Duration threshold = const Duration(minutes: 5),
  }) {
    try {
      final decoded = decode(token);
      final exp = decoded['exp'] as int?;
      if (exp == null) return false;

      final expiryTime = DateTime.fromMillisecondsSinceEpoch(exp * 1000);
      final refreshTime = expiryTime.subtract(threshold);
      return DateTime.now().isAfter(refreshTime);
    } catch (_) {
      return true;
    }
  }
}
