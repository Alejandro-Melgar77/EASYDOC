import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CommentsPanelComponent } from './comments-panel.component';

interface CoEditorUser {
  id: string;
  name: string;
  avatar: string;
  status: 'editing' | 'connected';
  color: string; // Cursor color theme
}

@Component({
  selector: 'app-collaborative-editor',
  standalone: true,
  imports: [CommonModule, CommentsPanelComponent],
  template: `
    <div class="editor-layout">
      <!-- 🛠️ TOP ACTIONS BAR: Co-editors and Save statuses (Tarea 3.1) -->
      <header class="editor-header glass-panel">
        <div class="header-left">
          <button class="btn btn-secondary btn-sm" (click)="goBack()" title="Volver al repositorio">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div class="doc-meta">
            <h2>Manual_Procedimientos_SGA_2026.docx</h2>
            <span class="badge badge-info">ONLYOFFICE Integrado</span>
          </div>
        </div>

        <div class="header-right">
          <!-- Status Auto-Guardado (Tarea 3.1) -->
          <div class="autosave-status">
            <span class="material-symbols-outlined pulse-dot" [class.saving]="isSaving()">
              {{ isSaving() ? 'sync' : 'cloud_done' }}
            </span>
            <span class="status-text">{{
              isSaving() ? 'Guardando cambios...' : 'Cambios guardados'
            }}</span>
          </div>

          <!-- Usuarios Conectados Avatares (Tarea 3.1) -->
          <div class="connected-users">
            <div
              class="user-avatar-wrapper"
              *ngFor="let user of coEditors()"
              [style.border-color]="user.color"
              [title]="
                user.name + ' (' + (user.status === 'editing' ? 'Editando' : 'Conectado') + ')'
              "
            >
              <img [src]="user.avatar" alt="Avatar" class="user-avatar" />
              <span class="status-dot" [class.editing]="user.status === 'editing'"></span>
            </div>
          </div>

          <!-- Gestión de Sesión (Tarea 3.3) -->
          <div class="session-actions">
            <button class="btn btn-primary btn-sm" (click)="saveVersion()">
              <span class="material-symbols-outlined">save_as</span>
              <span>Guardar Versión</span>
            </button>
            <button class="btn btn-secondary btn-sm btn-danger-hover" (click)="closeSession()">
              <span class="material-symbols-outlined">close</span>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      <!-- 🖥️ MAIN WORKSPACE: Document Editor & Comments Sidebar -->
      <div class="editor-workspace">
        <!-- Lienzo del Editor Word/ONLYOFFICE (Mock) -->
        <main class="document-canvas glass-panel">
          <!-- Barra de Herramientas ONLYOFFICE -->
          <div class="office-ribbon">
            <div class="ribbon-tab active">Archivo</div>
            <div class="ribbon-tab">Inicio</div>
            <div class="ribbon-tab">Insertar</div>
            <div class="ribbon-tab">Diseño</div>
            <div class="ribbon-tab">Colaboración</div>
            <div class="ribbon-tools">
              <span class="material-symbols-outlined">undo</span>
              <span class="material-symbols-outlined">redo</span>
              <span class="material-symbols-outlined">content_cut</span>
              <span class="material-symbols-outlined">content_copy</span>
              <span class="material-symbols-outlined">format_bold</span>
              <span class="material-symbols-outlined">format_italic</span>
              <span class="material-symbols-outlined">format_underlined</span>
              <span class="material-symbols-outlined">format_align_left</span>
              <span class="material-symbols-outlined">format_align_center</span>
            </div>
          </div>

          <!-- Hoja del Documento -->
          <div class="document-sheet">
            <div class="sheet-page">
              <div class="page-header">EASYDOC - DIRECCION DE CARRERA</div>

              <div class="page-body">
                <h1 class="doc-h1">PROTOCOLO DE CASOS ESPECIALES ACADEMICOS</h1>

                <p>
                  El presente documento describe el conjunto de procedimientos de mitigación y
                  monitoreo ambiental a ser aplicados en toda la infraestructura tecnológica y
                  oficinas físicas de la institución. Estas directrices buscan estandarizar las
                  auditorías ecológicas trimestrales.
                </p>

                <h2 class="doc-h2">Sección 1. Control de Emisiones Cloud</h2>

                <p>
                  Toda la infraestructura de servidores y procesamiento de modelos de Deep Learning
                  debe configurarse utilizando regiones cloud con energía 100% renovable certificada
                  (ej. AWS Dublin o Oregon).
                </p>

                <!-- Simulador de texto y cursor de co-editor (Tarea 3.1) -->
                <div class="remote-editing-block">
                  <p class="paragraph-under-edit">
                    Se prohibe el uso de recursos GPU redundantes fuera del horario operativo de
                    08:00 a 19:00 horas
                    <!-- Cursor remoto de co-editor -->
                    <span class="remote-cursor" style="background-color: #f59e0b">
                      <span class="cursor-tooltip">Ana Gómez escribiendo...</span>
                    </span>
                    para evitar el consumo fantasma.
                  </p>
                </div>

                <p>
                  Las auditorías ambientales serán administradas mensualmente por el comité
                  directivo y almacenadas en el bitácora inmutable del sistema.
                </p>
              </div>

              <div class="page-footer">Página 1 de 12</div>
            </div>
          </div>
        </main>

        <!-- 💬 PANEL LATERAL: Comentarios (Tarea 3.2) -->
        <aside class="comments-sidebar glass-panel">
          <app-comments-panel></app-comments-panel>
        </aside>
      </div>
    </div>
  `,
  styles: [
    `
      .editor-layout {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 100px);
        gap: 1rem;
      }

      .editor-header {
        padding: 0.75rem 1.25rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 1rem;

        .doc-meta {
          h2 {
            font-size: 1rem;
            margin: 0;
          }
        }
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 1.5rem;
      }

      /* Autosave indicator status */
      .autosave-status {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
        font-weight: 500;

        .pulse-dot {
          font-size: 1.25rem;
          color: var(--success);

          &.saving {
            color: var(--primary);
            animation: spin 1.5s linear infinite;
          }
        }
      }

      /* Connected Users list */
      .connected-users {
        display: flex;
        align-items: center;
        margin-right: 0.5rem;
      }

      .user-avatar-wrapper {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 2px solid transparent;
        padding: 1px;
        margin-left: -8px;
        background: var(--bg-primary);
        position: relative;
        cursor: help;
        transition: transform 0.2s ease;

        &:first-child {
          margin-left: 0;
        }
        &:hover {
          transform: translateY(-4px) scale(1.1);
          z-index: 10;
        }
      }

      .user-avatar {
        width: 100%;
        height: 100%;
        border-radius: 50%;
      }

      .status-dot {
        position: absolute;
        bottom: -1px;
        right: -1px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--success);
        border: 1.5px solid var(--bg-primary);

        &.editing {
          background: var(--warning);
          animation: pulse-warn 1s infinite ease-in-out;
        }
      }

      .session-actions {
        display: flex;
        gap: 0.5rem;
      }

      .btn-danger-hover:hover {
        background-color: var(--danger);
        color: white;
        box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3);
      }

      /* Workspace */
      .editor-workspace {
        display: grid;
        grid-template-columns: 1fr 340px;
        gap: 1rem;
        flex: 1;
        overflow: hidden;

        @media (max-width: 992px) {
          grid-template-columns: 1fr;
          .comments-sidebar {
            display: none;
          }
        }
      }

      .document-canvas {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: var(--bg-card);
      }

      /* ONLYOFFICE Ribbon and controls */
      .office-ribbon {
        background: var(--bg-tertiary);
        border-bottom: 1px solid var(--border-color);
        padding: 0.25rem 0.5rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }

      .ribbon-tab {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-secondary);
        padding: 0.35rem 0.75rem;
        border-radius: 4px;
        cursor: pointer;

        &.active {
          background: var(--bg-secondary);
          color: var(--primary);
        }
      }

      .ribbon-tools {
        display: flex;
        border-left: 1px solid var(--border-color);
        padding-left: 0.75rem;
        margin-left: 0.25rem;
        gap: 0.5rem;
        color: var(--text-secondary);

        span {
          font-size: 1.15rem;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          &:hover {
            background: var(--bg-secondary);
            color: var(--text-primary);
          }
        }
      }

      .document-sheet {
        flex: 1;
        overflow-y: auto;
        padding: 2rem;
        background: var(--bg-primary);
        display: flex;
        justify-content: center;
      }

      .sheet-page {
        width: 100%;
        max-width: 800px;
        min-height: 1000px;
        background: #ffffff;
        color: #1e293b;
        padding: 4rem;
        box-shadow: var(--glass-shadow);
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
      }

      .page-header {
        font-size: 0.7rem;
        color: #94a3b8;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 0.5rem;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.05em;
      }

      .page-body {
        flex: 1;
        margin-top: 2rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        font-size: 0.9rem;
        line-height: 1.6;
        text-align: justify;

        .doc-h1 {
          font-size: 1.4rem;
          font-weight: 800;
          color: #0f172a;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0.5rem;
        }
        .doc-h2 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1e293b;
          margin-top: 1rem;
        }
      }

      .page-footer {
        font-size: 0.75rem;
        color: #94a3b8;
        border-top: 1px solid #e2e8f0;
        padding-top: 0.5rem;
        text-align: center;
      }

      /* Simulated Remote Cursor */
      .remote-editing-block {
        background: rgba(245, 158, 11, 0.05);
        border-left: 3px solid #f59e0b;
        padding: 0.25rem 0.5rem;
        border-radius: 0 4px 4px 0;
      }

      .paragraph-under-edit {
        position: relative;
        margin: 0;
      }

      .remote-cursor {
        display: inline-block;
        width: 2px;
        height: 1.2rem;
        vertical-align: middle;
        position: relative;
        animation: blink 1s step-end infinite;

        .cursor-tooltip {
          position: absolute;
          bottom: 100%;
          left: 0;
          background: #f59e0b;
          color: #ffffff;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.15rem 0.35rem;
          border-radius: 4px 4px 4px 0;
          white-space: nowrap;
          pointer-events: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }
      }

      .comments-sidebar {
        padding: 1.25rem;
        overflow-y: auto;
        height: 100%;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes blink {
        from,
        to {
          background-color: transparent;
        }
        50% {
          background-color: currentColor;
        }
      }

      @keyframes pulse-warn {
        0%,
        100% {
          transform: scale(1);
          opacity: 0.8;
        }
        50% {
          transform: scale(1.3);
          opacity: 1;
        }
      }
    `,
  ],
})
export class CollaborativeEditorComponent implements OnInit {
  private router = inject(Router);

