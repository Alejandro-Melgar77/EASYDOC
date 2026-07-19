import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/service_request.dart';
import '../providers/guest_request_provider.dart';

class TrackingScreen extends ConsumerStatefulWidget {
  const TrackingScreen({super.key, this.initialCode, this.initialPin});

  final String? initialCode;
  final String? initialPin;

  @override
  ConsumerState<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends ConsumerState<TrackingScreen> {
  late final TextEditingController _code;
  late final TextEditingController _pin;
  RequestTracking? _tracking;
  String? _error;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _code = TextEditingController(text: widget.initialCode);
    _pin = TextEditingController(text: widget.initialPin);
    if (_code.text.isNotEmpty && _pin.text.isNotEmpty) _track();
  }

  @override
  void dispose() {
    _code.dispose();
    _pin.dispose();
    super.dispose();
  }

  Future<void> _track() async {
    if (_code.text.trim().isEmpty || _pin.text.trim().isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final value = await ref
          .read(guestRequestRepositoryProvider)
          .trackRequest(trackingCode: _code.text, receiptPin: _pin.text);
      if (mounted) setState(() => _tracking = value);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Seguimiento de tramite')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _code,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(
              labelText: 'Codigo de tramite',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _pin,
            keyboardType: TextInputType.number,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'PIN de recibo',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _loading ? null : _track,
            icon: const Icon(Icons.search),
            label: const Text('Consultar'),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 14),
              child: Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          if (_tracking != null) _TrackingResult(tracking: _tracking!),
        ],
      ),
    );
  }
}

class _TrackingResult extends StatelessWidget {
  const _TrackingResult({required this.tracking});

  final RequestTracking tracking;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: theme.colorScheme.secondary,
              border: Border(
                left: BorderSide(color: theme.colorScheme.tertiary, width: 4),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tracking.isFullyCompleted
                      ? 'SOLICITUD TOTALMENTE CULMINADA'
                      : 'EXPEDIENTE EN SEGUIMIENTO',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.tertiary,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  tracking.serviceTitle,
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _statusLabel(tracking.status).toUpperCase(),
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: Colors.white70,
                    letterSpacing: 0.8,
                  ),
                ),
                if (!tracking.isFullyCompleted &&
                    tracking.currentStage != null) ...[
                  const SizedBox(height: 14),
                  Text(
                    tracking.currentStage!,
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: theme.colorScheme.tertiary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  if (tracking.currentDepartment != null)
                    Text(
                      tracking.currentDepartment!,
                      style: const TextStyle(color: Colors.white70),
                    ),
                ],
              ],
            ),
          ),
          if (tracking.activeStages.length > 1) ...[
            const SizedBox(height: 14),
            Text('Actividades en paralelo', style: theme.textTheme.titleSmall),
            const SizedBox(height: 6),
            for (final stage in tracking.activeStages)
              Padding(
                padding: const EdgeInsets.only(bottom: 5),
                child: Text(
                  '${stage.label ?? 'Actividad'} | ${stage.department ?? 'Departamento por asignar'}',
                  style: theme.textTheme.bodySmall,
                ),
              ),
          ],
          if (tracking.finalResponse != null) ...[
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: tracking.isFullyCompleted
                    ? theme.colorScheme.tertiaryContainer
                    : theme.colorScheme.surfaceContainerHighest,
                border: Border(
                  left: BorderSide(
                    color: tracking.isFullyCompleted
                        ? theme.colorScheme.tertiary
                        : theme.colorScheme.primary,
                    width: 4,
                  ),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tracking.finalResponsePendingApproval
                        ? 'RESPUESTA EN REVISION JERARQUICA'
                        : 'RESPUESTA INSTITUCIONAL',
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(tracking.finalResponse!),
                ],
              ),
            ),
          ],
          const SizedBox(height: 20),
          Text('Bitacora del tramite', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          for (final entry in tracking.timeline)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 11),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: Color(0x1A12263A))),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 11,
                    height: 11,
                    margin: const EdgeInsets.only(top: 5),
                    color: theme.colorScheme.tertiary,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _statusLabel(entry.status),
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 3),
                        Text(entry.detail),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  String _statusLabel(String value) => value.replaceAll('_', ' ');
}
