import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/document_provider.dart';
import '../../../core/utils/offline_cache_helper.dart';

class DocumentSearchScreen extends ConsumerStatefulWidget {
  const DocumentSearchScreen({super.key});

  @override
  ConsumerState<DocumentSearchScreen> createState() =>
      _DocumentSearchScreenState();
}

class _DocumentSearchScreenState extends ConsumerState<DocumentSearchScreen> {
  final _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    _scrollController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onSearchChanged() {
    if (_debounceTimer?.isActive ?? false) {
      _debounceTimer?.cancel();
    }
    _debounceTimer = Timer(const Duration(milliseconds: 500), () {
      ref.read(searchQueryProvider.notifier).state = _searchController.text
          .trim();
    });
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(documentListProvider('root').notifier).loadDocuments();
    }
  }

  IconData _getFileIcon(String contentType) {
    if (contentType.contains('pdf')) return Icons.picture_as_pdf_outlined;
    if (contentType.contains('word') ||
        contentType.contains('officedocument.wordprocessingml')) {
      return Icons.description_outlined;
    }
    if (contentType.contains('excel') ||
        contentType.contains('officedocument.spreadsheetml')) {
      return Icons.table_chart_outlined;
    }
    if (contentType.contains('image')) return Icons.image_outlined;
    return Icons.insert_drive_file_outlined;
  }

  Color _getFileColor(String contentType) {
    if (contentType.contains('pdf')) return Colors.red;
    if (contentType.contains('word')) return Colors.blue;
    if (contentType.contains('excel')) return Colors.green;
    if (contentType.contains('image')) return Colors.purple;
    return Colors.grey;
  }

  @override
  Widget build(BuildContext context) {
    final query = ref.watch(searchQueryProvider);
    final selectedType = ref.watch(typeFilterProvider);
    final documentState = ref.watch(documentListProvider('root'));
    final theme = Theme.of(context);

    var documents = documentState.documents;
    if (selectedType != 'all') {
      documents = documents.where((doc) {
        if (selectedType == 'pdf') return doc.contentType.contains('pdf');
        if (selectedType == 'word') return doc.contentType.contains('word');
        if (selectedType == 'excel') return doc.contentType.contains('excel');
        if (selectedType == 'image') return doc.contentType.contains('image');
        return true;
      }).toList();
    }

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _searchController,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Buscar documentos...',
            border: InputBorder.none,
          ),
          style: theme.textTheme.titleMedium,
        ),
        actions: [
          if (_searchController.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _searchController.clear();
                ref.read(searchQueryProvider.notifier).state = '';
              },
            ),
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(
              vertical: 8.0,
              horizontal: 16.0,
            ),
            color: theme.colorScheme.surface,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterChip(
                    label: 'Todos',
                    selected: selectedType == 'all',
                    onSelected: (_) =>
                        ref.read(typeFilterProvider.notifier).state = 'all',
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'PDF',
                    selected: selectedType == 'pdf',
                    onSelected: (_) =>
                        ref.read(typeFilterProvider.notifier).state = 'pdf',
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Word',
                    selected: selectedType == 'word',
                    onSelected: (_) =>
                        ref.read(typeFilterProvider.notifier).state = 'word',
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Excel',
                    selected: selectedType == 'excel',
                    onSelected: (_) =>
                        ref.read(typeFilterProvider.notifier).state = 'excel',
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Imagen',
                    selected: selectedType == 'image',
                    onSelected: (_) =>
                        ref.read(typeFilterProvider.notifier).state = 'image',
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: query.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.search, size: 64, color: Colors.grey),
                        SizedBox(height: 16),
                        Text(
                          'Ingrese términos para buscar en el repositorio',
                          style: TextStyle(color: Colors.grey),
                        ),
                      ],
                    ),
                  )
                : documentState.isLoading && documents.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : documentState.errorMessage != null && documents.isEmpty
                ? Center(
                    child: Text(
                      documentState.errorMessage!,
                      style: TextStyle(color: theme.colorScheme.error),
                    ),
                  )
                : documents.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.sentiment_dissatisfied,
                          size: 64,
                          color: Colors.grey,
                        ),
                        SizedBox(height: 16),
                        Text(
                          'No se encontraron resultados',
                          style: TextStyle(color: Colors.grey),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    itemCount:
                        documents.length +
                        (documentState.hasReachedMax ? 0 : 1),
                    itemBuilder: (context, index) {
                      if (index == documents.length) {
                        return const Padding(
                          padding: EdgeInsets.all(16.0),
                          child: Center(child: CircularProgressIndicator()),
                        );
                      }

                      final doc = documents[index];
                      final sizeMb = (doc.sizeBytes / (1024 * 1024))
                          .toStringAsFixed(2);

                      return Card(
                        margin: const EdgeInsets.symmetric(
                          horizontal: 16.0,
                          vertical: 6.0,
                        ),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(
                            color: theme.colorScheme.onBackground.withOpacity(
                              0.08,
                            ),
                          ),
                        ),
                        child: ListTile(
                          leading: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: _getFileColor(
                                doc.contentType,
                              ).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              _getFileIcon(doc.contentType),
                              color: _getFileColor(doc.contentType),
                            ),
                          ),
                          title: Text(
                            doc.title,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: FutureBuilder<bool>(
                            future: OfflineCacheHelper.isCached(doc.filename),
                            builder: (context, snapshot) {
                              final isCached = snapshot.data ?? false;
                              return Row(
                                children: [
                                  Text('${doc.filename} • $sizeMb MB'),
                                  if (isCached) ...[
                                    const SizedBox(width: 8),
                                    const Icon(
                                      Icons.offline_pin,
                                      size: 16,
                                      color: Colors.green,
                                    ),
                                  ],
                                ],
                              );
                            },
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () =>
                              context.push('/document/${doc.id}', extra: doc),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final ValueChanged<bool> onSelected;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: onSelected,
      selectedColor: theme.colorScheme.primary.withOpacity(0.15),
      labelStyle: TextStyle(
        color: selected
            ? theme.colorScheme.primary
            : theme.colorScheme.onBackground.withOpacity(0.7),
        fontWeight: selected ? FontWeight.bold : FontWeight.normal,
      ),
    );
  }
}
