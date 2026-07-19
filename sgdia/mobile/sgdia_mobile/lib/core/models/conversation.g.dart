part of 'conversation.dart';

Conversation _$ConversationFromJson(Map<String, dynamic> json) => Conversation(
  id: json['id'] as String? ?? '',
  title: json['title'] as String? ?? '',
  lastMessageAt: DateTime.parse(json['lastMessageAt'] as String),
  userId: json['userId'] as String? ?? '',
);

Map<String, dynamic> _$ConversationToJson(Conversation instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'lastMessageAt': instance.lastMessageAt.toIso8601String(),
      'userId': instance.userId,
    };
