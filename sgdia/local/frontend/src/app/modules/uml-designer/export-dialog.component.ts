import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-export-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop">
      <div class="modal-panel glass-card">
        <div class="modal-header">
          <h3>Exportar Diagrama</h3>
          <button class="icon-btn" (click)="close.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="modal-body">
          <div class="export-options">
            <div
              class="export-card"
              (click)="exportTo('png')"
              [class.selected]="selectedFormat === 'png'"
            >
              <span class="material-symbols-outlined format-icon">image</span>
              <h4>Imagen PNG</h4>
              <p>Exportar como imagen rasterizada</p>
            </div>

            <div
              class="export-card"
              (click)="exportTo('svg')"
              [class.selected]="selectedFormat === 'svg'"
            >
              <span class="material-symbols-outlined format-icon">polyline</span>
              <h4>Vector SVG</h4>
              <p>Exportar como gráfico escalable sin pérdida</p>
            </div>

            <div
              class="export-card"
              (click)="exportTo('xmi')"
              [class.selected]="selectedFormat === 'xmi'"
            >
              <span class="material-symbols-outlined format-icon">code</span>
              <h4>UML XMI</h4>
              <p>Formato estándar para importar en otras herramientas</p>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="close.emit()">Cancelar</button>
          <button class="btn btn-primary" (click)="download()" [disabled]="!selectedFormat">
            Descargar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .modal-panel {
        width: 500px;
        max-width: 90vw;
        border-radius: var(--border-radius-lg);
        padding: 0;
        display: flex;
        flex-direction: column;
        animation: scaleIn 0.3s ease-out forwards;
      }

      .modal-header {
        padding: 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border-color);

        h3 {
          margin: 0;
          font-size: 1.25rem;
        }
      }

      .modal-body {
        padding: 1.5rem;
      }

      .export-options {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .export-card {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 1.5rem;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: var(--bg-secondary);
          border-color: var(--primary);
          transform: translateY(-2px);
        }

        &.selected {
          background: var(--primary-glow);
          border-color: var(--primary);

          .format-icon {
            color: var(--primary);
          }
        }

        h4 {
          margin: 0 0 0.25rem 0;
          color: var(--text-primary);
        }
        p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.85rem;
        }
      }

      .format-icon {
        font-size: 2.5rem;
        color: var(--text-muted);
      }

      .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid var(--border-color);
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
      }

      @keyframes scaleIn {
        from {
          transform: scale(0.95);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
    `,
  ],
})
export class ExportDialogComponent {
  @Output() close = new EventEmitter<void>();
  selectedFormat: string = 'png';

  exportTo(format: string) {
    this.selectedFormat = format;
  }

  download() {
    // Simulate download
    const link = document.createElement('a');
    link.href = '#';
    link.download = `diagrama.${this.selectedFormat}`;
    link.click();
    this.close.emit();
  }
}
