import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../data/guest_request_repository.dart';

final guestRequestRepositoryProvider = Provider<GuestRequestRepository>((ref) {
  return GuestRequestRepository(apiClient: ref.watch(apiClientProvider));
});
