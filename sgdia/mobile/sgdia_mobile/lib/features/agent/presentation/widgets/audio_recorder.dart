import 'package:flutter/material.dart';

class AudioRecorderWidget extends StatefulWidget {
  final Function(String) onRecordingComplete;

  const AudioRecorderWidget({super.key, required this.onRecordingComplete});

  @override
  State<AudioRecorderWidget> createState() => _AudioRecorderWidgetState();
}

class _AudioRecorderWidgetState extends State<AudioRecorderWidget> {
  bool _isRecording = false;

  void _startRecording() {
    setState(() {
      _isRecording = true;
    });
    // Start actual recording logic
  }

  void _stopRecording() {
    setState(() {
      _isRecording = false;
    });
    // Stop recording and pass the file path
    widget.onRecordingComplete('dummy_path/audio.m4a');
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPress: _startRecording,
      onLongPressEnd: (_) => _stopRecording(),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: _isRecording ? Colors.red : Theme.of(context).primaryColor,
          shape: BoxShape.circle,
        ),
        child: Icon(
          _isRecording ? Icons.mic : Icons.mic_none,
          color: Colors.white,
        ),
      ),
    );
  }
}
