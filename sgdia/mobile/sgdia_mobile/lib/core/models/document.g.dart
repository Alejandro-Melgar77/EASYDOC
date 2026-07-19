part of 'document.dart';

Document _$DocumentFromJson(Map<String, dynamic> json) => Document(
  id: json['id'] as String? ?? '',
  title: json['title'] as String? ?? '',
  filename: json['filename'] as String? ?? '',
  contentType: json['content_type'] as String? ?? '',
  sizeBytes: (json['size_bytes'] as num?)?.toInt() ?? 0,
  description: json['description'] as String?,
  tags: (json['tags'] as List<dynamic>? ?? const <dynamic>[])
      .map((item) => item as String)
      .toList(),
  folderId: json['folder_id'] as String?,
  ownerId: json['owner_id'] as String? ?? '',
  fileKey: json['file_key'] as String? ?? '',
  version: (json['version'] as num?)?.toInt() ?? 1,
  isActive: json['is_active'] as bool? ?? true,
  createdAt: DateTime.parse(json['created_at'] as String),
  updatedAt: DateTime.parse(json['updated_at'] as String),
);

Map<String, dynamic> _$DocumentToJson(Document instance) => <String, dynamic>{
  'id': instance.id,
  'title': instance.title,
  'filename': instance.filename,
  'content_type': instance.contentType,
  'size_bytes': instance.sizeBytes,
  'description': instance.description,
  'tags': instance.tags,
  'folder_id': instance.folderId,
  'owner_id': instance.ownerId,
  'file_key': instance.fileKey,
  'version': instance.version,
  'is_active': instance.isActive,
  'created_at': instance.createdAt.toIso8601String(),
  'updated_at': instance.updatedAt.toIso8601String(),
};
