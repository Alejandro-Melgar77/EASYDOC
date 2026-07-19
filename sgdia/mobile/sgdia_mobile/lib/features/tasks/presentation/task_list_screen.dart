import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/service_request.dart';
import '../providers/task_provider.dart';

class TaskListScreen extends ConsumerStatefulWidget {
  const TaskListScreen({super.key});

  @override
  ConsumerState<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends ConsumerState<TaskListScreen> {
  late Future<List<StaffTask>> _tasks;

  @override
  void initState() {
    super.initState();
    _tasks = _loadTasks();
  }

  Future<List<StaffTask>> _loadTasks() =>
      ref.read(taskRepositoryProvider).listMyTasks();

  Future<void> _reload() async {
    setState(() => _tasks = _loadTasks());
    await _tasks;
  }

  Future<void> _changeStatus(StaffTask task) async {
    final status = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            for (final item in const [
              'in_progress',
              'observed',
              'approved',
              'rejected',
              'discarded',
              'completed',
            ])
              ListTile(
                leading: const Icon(Icons.radio_button_unchecked),
                title: Text(item.replaceAll('_', ' ')),
                onTap: () => Navigator.pop(context, item),
              ),
          ],
        ),
      ),
    );
    if (status == null) return;
    try {
      await ref
          .read(taskRepositoryProvider)
          .updateStatus(taskId: task.id, status: status);
      await _reload();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('EASYDOC'),
            Text('Tareas asignadas', style: TextStyle(fontSize: 12)),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _reload,
            tooltip: 'Actualizar',
            icon: const Icon(Icons.refresh),
          ),
          IconButton(
            onPressed: () => context.go('/guest/services'),
            tooltip: 'Vista de estudiante',
            icon: const Icon(Icons.public),
          ),
        ],
      ),
      body: FutureBuilder<List<StaffTask>>(
        future: _tasks,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: FilledButton(
                onPressed: _reload,
                child: const Text('Reintentar'),
              ),
            );
          }
          final tasks = snapshot.data ?? const <StaffTask>[];
          if (tasks.isEmpty) {
            return const Center(child: Text('No tienes tareas pendientes.'));
          }
          return RefreshIndicator(
            onRefresh: _reload,
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: tasks.length + 1,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                if (index == 0) {
                  final highPriority = tasks
                      .where((task) => task.priority == 'high')
                      .length;
                  return Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.secondary,
                      border: Border(
                        left: BorderSide(
                          color: theme.colorScheme.tertiary,
                          width: 4,
                        ),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.assignment_turned_in_outlined,
                          color: theme.colorScheme.tertiary,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${tasks.length} expedientes en tu mesa',
                                style: theme.textTheme.titleMedium?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                highPriority == 0
                                    ? 'La cola esta equilibrada.'
                                    : '$highPriority requieren atencion prioritaria.',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: Colors.white70,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }
                final task = tasks[index - 1];
                final isHigh = task.priority == 'high';
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 15, 10, 12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 8,
                          height: 64,
                          decoration: BoxDecoration(
                            color: isHigh
                                ? theme.colorScheme.tertiary
                                : theme.colorScheme.primary,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                task.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(task.serviceTitle),
                              if (task.department != null)
                                Text(
                                  task.department!,
                                  style: theme.textTheme.bodySmall,
                                ),
                              const SizedBox(height: 8),
                              Text(
                                '${task.trackingCode}  |  ${task.status.replaceAll('_', ' ')}',
                                style: theme.textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () => _changeStatus(task),
                          tooltip: 'Cambiar estado',
                          icon: const Icon(Icons.edit_note_outlined),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
