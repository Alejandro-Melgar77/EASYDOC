class Message {
  final String id;
  final String text;
  final bool isUser;
  final DateTime createdAt;
  final List<String>? citedDocumentIds;
  final String? audioUrl;
  final int? feedback; // 1 for thumbs up, -1 for thumbs down, null for none

  Message({
    required this.id,
    required this.text,
    required this.isUser,
    required this.createdAt,
    this.citedDocumentIds,
    this.audioUrl,
    this.feedback,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] ?? '',
      text: json['text'] ?? '',
      isUser: json['is_user'] ?? false,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
      citedDocumentIds: json['cited_document_ids'] != null
          ? List<String>.from(json['cited_document_ids'])
          : null,
      audioUrl: json['audio_url'],
      feedback: json['feedback'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
      'is_user': isUser,
      'created_at': createdAt.toIso8601String(),
      'cited_document_ids': citedDocumentIds,
      'audio_url': audioUrl,
      'feedback': feedback,
    };
  }
}
