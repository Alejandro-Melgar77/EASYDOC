import 'package:json_annotation/json_annotation.dart';

part 'document.g.dart';

@JsonSerializable()
class Document {
  final String id;
  final String title;
  final String filename;
  @JsonKey(name: 'content_type')
  final String contentType;
  @JsonKey(name: 'size_bytes')
  final int sizeBytes;
  final String? description;
  final List<String> tags;
  @JsonKey(name: 'folder_id')
  final String? folderId;
  @JsonKey(name: 'owner_id')
  final String ownerId;
  @JsonKey(name: 'file_key')
  final String fileKey;
  final int version;
  @JsonKey(name: 'is_active')
  final bool isActive;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'updated_at')
  final DateTime updatedAt;

  Document({
    required this.id,
    required this.title,
    required this.filename,
    required this.contentType,
    required this.sizeBytes,
    this.description,
    required this.tags,
    this.folderId,
    required this.ownerId,
    required this.fileKey,
    required this.version,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Document.fromJson(Map<String, dynamic> json) =>
      _$DocumentFromJson(json);
  Map<String, dynamic> toJson() => _$DocumentToJson(this);
}
