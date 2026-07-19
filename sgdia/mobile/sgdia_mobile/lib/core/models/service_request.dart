class FormQuestion {
  const FormQuestion({
    required this.id,
    required this.label,
    required this.type,
    required this.required,
    required this.options,
  });

  final String id;
  final String label;
  final String type;
  final bool required;
  final List<String> options;

  factory FormQuestion.fromJson(Map<String, dynamic> json) {
    final rawOptions = json['options'];
    final options = rawOptions is List
        ? rawOptions.whereType<String>().toList()
        : rawOptions is String && rawOptions.isNotEmpty
        ? rawOptions
              .split(',')
              .map((item) => item.trim())
              .where((item) => item.isNotEmpty)
              .toList()
        : <String>[];
    return FormQuestion(
      id: json['id'] as String,
      label: json['label'] as String,
      type: json['type'] as String? ?? 'text',
      required: json['required'] as bool? ?? true,
      options: options,
    );
  }
}

class AttachmentRequirement {
  const AttachmentRequirement({
    required this.id,
    required this.label,
    required this.acceptedFormats,
    required this.required,
  });

  final String id;
  final String label;
  final String acceptedFormats;
  final bool required;

  factory AttachmentRequirement.fromJson(Map<String, dynamic> json) {
    return AttachmentRequirement(
      id: json['id'] as String,
      label: json['label'] as String,
      acceptedFormats: json['acceptedFormats'] as String? ?? '',
      required: json['required'] as bool? ?? true,
    );
  }
}

class PublicService {
  const PublicService({
    required this.id,
    required this.title,
    required this.description,
    required this.questions,
    required this.attachments,
  });

  final String id;
  final String title;
  final String? description;
  final List<FormQuestion> questions;
  final List<AttachmentRequirement> attachments;

  factory PublicService.fromJson(Map<String, dynamic> json) {
    final form = json['form_definition'] as Map<String, dynamic>? ?? {};
    return PublicService(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      questions: (form['questions'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(FormQuestion.fromJson)
          .toList(),
      attachments: (form['attachments'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(AttachmentRequirement.fromJson)
          .toList(),
    );
  }
}

class RequestReceipt {
  const RequestReceipt({
    required this.trackingCode,
    required this.receiptPin,
    required this.status,
    required this.currentStage,
  });

  final String trackingCode;
  final String receiptPin;
  final String status;
  final String? currentStage;

  factory RequestReceipt.fromJson(Map<String, dynamic> json) => RequestReceipt(
    trackingCode: json['tracking_code'] as String,
    receiptPin: json['receipt_pin'] as String,
    status: json['status'] as String,
    currentStage: json['current_stage'] as String?,
  );
}

class RequestTimelineEntry {
  const RequestTimelineEntry({
    required this.at,
    required this.status,
    required this.detail,
  });

  final DateTime at;
  final String status;
  final String detail;

  factory RequestTimelineEntry.fromJson(Map<String, dynamic> json) =>
      RequestTimelineEntry(
        at: DateTime.parse(json['at'] as String),
        status: json['status'] as String,
        detail: json['detail'] as String,
      );
}

class RequestStage {
  const RequestStage({
    required this.id,
    required this.label,
    required this.department,
  });

  final String id;
  final String? label;
  final String? department;

  factory RequestStage.fromJson(Map<String, dynamic> json) => RequestStage(
    id: json['id'] as String? ?? '',
    label: json['label'] as String?,
    department: json['department'] as String?,
  );
}

class RequestTracking {
  const RequestTracking({
    required this.trackingCode,
    required this.serviceTitle,
    required this.status,
    required this.currentStage,
    required this.currentDepartment,
    required this.activeStages,
    required this.isFullyCompleted,
    required this.finalResponse,
    required this.finalResponsePendingApproval,
    required this.createdAt,
    required this.timeline,
  });

  final String trackingCode;
  final String serviceTitle;
  final String status;
  final String? currentStage;
  final String? currentDepartment;
  final List<RequestStage> activeStages;
  final bool isFullyCompleted;
  final String? finalResponse;
  final bool finalResponsePendingApproval;
  final DateTime createdAt;
  final List<RequestTimelineEntry> timeline;

  factory RequestTracking.fromJson(Map<String, dynamic> json) =>
      RequestTracking(
        trackingCode: json['tracking_code'] as String,
        serviceTitle: json['service_title'] as String,
        status: json['status'] as String,
        currentStage: json['current_stage'] as String?,
        currentDepartment: json['current_department'] as String?,
        activeStages: (json['active_stages'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(RequestStage.fromJson)
            .toList(),
        isFullyCompleted: json['is_fully_completed'] as bool? ?? false,
        finalResponse: json['final_response'] as String?,
        finalResponsePendingApproval:
            json['final_response_pending_approval'] as bool? ?? false,
        createdAt: DateTime.parse(json['created_at'] as String),
        timeline: (json['timeline'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(RequestTimelineEntry.fromJson)
            .toList(),
      );
}

class StaffTask {
  const StaffTask({
    required this.id,
    required this.trackingCode,
    required this.serviceTitle,
    required this.title,
    required this.department,
    required this.status,
    required this.priority,
  });

  final String id;
  final String trackingCode;
  final String serviceTitle;
  final String title;
  final String? department;
  final String status;
  final String priority;

  factory StaffTask.fromJson(Map<String, dynamic> json) => StaffTask(
    id: json['id'] as String,
    trackingCode: json['tracking_code'] as String,
    serviceTitle: json['service_title'] as String,
    title: json['title'] as String,
    department: json['department'] as String?,
    status: json['status'] as String,
    priority: json['priority'] as String,
  );
}
