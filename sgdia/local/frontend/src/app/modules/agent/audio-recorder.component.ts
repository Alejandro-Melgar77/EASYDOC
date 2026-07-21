import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-audio-recorder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="audio-container" [class.recording]="isRecording">
      <button
        class="icon-btn record-btn"
        (mousedown)="startRecording()"
        (mouseup)="stopRecording()"
        (mouseleave)="stopRecording()"
        title="Mantén presionado para hablar"
      >
        <span class="material-symbols-outlined">{{ isRecording ? 'mic' : 'mic_none' }}</span>
      </button>

      <div class="waveform" *ngIf="isRecording">
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <span class="recording-time">0:0{{ seconds }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .audio-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--bg-tertiary);
        border-radius: 20px;
        padding: 2px;
        transition: all 0.3s;

        &.recording {
          background: rgba(239, 68, 68, 0.1);
          padding-right: 1rem;

          .record-btn {
            color: var(--danger);
            background: rgba(239, 68, 68, 0.2);
          }
        }
      }

      .record-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        color: var(--text-secondary);
        transition: all 0.2s;

        &:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }
      }

      .waveform {
        display: flex;
        align-items: center;
        gap: 3px;
        height: 20px;
        animation: expandIn 0.2s ease-out;
      }

      .bar {
        width: 3px;
        background: var(--danger);
        border-radius: 3px;
        animation: sound 0ms -800ms linear infinite alternate;

        &:nth-child(1) {
          height: 8px;
          animation-duration: 474ms;
        }
        &:nth-child(2) {
          height: 16px;
          animation-duration: 433ms;
        }
        &:nth-child(3) {
          height: 20px;
          animation-duration: 407ms;
        }
        &:nth-child(4) {
          height: 12px;
          animation-duration: 458ms;
        }
        &:nth-child(5) {
          height: 10px;
          animation-duration: 400ms;
        }
      }

      .recording-time {
        font-size: 0.75rem;
        color: var(--danger);
        margin-left: 0.5rem;
        font-variant-numeric: tabular-nums;
      }

      @keyframes sound {
        0% {
          opacity: 0.35;
          height: 3px;
        }
        100% {
          opacity: 1;
          height: 100%;
        }
      }

      @keyframes expandIn {
        from {
          width: 0;
          opacity: 0;
        }
        to {
          width: 60px;
          opacity: 1;
        }
      }
    `,
  ],
})
export class AudioRecorderComponent {
  @Output() audioRecorded = new EventEmitter<string>(); // Mock returning a transcript

  isRecording = false;
  seconds = 0;
  private interval: any;

  startRecording() {
    if (this.isRecording) return;
    this.isRecording = true;
    this.seconds = 0;
    this.interval = setInterval(() => {
      this.seconds++;
      if (this.seconds > 9) this.stopRecording();
    }, 1000);
  }

  stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    clearInterval(this.interval);

    if (this.seconds > 0) {
      // Simulate speech-to-text
      this.audioRecorded.emit(
        'Necesito saber que tramite corresponde si estoy retrasado en materias.',
      );
    }
    this.seconds = 0;
  }
}
