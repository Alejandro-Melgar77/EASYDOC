import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/document_provider.dart';
import '../../../core/models/folder.dart';
import '../../../core/utils/offline_cache_helper.dart';

class DocumentListScreen extends ConsumerStatefulWidget {
  const DocumentListScreen({super.key});

  @override
  ConsumerState<DocumentListScreen> createState() => _DocumentListScreenState();
}

class _DocumentListScreenState extends ConsumerState<DocumentListScreen> {
  final ScrollController _scrollController = ScrollController();

  final List<Folder> _mockFolders = [
    Folder(id: 'fold_legal', name: 'Legal'),
    Folder(id: 'fold_politicas', name: 'Políticas Generales'),
    Folder(id: 'fold_finanzas', name: 'Finanzas'),
    Folder(id: 'fold_rh', name: 'Recursos Humanos'),
  ];

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      final selectedFolder = ref.read(selectedFolderProvider);
      ref.read(documentListProvider(selectedFolder).notifier).loadDocuments();
    }
  }

  IconData _getFileIcon(String contentType) {
    if (contentType.contains('pdf')) {
      return Icons.picture_as_pdf_outlined;
    } else if (contentType.contains('word') ||
        contentType.contains('officedocument.wordprocessingml')) {
      return Icons.description_outlined;
    } else if (contentType.contains('excel') ||
        contentType.contains('officedocument.spreadsheetml')) {
      return Icons.table_chart_outlined;
    } else if (contentType.contains('image')) {
      return Icons.image_outlined;
    }
    return Icons.insert_drive_file_outlined;
  }

  Color _getFileColor(String contentType) {
    if (contentType.contains('pdf')) {
      return Colors.red;
    } else if (contentType.contains('word')) {
      return Colors.blue;
    } else if (contentType.contains('excel')) {
      return Colors.green;
    } else if (contentType.contains('image')) {
      return Colors.purple;
    }
    return Colors.grey;
  }

  @override
  Widget build(BuildContext context) {
    final selectedFolder = ref.watch(selectedFolderProvider);
    final documentState = ref.watch(documentListProvider(selectedFolder));
    final theme = Theme.of(context);
    final documents = documentState.documents;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          selectedFolder == 'root'
              ? 'Documentos'
              : _mockFolders.firstWhere((f) => f.id == selectedFolder).name,
        ),
        leading: selectedFolder != 'root'
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () =>
                    ref.read(selectedFolderProvider.notifier).state = 'root',
              )
            : null,
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => context.push('/search'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref
            .read(documentListProvider(selectedFolder).notifier)
            .loadDocuments(refresh: true),
        child: CustomScrollView(
          controller: _scrollController,
          slivers: [
            if (selectedFolder == 'root') ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Text(
                    'Carpetas',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 2.5,
                  ),
                  delegate: SliverChildBuilderDelegate((context, index) {
                    final folder = _mockFolders[index];
                    return InkWell(
                      onTap: () =>
                          ref.read(selectedFolderProvider.notifier).state =
                              folder.id,
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: theme.colorScheme.onBackground.withOpacity(
                              0.08,
                            ),
                          ),
                          color: theme.colorScheme.surface,
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.folder,
                              color: theme.colorScheme.primary,
                              size: 32,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                folder.name,
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }, childCount: _mockFolders.length),
                ),
              ),
            ],
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Text(
                  'Archivos Recientes',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            if (documentState.isLoading && documents.isEmpty) ...[
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              ),
            ] else if (documentState.errorMessage != null &&
                documents.isEmpty) ...[
              SliverFillRemaining(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Text(
                      documentState.errorMessage!,
                      style: TextStyle(color: theme.colorScheme.error),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ),
            ] else if (documents.isEmpty) ...[
              const SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.folder_open_outlined,
                        size: 64,
                        color: Colors.grey,
                      ),
                      SizedBox(height: 16),
                      Text(
                        'No se encontraron documentos en esta carpeta',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ),
            ] else ...[
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
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
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
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
                  childCount:
                      documents.length + (documentState.hasReachedMax ? 0 : 1),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
