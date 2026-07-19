import 'package:dio/dio.dart';
import '../config/environment.dart';
import '../storage/secure_storage.dart';
import '../utils/jwt_helper.dart';

class ApiClient {
  late final Dio _dio;
  final SecureStorage _secureStorage = SecureStorage();

  ApiClient() {
    _dio = Dio(
      BaseOptions(
        baseUrl: Environment.apiUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          var token = await _secureStorage.getAccessToken();
          if (token != null) {
            if (JwtHelper.shouldRefresh(token)) {
              final refreshToken = await _secureStorage.getRefreshToken();
              if (refreshToken != null) {
                try {
                  final response = await Dio().post(
                    '${Environment.apiUrl}/auth/refresh',
                    data: {'refresh_token': refreshToken},
                  );
                  final data = response.data;
                  final newAccess = data['access_token'];
                  final newRefresh = data['refresh_token'];
                  await _secureStorage.saveTokens(
                    accessToken: newAccess,
                    refreshToken: newRefresh,
                  );
                  token = newAccess;
                } catch (_) {
                  await _secureStorage.deleteAll();
                  token = null;
                }
              }
            }
            if (token != null) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          if (e.response?.statusCode == 401) {
            await _secureStorage.deleteAll();
            // The application router or auth provider should handle redirecting to login.
          }
          return handler.next(e);
        },
      ),
    );
  }

  Dio get dio => _dio;
}
