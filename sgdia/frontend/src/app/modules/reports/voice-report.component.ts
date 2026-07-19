import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, Output, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-voice-report',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop">
      <div class="modal-panel">
        <header>
          <div>
            <span class="eyebrow">Comando de voz local</span>
            <h3>Solicita un reporte hablando</h3>
          </div>
          <button class="icon-btn" type="button" aria-label="Cerrar" (click)="close.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <section>
          <p class="instruction">
            El audio se convierte a WAV y se procesa con el motor local del servidor.
          </p>
          <div class="mic-container" [class.recording]="isRecording">
            <button
              class="mic-btn"
              type="button"
              [disabled]="processing"
              (click)="isRecording ? stopRecording() : startRecording()"
            >
              <span class="material-symbols-outlined">{{ isRecording ? 'stop' : 'mic' }}</span>
            </button>
            <span>{{
              isRecording ? 'Grabando. Presiona para finalizar.' : 'Presiona para grabar.'
            }}</span>
          </div>

          <label class="audio-file-picker">
            <span class="material-symbols-outlined">audio_file</span>
            Cargar un comando WAV
            <input type="file" accept="audio/wav,.wav" (change)="selectAudioFile($event)" />
          </label>

          <div class="status-box" *ngIf="selectedAudioName || statusMessage">
            <strong>{{ selectedAudioName }}</strong>
            <p>{{ statusMessage || 'Archivo de audio seleccionado.' }}</p>
          </div>
          <p class="voice-error" *ngIf="error">{{ error }}</p>
        </section>

        <footer>
          <button class="btn btn-secondary" type="button" (click)="close.emit()">Cancelar</button>
          <button
            class="btn btn-primary"
            type="button"
            [disabled]="!reportReady"
            (click)="confirm.emit()"
          >
            Abrir reporte
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2000;
        display: grid;
        place-items: center;
        padding: 1rem;
        background: rgba(6, 16, 30, 0.72);
      }
      .modal-panel {
        width: min(100%, 520px);
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.36);
      }
      header,
      footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.1rem 1.25rem;
      }
      header {
        border-bottom: 1px solid var(--border-color);
      }
      h3 {
        margin: 0.22rem 0 0;
        color: var(--text-primary);
        font-size: 1.2rem;
      }
      .eyebrow {
        color: var(--accent);
        font-size: 0.68rem;
        font-weight: 850;
        letter-spacing: 0.6px;
        text-transform: uppercase;
      }
      section {
        padding: 1.5rem 1.25rem;
        text-align: center;
      }
      .instruction {
        margin: 0 auto 1.3rem;
        max-width: 38ch;
        color: var(--text-secondary);
        line-height: 1.5;
      }
      .mic-container {
        display: grid;
        justify-items: center;
        gap: 0.65rem;
        color: var(--text-muted);
        font-size: 0.78rem;
      }
      .mic-btn {
        width: 76px;
        height: 76px;
        border: 2px solid var(--accent);
        border-radius: 50%;
        color: var(--accent);
        background: var(--bg-primary);
        cursor: pointer;
      }
      .mic-btn .material-symbols-outlined {
        font-size: 2.1rem;
      }
      .recording .mic-btn {
        color: white;
        border-color: var(--danger);
        background: var(--danger);
        box-shadow: 0 0 0 8px rgba(213, 80, 81, 0.12);
      }
      .audio-file-picker {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        margin-top: 1.35rem;
        color: var(--accent);
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 750;
      }
      .audio-file-picker input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
      }
      .status-box {
        margin-top: 1.1rem;
        padding: 0.75rem;
        border-left: 3px solid var(--secondary);
        background: rgba(var(--secondary-rgb), 0.08);
        color: var(--text-primary);
        text-align: left;
        font-size: 0.8rem;
      }
      .status-box p {
        margin: 0.3rem 0 0;
        color: var(--text-secondary);
      }
      .voice-error {
        margin: 1rem 0 0;
        color: var(--danger);
        font-size: 0.8rem;
        line-height: 1.45;
      }
      footer {
        border-top: 1px solid var(--border-color);
        justify-content: flex-end;
      }
      .icon-btn {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border: 0;
        color: var(--text-secondary);
        background: transparent;
        cursor: pointer;
      }
    `,
  ],
})
export class VoiceReportComponent implements OnDestroy {
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  private readonly api = inject(ApiService);
  private stream: MediaStream | undefined;
  private audioContext: AudioContext | undefined;
  private source: MediaStreamAudioSourceNode | undefined;
  private processor: ScriptProcessorNode | undefined;
  private buffers: Float32Array[] = [];
  private sampleRate = 44_100;

  isRecording = false;
  processing = false;
  selectedAudioName = '';
  statusMessage = '';
  error = '';
  reportReady = false;

  async startRecording(): Promise<void> {
    this.error = '';
    this.statusMessage = '';
    this.reportReady = false;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      this.sampleRate = this.audioContext.sampleRate;
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.buffers = [];
      this.processor.onaudioprocess = (event) => {
        this.buffers.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.isRecording = true;
    } catch {
      this.error = 'No se pudo acceder al microfono. Puedes cargar un archivo WAV local.';
      this.releaseRecorder();
    }
  }

  async stopRecording(): Promise<void> {
    if (!this.isRecording) return;
    this.isRecording = false;
    const audio = new File([this.createWav(this.buffers, this.sampleRate)], 'comando-easydoc.wav', {
      type: 'audio/wav',
    });
    this.releaseRecorder();
    await this.submitAudio(audio);
  }

  selectAudioFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    if (file) void this.submitAudio(file);
  }

  ngOnDestroy(): void {
    this.releaseRecorder();
  }

  private async submitAudio(audio: File): Promise<void> {
    this.processing = true;
    this.error = '';
    this.statusMessage = '';
    this.selectedAudioName = audio.name;
    this.reportReady = false;
    const formData = new FormData();
    formData.set('audio', audio);
    try {
      await firstValueFrom(this.api.post('/reports/voice', formData));
      this.statusMessage = 'Comando local procesado. El reporte esta listo para revisarse.';
      this.reportReady = true;
    } catch (error: unknown) {
      this.error = this.apiErrorMessage(error);
    } finally {
      this.processing = false;
    }
  }

  private releaseRecorder(): void {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.audioContext?.close();
    this.processor = undefined;
    this.source = undefined;
    this.stream = undefined;
    this.audioContext = undefined;
  }

  private createWav(buffers: Float32Array[], sampleRate: number): Blob {
    const length = buffers.reduce((total, buffer) => total + buffer.length, 0);
    const output = new Float32Array(length);
    let offset = 0;
    buffers.forEach((buffer) => {
      output.set(buffer, offset);
      offset += buffer.length;
    });
    const wav = new ArrayBuffer(44 + output.length * 2);
    const view = new DataView(wav);
    const write = (position: number, value: string) =>
      [...value].forEach((character, index) =>
        view.setUint8(position + index, character.charCodeAt(0)),
      );
    write(0, 'RIFF');
    view.setUint32(4, 36 + output.length * 2, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, output.length * 2, true);
    output.forEach((sample, index) => {
      const normalized = Math.max(-1, Math.min(1, sample));
      view.setInt16(
        44 + index * 2,
        normalized < 0 ? normalized * 0x8000 : normalized * 0x7fff,
        true,
      );
    });
    return new Blob([wav], { type: 'audio/wav' });
  }

  private apiErrorMessage(error: unknown): string {
    const candidate = error as {
      error?: { detail?: string; error?: { message?: string } };
    };
    return (
      candidate.error?.detail ||
      candidate.error?.error?.message ||
      'No fue posible procesar el comando local.'
    );
  }
}