  isSaving = signal(false);

  coEditors = signal<CoEditorUser[]>([
    {
      id: 'usr_2',
      name: 'Ana Gómez',
      avatar: 'https://ui-avatars.com/api/?name=Ana+Gomez&background=F59E0B&color=fff&bold=true',
      status: 'editing',
      color: '#f59e0b',
    },
    {
      id: 'usr_3',
      name: 'Carlos Pérez',
      avatar: 'https://ui-avatars.com/api/?name=Carlos+Perez&background=6366F1&color=fff&bold=true',
      status: 'connected',
      color: '#6366f1',
    },
  ]);

  ngOnInit(): void {
    this.simulateAutoSaving();
  }

  simulateAutoSaving(): void {
    // Simulate auto-save pulses every 8 seconds
    setInterval(() => {
      this.isSaving.set(true);
      setTimeout(() => {
        this.isSaving.set(false);
      }, 1500);
    }, 8000);
  }

  saveVersion(): void {
    const changelog = prompt('Resumen de cambios para la nueva versión (v1.2):');
    if (changelog && changelog.trim()) {
      alert(`Guardando nueva versión v1.2...\nDetalle: ${changelog}`);
    }
  }

  closeSession(): void {
    if (
      confirm(
        '¿Estás seguro de que deseas cerrar la sesión colaborativa? Se guardarán todos los cambios pendientes.',
      )
    ) {
      this.router.navigate(['/repository']);
    }
  }

  goBack(): void {
    this.router.navigate(['/repository']);
  }
}
