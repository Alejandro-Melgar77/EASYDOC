import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Document } from '../../core/models/document.model';

@Component({
  selector: 'app-document-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="preview-overlay" (click)="onClose()">
      <div class="preview-content glass-panel" (click)="$event.stopPropagation()">
        <!-- Header Controls -->
        <div class="preview-header">
          <div class="doc-info">
            <span class="material-symbols-outlined type-icon">{{
              getFileIcon(document.type)
            }}</span>
            <div class="title-meta">
              <h2>{{ document.title }}</h2>
              <span>{{ document.author }} • {{ document.createdAt }} • {{ document.size }}</span>
            </div>
          </div>
          <div class="header-actions">
            <button
              class="btn btn-secondary btn-sm"
              (click)="downloadSimulated()"
              title="Descargar original"
            >
              <span class="material-symbols-outlined">download</span>
              <span>Descargar</span>
            </button>
            <button class="close-btn" (click)="onClose()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <!-- Toolbar of Viewer -->
        <div class="viewer-toolbar">
          <div class="zoom-controls" *ngIf="document.type === 'pdf' || document.type === 'img'">
            <button class="toolbar-btn" (click)="zoomOut()" [disabled]="zoomLevel() <= 50">
              <span class="material-symbols-outlined">zoom_out</span>
            </button>
            <span class="zoom-text">{{ zoomLevel() }}%</span>
            <button class="toolbar-btn" (click)="zoomIn()" [disabled]="zoomLevel() >= 200">
              <span class="material-symbols-outlined">zoom_in</span>
            </button>
          </div>

          <div class="page-controls" *ngIf="document.type === 'pdf'">
            <button class="toolbar-btn" (click)="prevPage()" [disabled]="currentPage() === 1">
              <span class="material-symbols-outlined">navigate_before</span>
            </button>
            <span class="page-text">Pág. {{ currentPage() }} de 4</span>
            <button class="toolbar-btn" (click)="nextPage()" [disabled]="currentPage() === 4">
              <span class="material-symbols-outlined">navigate_next</span>
            </button>
          </div>

          <div class="rotation-controls" *ngIf="document.type === 'img'">
            <button class="toolbar-btn" (click)="rotate()" title="Rotar 90°">
              <span class="material-symbols-outlined">rotate_right</span>
            </button>
          </div>
        </div>

        <!-- Main Viewer Content -->
        <div class="viewer-viewport">
          <!-- PDF Viewer Mock -->
          <div
            class="pdf-viewer-mock"
            *ngIf="document.type === 'pdf'"
            [style.transform]="'scale(' + zoomLevel() / 100 + ')'"
          >
            <div class="pdf-page glass-panel">
              <!-- Visual Mock of a document page depending on page number -->
              <div class="mock-text-layout">
                <div class="mock-h1">POLÍTICAS GENERALES DE SEGURIDAD V1.{{ currentPage() }}</div>
                <div class="mock-h2">Sección {{ currentPage() }}.1 - Protocolos de Acceso</div>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam at varius tellus.
                  Ut congue sollicitudin aliquet. Proin feugiat ligula sed dolor eleifend convallis.
                  Integer accumsan egestas sem, id feugiat sem feugiat et. Vestibulum in finibus mi,
                  et pulvinar risus.
                </p>
                <div class="mock-image-placeholder">
                  <span class="material-symbols-outlined placeholder-icon">schema</span>
                  <span class="caption"
                    >Figura {{ currentPage() }}.A: Diagrama de Flujo del Proceso</span
                  >
                </div>
                <p>
                  Mauris luctus scelerisque neque at luctus. Curabitur sed nisl pretium, tempus
                  augue nec, dictum elit. Praesent id interdum neque, sed volutpat elit. Quisque
                  scelerisque elit feugiat feugiat lobortis. Vestibulum vitae mi id sem interdum
                  accumsan.
                </p>
              </div>
            </div>
          </div>

          <!-- Image Viewer Mock -->
          <div
            class="image-viewer-mock"
            *ngIf="document.type === 'img'"
            [style.transform]="'scale(' + zoomLevel() / 100 + ') rotate(' + rotation() + 'deg)'"
          >
            <img
              src="https://picsum.photos/id/1018/800/600"
              alt="Vista previa de imagen"
              class="preview-img"
            />
          </div>

          <!-- Office Spreadsheet Viewer Mock -->
          <div class="office-viewer-mock" *ngIf="document.type === 'xls'">
            <div class="excel-grid glass-panel">
              <div class="excel-tabs">
                <span class="excel-tab active">Resumen 2026</span>
                <span class="excel-tab">Detalles</span>
                <span class="excel-tab">Análisis</span>
              </div>
              <table class="excel-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>A</th>
                    <th>B</th>
                    <th>C</th>
                    <th>D</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]">
                    <td class="row-num">{{ row }}</td>
                    <td>{{ row === 1 ? 'Concepto' : 'Servicios Globales' }}</td>
                    <td>{{ row === 1 ? 'Código' : 'SG-0' + row }}</td>
                    <td>{{ row === 1 ? 'Costo' : '$' + row * 1500 }}</td>
                    <td>{{ row === 1 ? 'Estado' : 'Aprobado' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Office Document Viewer Mock -->
          <div class="office-viewer-mock" *ngIf="document.type === 'doc'">
            <div class="word-doc glass-panel">
              <div class="doc-page">
                <div class="mock-h1">INFORME EJECUTIVO DE COMPRAS</div>
                <p>
                  Este informe detalla las adquisiciones y contratos ejecutados durante el primer
                  trimestre del periodo fiscal actual. El objetivo de este documento es justificar
                  los gastos de infraestructura cloud y licencias colaborativas ONLYOFFICE.
                </p>
                <div class="mock-h2">1. Resumen de Gastos</div>
                <ul>
                  <li>Servidores Cloud AWS: $45,000</li>
                  <li>Licencias Collabora/ONLYOFFICE: $12,500</li>
                  <li>Servicios de consultoría de seguridad: $8,000</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .preview-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1050;
        animation: fadeIn 0.2s ease-out;
      }

      .preview-content {
        width: 95vw;
        height: 90vh;
        display: flex;
        flex-direction: column;
        background: var(--bg-secondary);
        border: var(--glass-border);
        border-radius: var(--border-radius-lg);
        overflow: hidden;
        animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-card);
      }

      .doc-info {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .type-icon {
        font-size: 2.5rem;
        color: var(--primary);
      }

      .title-meta {
        h2 {
          font-size: 1.1rem;
          margin: 0;
        }
        span {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .close-btn {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.4rem;
        border-radius: 50%;
        transition: var(--transition-fast);

        &:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
      }

      .viewer-toolbar {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.5rem 1rem;
        background: var(--bg-tertiary);
        border-bottom: 1px solid var(--border-color);
        gap: 2rem;
      }

      .toolbar-btn {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 0.35rem;
        border-radius: var(--border-radius-sm);
        transition: var(--transition-fast);

        &:hover:not(:disabled) {
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        &:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
      }

      .zoom-controls,
      .page-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-secondary);
      }

      .viewer-viewport {
        flex: 1;
        overflow: auto;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 2rem;
        background: var(--bg-primary);
      }

      /* PDF View */
      .pdf-viewer-mock {
        transition: transform 0.2s ease;
        transform-origin: top center;
      }

      .pdf-page {
        width: 700px;
        min-height: 900px;
        background: #ffffff;
        color: #1e293b;
        padding: 3rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        border-radius: var(--border-radius-sm);
      }

      .mock-text-layout {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        text-align: justify;
        font-family: 'Inter', sans-serif;
        font-size: 0.9rem;
        line-height: 1.6;

        .mock-h1 {
          font-size: 1.5rem;
          font-weight: 800;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0.5rem;
          color: #0f172a;
        }
        .mock-h2 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #1e293b;
          margin-top: 0.5rem;
        }
      }

      .mock-image-placeholder {
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        padding: 2rem;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        color: #64748b;

        .placeholder-icon {
          font-size: 3rem;
        }
        .caption {
          font-size: 0.75rem;
          font-style: italic;
        }
      }

      /* Image View */
      .image-viewer-mock {
        transition: transform 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .preview-img {
        max-width: 100%;
        max-height: 70vh;
        border-radius: var(--border-radius-md);
        box-shadow: var(--glass-shadow);
      }

      /* Spreadsheet View */
      .excel-grid {
        width: 800px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .excel-tabs {
        background: var(--bg-tertiary);
        display: flex;
        border-bottom: 1px solid var(--border-color);
      }

      .excel-tab {
        padding: 0.5rem 1rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-secondary);
        border-right: 1px solid var(--border-color);
        cursor: pointer;

        &.active {
          background: var(--bg-secondary);
          color: var(--primary);
          border-bottom: 2px solid var(--primary);
        }
      }

      .excel-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;

        th {
          padding: 0.4rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          text-align: center;
        }

        td {
          padding: 0.4rem;
          border: 1px solid var(--border-color);
          text-align: left;
        }

        .row-num {
          background: var(--bg-tertiary);
          color: var(--text-muted);
          text-align: center;
          width: 30px;
          font-weight: 600;
        }
      }

      /* Word View */
      .word-doc {
        width: 700px;
        min-height: 600px;
        background: #ffffff;
        color: #1e293b;
        padding: 3rem;
        border-radius: var(--border-radius-sm);
      }

      .doc-page {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        font-family: 'Roboto', sans-serif;
        font-size: 0.9rem;
        line-height: 1.6;

        .mock-h1 {
          font-size: 1.6rem;
          font-weight: 700;
          color: #1e293b;
        }
        .mock-h2 {
          font-size: 1.2rem;
          font-weight: 600;
          color: #334155;
          margin-top: 1rem;
        }
        ul {
          padding-left: 1.5rem;
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes scaleUp {
        from {
          transform: scale(0.9);
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
export class DocumentPreviewComponent {
  @Input() document!: Document;
  @Output() close = new EventEmitter<void>();

  zoomLevel = signal(100);
  currentPage = signal(1);
  rotation = signal(0);

  zoomIn(): void {
    if (this.zoomLevel() < 200) {
      this.zoomLevel.set(this.zoomLevel() + 25);
    }
  }

  zoomOut(): void {
    if (this.zoomLevel() > 50) {
      this.zoomLevel.set(this.zoomLevel() - 25);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < 4) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  rotate(): void {
    this.rotation.set((this.rotation() + 90) % 360);
  }

  downloadSimulated(): void {
    alert(`Iniciando descarga simulada de: ${this.document.title}.${this.document.type}`);
  }

  onClose(): void {
    this.close.emit();
  }

  getFileIcon(type: 'pdf' | 'doc' | 'xls' | 'img'): string {
    switch (type) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'doc':
        return 'description';
      case 'xls':
        return 'table_chart';
      case 'img':
        return 'image';
      default:
        return 'draft';
    }
  }
}
