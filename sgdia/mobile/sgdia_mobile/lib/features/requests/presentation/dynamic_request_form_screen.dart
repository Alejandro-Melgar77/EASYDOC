import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/service_request.dart';
import '../providers/guest_request_provider.dart';

class DynamicRequestFormScreen extends ConsumerStatefulWidget {
  const DynamicRequestFormScreen({super.key, required this.policyId});

  final String policyId;

  @override
  ConsumerState<DynamicRequestFormScreen> createState() =>
      _DynamicRequestFormScreenState();
}

class _DynamicRequestFormScreenState
    extends ConsumerState<DynamicRequestFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _universityId = TextEditingController();
  final Map<String, TextEditingController> _answers = {};
  final Map<String, File> _files = {};
  PublicService? _service;
  Object? _error;
  bool _loading = true;
  bool _submitting = false;
  RequestReceipt? _receipt;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _universityId.dispose();
    for (final controller in _answers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final service = await ref
          .read(guestRequestRepositoryProvider)
          .getService(widget.policyId);
      for (final question in service.questions) {
        _answers.putIfAbsent(question.id, TextEditingController.new);
      }
      if (mounted) {
        setState(() => _service = service);
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error);
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _pickFile(AttachmentRequirement requirement) async {
    final result = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: const [
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'jpg',
        'jpeg',
        'png',
      ],
    );
    final path = result?.files.single.path;
    if (path != null && mounted) {
      setState(() => _files[requirement.id] = File(path));
    }
  }

  Future<void> _submit() async {
    final service = _service;
    if (service == null || !_formKey.currentState!.validate()) return;
    final missingFile = service.attachments.any(
      (item) => item.required && _files[item.id] == null,
    );
    if (missingFile) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Falta un requisito obligatorio.')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      final repository = ref.read(guestRequestRepositoryProvider);
      final receipt = await repository.createRequest(
        policyId: service.id,
        fullName: _name.text.trim(),
        email: _email.text.trim(),
        universityId: _universityId.text.trim(),
        answers: {
          for (final entry in _answers.entries)
            entry.key: entry.value.text.trim(),
        },
      );
      for (final entry in _files.entries) {
        await repository.uploadAttachment(
          receipt: receipt,
          requirementId: entry.key,
          file: entry.value,
        );
      }
      if (mounted) {
        setState(() => _receipt = receipt);
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null || _service == null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: FilledButton(
            onPressed: _load,
            child: const Text('Reintentar'),
          ),
        ),
      );
    }
    if (_receipt != null) {
      return _ReceiptView(receipt: _receipt!);
    }
    final service = _service!;
    return Scaffold(
      appBar: AppBar(title: Text(service.title)),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
            children: [
              Text(
                'Datos del solicitante',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 14),
              _field(_name, 'Nombre completo', required: true),
              _field(
                _email,
                'Correo institucional',
                keyboardType: TextInputType.emailAddress,
              ),
              _field(_universityId, 'Registro universitario'),
              if (service.questions.isNotEmpty) ...[
                const SizedBox(height: 22),
                Text(
                  'Formulario',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                for (final question in service.questions) _question(question),
              ],
              if (service.attachments.isNotEmpty) ...[
                const SizedBox(height: 22),
                Text(
                  'Requisitos',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 10),
                for (final requirement in service.attachments)
                  _attachment(requirement),
              ],
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: _submitting ? null : _submit,
                icon: _submitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.send_outlined),
                label: const Text('Enviar solicitud'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label, {
    bool required = false,
    TextInputType? keyboardType,
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        maxLines: maxLines,
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
        ),
        validator: required
            ? (value) => value == null || value.trim().isEmpty
                  ? 'Este dato es obligatorio.'
                  : null
            : null,
      ),
    );
  }

  Widget _question(FormQuestion question) {
    if (question.type == 'select' && question.options.isNotEmpty) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: DropdownButtonFormField<String>(
          decoration: InputDecoration(
            labelText: question.label,
            border: const OutlineInputBorder(),
          ),
          items: question.options
              .map((item) => DropdownMenuItem(value: item, child: Text(item)))
              .toList(),
          onChanged: (value) => _answers[question.id]!.text = value ?? '',
          validator: question.required
              ? (value) => value == null || value.isEmpty
                    ? 'Este dato es obligatorio.'
                    : null
              : null,
        ),
      );
    }
    return _field(
      _answers[question.id]!,
      question.label,
      required: question.required,
      keyboardType: question.type == 'email'
          ? TextInputType.emailAddress
          : null,
      maxLines: question.type == 'textarea' ? 4 : 1,
    );
  }

  Widget _attachment(AttachmentRequirement requirement) {
    final selected = _files[requirement.id];
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(
        selected == null ? Icons.upload_file_outlined : Icons.task_alt_outlined,
      ),
      title: Text(requirement.label),
      subtitle: Text(
        selected?.path.split(Platform.pathSeparator).last ??
            requirement.acceptedFormats,
      ),
      trailing: IconButton(
        onPressed: () => _pickFile(requirement),
        icon: const Icon(Icons.attach_file),
        tooltip: 'Seleccionar archivo',
      ),
    );
  }
}

class _ReceiptView extends StatelessWidget {
  const _ReceiptView({required this.receipt});

  final RequestReceipt receipt;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Solicitud registrada')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.verified_outlined, size: 58),
              const SizedBox(height: 18),
              Text(
                receipt.trackingCode,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              SelectableText(
                'PIN ${receipt.receiptPin}',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => context.go(
                  '/guest/track?code=${receipt.trackingCode}&pin=${receipt.receiptPin}',
                ),
                child: const Text('Ver seguimiento'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
