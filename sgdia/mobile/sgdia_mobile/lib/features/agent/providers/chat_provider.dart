import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/models/conversation.dart';
import '../../../core/models/message.dart';
import '../data/chat_repository.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(); // Or however it is initialized
});

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ChatRepository(apiClient: apiClient);
});

final conversationsProvider = FutureProvider<List<Conversation>>((ref) async {
  final repository = ref.watch(chatRepositoryProvider);
  return repository.getConversations();
});

final messagesProvider = FutureProvider.family<List<Message>, String>((
  ref,
  conversationId,
) async {
  final repository = ref.watch(chatRepositoryProvider);
  return repository.getMessages(conversationId);
});
