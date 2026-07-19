import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/document_repository.dart';
import '../../../core/models/document.dart';
import '../../auth/providers/auth_provider.dart';

class DocumentListState {
  final List<Document> documents;
  final bool isLoading;
  final String? errorMessage;
  final int page;
  final bool hasReachedMax;

  DocumentListState({
    required this.documents,
    this.isLoading = false,
    this.errorMessage,
    this.page = 1,
    this.hasReachedMax = false,
  });

  DocumentListState copyWith({
    List<Document>? documents,
    bool? isLoading,
    String? errorMessage,
    int? page,
    bool? hasReachedMax,
  }) {
    return DocumentListState(
      documents: documents ?? this.documents,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
      page: page ?? this.page,
      hasReachedMax: hasReachedMax ?? this.hasReachedMax,
    );
  }
}

class DocumentListNotifier extends StateNotifier<DocumentListState> {
  final DocumentRepository _repository;
  final String _folderId;
  final String _query;

  DocumentListNotifier(this._repository, this._folderId, this._query)
    : super(DocumentListState(documents: [])) {
    loadDocuments();
  }

  Future<void> loadDocuments({bool refresh = false}) async {
    if (state.isLoading) return;
    if (!refresh && state.hasReachedMax) return;

    final nextPage = refresh ? 1 : state.page;
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final docs = await _repository.searchDocuments(
        query: _query,
        folderId: _folderId,
        page: nextPage,
      );

      state = state.copyWith(
        documents: refresh ? docs : [...state.documents, ...docs],
        isLoading: false,
        page: nextPage + 1,
        hasReachedMax: docs.length < 20,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }
}

final documentRepositoryProvider = Provider<DocumentRepository>((ref) {
  return DocumentRepository(apiClient: ref.watch(apiClientProvider));
});

final selectedFolderProvider = StateProvider<String>((ref) => 'root');
final searchQueryProvider = StateProvider<String>((ref) => '');
final typeFilterProvider = StateProvider<String>((ref) => 'all');

final documentListProvider =
    StateNotifierProvider.family<
      DocumentListNotifier,
      DocumentListState,
      String
    >((ref, folderId) {
      final repository = ref.watch(documentRepositoryProvider);
      final query = ref.watch(searchQueryProvider);
      return DocumentListNotifier(repository, folderId, query);
    });
