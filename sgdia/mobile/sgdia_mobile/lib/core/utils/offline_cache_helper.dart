import 'dart:io';
import 'package:path_provider/path_provider.dart';

class OfflineCacheHelper {
  static Future<String> getCacheDirectoryPath() async {
    final directory = await getApplicationDocumentsDirectory();
    final cachePath = '${directory.path}/offline_docs';
    final cacheDir = Directory(cachePath);
    if (!await cacheDir.exists()) {
      await cacheDir.create(recursive: true);
    }
    return cachePath;
  }

  static Future<bool> isCached(String filename) async {
    try {
      final cacheDir = await getCacheDirectoryPath();
      final file = File('$cacheDir/$filename');
      return await file.exists();
    } catch (_) {
      return false;
    }
  }

  static Future<String> getCachedFilePath(String filename) async {
    final cacheDir = await getCacheDirectoryPath();
    return '$cacheDir/$filename';
  }

  static Future<void> cacheFile(String sourceTempPath, String filename) async {
    try {
      final cacheDir = await getCacheDirectoryPath();
      final destinationPath = '$cacheDir/$filename';
      final file = File(sourceTempPath);
      if (await file.exists()) {
        await file.copy(destinationPath);
      }
    } catch (_) {
      // Ignore cache errors
    }
  }
}
