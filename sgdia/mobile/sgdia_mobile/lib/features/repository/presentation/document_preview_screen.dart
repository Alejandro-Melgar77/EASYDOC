import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_pdfview/flutter_pdfview.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:dio/dio.dart';
import '../providers/document_provider.dart';
import '../../../core/models/document.dart';
import '../../../core/utils/offline_cache_helper.dart';

class DocumentPreviewScreen extends ConsumerStatefulWidget {
  final Document document;

  const DocumentPreviewScreen({super.key, required this.document});

  @override
  ConsumerState<DocumentPreviewScreen> createState() =>
      _DocumentPreviewScreenState();
}

class _DocumentPreviewScreenState extends ConsumerState<DocumentPreviewScreen> {
  bool _isLoading = true;
  String? _localFilePath;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _downloadAndPrepareFile();
  }

  Future<void> _downloadAndPrepareFile() async {
    try {
      final cached = await OfflineCacheHelper.isCached(
        widget.document.filename,
      );
      if (cached) {
        final path = await OfflineCacheHelper.getCachedFilePath(
          widget.document.filename,
        );
        if (mounted) {
          setState(() {
            _localFilePath = path;
            _isLoading = false;
          });
        }
        return;
      }

      final repository = ref.read(documentRepositoryProvider);
      final presignedUrl = await repository.getDocumentPreview(
        widget.document.id,
      );

      final tempDir = await getTemporaryDirectory();
      final localPath = '${tempDir.path}/${widget.document.filename}';

      await Dio().download(presignedUrl, localPath);

      // Cache the file for offline use
      await OfflineCacheHelper.cacheFile(localPath, widget.document.filename);

      if (mounted) {
        setState(() {
          _localFilePath = localPath;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _shareFile() async {
    if (_localFilePath == null) return;
    await Share.shareXFiles([
      XFile(_localFilePath!),
    ], text: widget.document.title);
  }

  Future<void> _downloadToPublicStorage() async {
    try {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Descargando archivo...')));

      final appDocDir = await getApplicationDocumentsDirectory();
      final savePath = '${appDocDir.path}/${widget.document.filename}';

      final file = File(_localFilePath!);
      await file.copy(savePath);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Guardado en: $savePath'),
            action: SnackBarAction(label: 'Compartir', onPressed: _shareFile),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al guardar el archivo: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final contentType = widget.document.contentType;
    final isPdf = contentType.contains('pdf');
    final isImage = contentType.contains('image');

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.document.title),
        actions: [
          if (!_isLoading && _localFilePath != null) ...[
            IconButton(
              icon: const Icon(Icons.download_outlined),
              onPressed: _downloadToPublicStorage,
              tooltip: 'Guardar localmente',
            ),
            IconButton(
              icon: const Icon(Icons.share_outlined),
              onPressed: _shareFile,
              tooltip: 'Compartir',
            ),
          ],
        ],
      ),
      body: _isLoading
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Descargando vista previa...'),
                ],
              ),
            )
          : _errorMessage != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Text(
                  _errorMessage!,
                  style: TextStyle(color: theme.colorScheme.error),
                  textAlign: TextAlign.center,
                ),
              ),
            )
          : isPdf
          ? PDFView(
              filePath: _localFilePath!,
              enableSwipe: true,
              swipeHorizontal: false,
              autoSpacing: true,
              pageFling: true,
              onError: (error) {
                setState(() {
                  _errorMessage = 'Error al renderizar PDF: $error';
                });
              },
            )
          : isImage
          ? Center(
              child: InteractiveViewer(
                panEnabled: true,
                minScale: 0.5,
                maxScale: 4.0,
                child: Image.file(File(_localFilePath!), fit: BoxFit.contain),
              ),
            )
          : Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.insert_drive_file_outlined,
                    size: 120,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Vista previa no disponible para este formato',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.document.filename,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onBackground.withOpacity(0.6),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: _downloadToPublicStorage,
                    icon: const Icon(Icons.download),
                    label: const Text('Descargar Archivo'),
                  ),
                ],
              ),
            ),
    );
  }
}
