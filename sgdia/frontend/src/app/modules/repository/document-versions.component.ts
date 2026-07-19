import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Document, DocumentVersion } from '../../core/models/document.model';

@Component({
  selector: 'app-document-versions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="versions-container">
      <div class="versions-header">
        <h4>Historial de Versiones</h4>
        <span class="doc-title-meta">{{ document.title }}</span>
      </div>

      <!-- Timeline visual -->
      <div class="timeline">
        <div
          class="timeline-item"
          *ngFor="let ver of document.versions; let isFirst = first; let idx = index"
          [class.current]="isFirst"
        >
          <div class="timeline-badge" [class.badge-primary]="isFirst">
            <span class="version-num">v{{ ver.version }}</span>
          </div>

          <div class="timeline-content glass-panel">
            <div class="version-header">
              <span class="author">{{ ver.author }}</span>
              <span class="date">{{ ver.date }}</span>
            </div>
            <p class="summary">{{ ver.summary }}</p>
            <div class="version-actions">
              <span class="file-size">{{ ver.fileSize }}</span>
              <button
                *ngIf="!isFirst"
                class="btn btn-secondary btn-xs restore-btn"
                (click)="restoreVersion(ver)"
              >
                <span class="material-symbols-outlined">settings_backup_restore</span>
                Restaurar
              </button>
              <span class="current-label" *ngIf="isFirst">Actual</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .versions-container {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .versions-header {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.75rem;

        h4 {
          font-size: 0.9rem;
          font-weight: 700;
          margin: 0;
        }
        .doc-title-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      }

      .timeline {
        position: relative;
        padding-left: 3rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 28px;
          width: 2px;
          background: var(--border-color);
        }
      }

      .timeline-item {
        position: relative;
      }

      .timeline-badge {
        position: absolute;
        left: -42px;
        top: 4px;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: var(--bg-tertiary);
        border: 2px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;

        &.badge-primary {
          background: var(--primary-glow);
          border-color: var(--primary);
          .version-num {
            color: var(--primary);
            font-weight: 700;
          }
        }
      }

      .version-num {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--text-secondary);
      }

      .timeline-content {
        padding: 1rem;
        border-radius: var(--border-radius-md);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .version-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .author {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .date {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
      }

      .summary {
        font-size: 0.8rem;
        color: var(--text-secondary);
        margin: 0;
        line-height: 1.4;
      }

      .version-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.25rem;
        border-top: 1px dashed var(--border-color);
        padding-top: 0.5rem;

        .file-size {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
      }

      .restore-btn {
        padding: 0.2rem 0.5rem;
        font-size: 0.7rem;
        display: flex;
        align-items: center;
        gap: 0.2rem;
      }

      .current-label {
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--success);
      }
    `,
  ],
})
export class DocumentVersionsComponent {
  @Input() document!: Document;
  @Output() versionRestored = new EventEmitter<DocumentVersion>();

  restoreVersion(version: DocumentVersion): void {
    if (
      confirm(`¿Estás seguro de que deseas restaurar la versión ${version.version} como la actual?`)
    ) {
      this.versionRestored.emit(version);
    }
  }
}
