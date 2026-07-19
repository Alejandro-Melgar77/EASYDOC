import 'package:json_annotation/json_annotation.dart';

part 'conversation.g.dart';

@JsonSerializable()
class Conversation {
  final String id;
  final String title;
  final DateTime lastMessageAt;
  final String userId;

  Conversation({
    required this.id,
    required this.title,
    required this.lastMessageAt,
    required this.userId,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) =>
      _$ConversationFromJson(json);
  Map<String, dynamic> toJson() => _$ConversationToJson(this);
}
