import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/requests/presentation/dynamic_request_form_screen.dart';
import '../../features/requests/presentation/service_catalog_screen.dart';
import '../../features/requests/presentation/tracking_screen.dart';
import '../../features/tasks/presentation/task_list_screen.dart';
import '../storage/secure_storage.dart';

final appRouter = GoRouter(
  initialLocation: '/splash',
  redirect: (context, state) async {
    final token = await SecureStorage().getAccessToken();
    final location = state.matchedLocation;
    final isGuestRoute = location.startsWith('/guest');
    if (token == null &&
        !isGuestRoute &&
        location != '/login' &&
        location != '/splash') {
      return '/login';
    }
    if (token != null && location == '/login') {
      return '/tasks';
    }
    return null;
  },
  routes: [
    GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(
      path: '/tasks',
      builder: (context, state) => const TaskListScreen(),
    ),
    GoRoute(
      path: '/guest/services',
      builder: (context, state) => const ServiceCatalogScreen(),
    ),
    GoRoute(
      path: '/guest/request/:policyId',
      builder: (context, state) =>
          DynamicRequestFormScreen(policyId: state.pathParameters['policyId']!),
    ),
    GoRoute(
      path: '/guest/track',
      builder: (context, state) => TrackingScreen(
        initialCode: state.uri.queryParameters['code'],
        initialPin: state.uri.queryParameters['pin'],
      ),
    ),
  ],
);
