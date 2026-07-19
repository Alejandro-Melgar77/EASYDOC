part of 'user.dart';

User _$UserFromJson(Map<String, dynamic> json) => User(
  id: json['id'] as String? ?? '',
  email: json['email'] as String? ?? '',
  fullName: json['full_name'] as String? ?? '',
  role: json['role'] as String?,
  isActive: json['is_active'] as bool? ?? true,
  createdAt: json['created_at'] == null
      ? null
      : DateTime.parse(json['created_at'] as String),
);

Map<String, dynamic> _$UserToJson(User instance) => <String, dynamic>{
  'id': instance.id,
  'email': instance.email,
  'full_name': instance.fullName,
  'role': instance.role,
  'is_active': instance.isActive,
  'created_at': instance.createdAt?.toIso8601String(),
};
