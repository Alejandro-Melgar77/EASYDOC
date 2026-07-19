import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-container">
      <header class="desk-header glass-panel">
        <div>
          <span class="ed-page-kicker">
            <span class="material-symbols-outlined">assured_workload</span>
            EASYDOC Universidad
          </span>
          <h1 class="ed-page-title">
            Mesa de Control Academica
            <span>{{ authService.currentUser()?.name }}</span>
          </h1>
          <p class="ed-page-subtitle">
            Seguimiento colaborativo de politicas, formularios dinamicos, expedientes estudiantiles
            y riesgos operativos entre marzo y julio 2026.
          </p>
        </div>

        <div class="ed-command-bar">
          <a class="btn btn-accent" routerLink="/uml-designer">
            <span class="material-symbols-outlined">add_task</span>
            Nuevo tramite
          </a>
          <a class="btn btn-secondary" routerLink="/policies">
            <span class="material-symbols-outlined">account_tree</span>
            Editar politica
          </a>
          <button class="btn btn-secondary">
            <span class="material-symbols-outlined">upload_file</span>
            Cargar requisito
          </button>
        </div>
      </header>

      <section class="stats-grid">
        <div class="glow-card stat-card" *ngFor="let item of stats()">
          <div class="stat-icon" [ngClass]="item.color">
            <span class="material-symbols-outlined">{{ item.icon }}</span>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ item.value }}</span>
            <span class="stat-label">{{ item.label }}</span>
          </div>
          <span class="stat-trend" [ngClass]="item.trendColor">{{ item.trend }}</span>
        </div>
      </section>

      <section class="main-sections">
        <div class="glass-panel content-panel">
          <div class="panel-header">
            <div>
              <span class="panel-kicker">Expedientes vivos</span>
              <h2>Ultimos documentos recibidos</h2>
            </div>
            <button class="btn btn-secondary btn-sm">
              <span class="material-symbols-outlined">open_in_new</span>
              Ver cola
            </button>
          </div>
          <div class="docs-list">
            <div class="doc-row ed-artifact" *ngFor="let doc of recentDocs()">
              <div class="doc-meta">
                <span class="material-symbols-outlined doc-icon">{{ doc.icon }}</span>
                <div class="doc-text">
                  <span class="doc-title">{{ doc.title }}</span>
                  <span class="doc-info"
                    >{{ doc.author }} - {{ doc.date }} - {{ doc.department }}</span
                  >
                </div>
              </div>
              <span class="badge" [ngClass]="'badge-' + doc.statusColor">{{ doc.status }}</span>
            </div>
          </div>
        </div>

        <div class="glass-panel content-panel ai-panel">
          <div class="panel-header">
            <div>
              <span class="panel-kicker">Modelo local offline</span>
              <h2>Consejo EASY IA</h2>
            </div>
            <span class="badge badge-info">Entrenado Mar-Jul</span>
          </div>
          <div class="ai-insights">
            <div class="insight-item">
              <span class="material-symbols-outlined insight-icon">route</span>
              <div class="insight-text">
                <strong>Ruta recomendada</strong>
                <p>
                  Casos Especiales debe iniciar por Secretaria Academica y saltar a Direccion solo
                  cuando el registro universitario este validado.
                </p>
              </div>
            </div>
            <hr class="divider" />
            <div class="insight-item">
              <span class="material-symbols-outlined insight-icon warning">speed</span>
              <div class="insight-text">
                <strong>Cuello de botella probable</strong>
                <p>
                  La revision de requisitos de becas acumula +31 horas cuando dos secretarias quedan
                  con mas de 82% de carga semanal.
                </p>
              </div>
            </div>
            <hr class="divider" />
            <div class="priority-strip">
              <span class="material-symbols-outlined">priority_high</span>
              Priorizar estudiantes en egreso y solicitudes con fecha limite menor a 72 horas.
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .desk-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1.25rem;
        padding: 1.35rem;
        border-left: 3px solid rgba(var(--accent-rgb), 0.72);
      }

      .ed-page-title span {
        display: block;
        color: var(--accent);
        font-size: 1rem;
        margin-top: 0.25rem;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        gap: 1rem;
      }

      .stat-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        min-height: 112px;
      }

      .stat-icon {
        width: 46px;
        height: 46px;
        border-radius: var(--border-radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        border: 1px solid var(--border-color);

        &.navy {
          background: rgba(var(--primary-rgb), 0.22);
          color: var(--accent);
        }
        &.teal {
          background: rgba(var(--secondary-rgb), 0.18);
          color: var(--secondary);
        }
        &.green {
          background: rgba(79, 163, 107, 0.16);
          color: var(--success);
        }
        &.ruby {
          background: rgba(139, 63, 85, 0.18);
          color: var(--ruby);
        }
      }

      .stat-info {
        display: flex;
        flex-direction: column;
        flex-grow: 1;

        .stat-value {
          font-size: 1.75rem;
          font-weight: 850;
          line-height: 1;
        }

        .stat-label {
          font-size: 0.78rem;
          color: var(--text-secondary);
          font-weight: 700;
          line-height: 1.35;
        }
      }

      .stat-trend {
        font-size: 0.72rem;
        font-weight: 800;
        position: absolute;
        top: 0.85rem;
        right: 1rem;

        &.success {
          color: var(--success);
        }
        &.danger {
          color: var(--danger);
        }
        &.muted {
          color: var(--text-muted);
        }
      }

      .main-sections {
        display: grid;
        grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.8fr);
        gap: 1rem;

        @media (max-width: 1080px) {
          grid-template-columns: 1fr;
        }
      }

      .content-panel {
        padding: 1.35rem;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
        gap: 1rem;

        h2 {
          font-size: 1.05rem;
          margin: 0.15rem 0 0;
        }
      }

      .panel-kicker {
        color: var(--accent);
        font-size: 0.72rem;
        font-weight: 850;
        text-transform: uppercase;
      }

      .btn-sm {
        padding: 0.36rem 0.75rem;
        font-size: 0.76rem;
      }

      .docs-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .doc-row {
        justify-content: space-between;
      }

      .doc-meta {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 0;
      }

      .doc-icon {
        color: var(--accent);
        flex-shrink: 0;
      }

      .doc-text {
        display: flex;
        flex-direction: column;
        min-width: 0;

        .doc-title {
          font-size: 0.875rem;
          font-weight: 750;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .doc-info {
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.35;
        }
      }

      .ai-panel {
        background:
          linear-gradient(160deg, rgba(var(--accent-rgb), 0.08), transparent 48%), var(--bg-card);
      }

      .ai-insights {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .insight-item {
        display: flex;
        gap: 0.85rem;
      }

      .insight-icon {
        color: var(--secondary);
        font-size: 1.75rem;
        flex-shrink: 0;

        &.warning {
          color: var(--warning);
        }
      }

      .insight-text strong {
        font-size: 0.875rem;
        color: var(--text-primary);
        display: block;
        margin-bottom: 0.25rem;
      }

      .insight-text p {
        font-size: 0.825rem;
        color: var(--text-secondary);
        line-height: 1.45;
      }

      .priority-strip {
        display: flex;
        gap: 0.55rem;
        align-items: flex-start;
        padding: 0.8rem;
        border-radius: var(--border-radius-md);
        background: rgba(var(--accent-rgb), 0.1);
        border: 1px solid rgba(var(--accent-rgb), 0.24);
        color: var(--text-primary);
        font-size: 0.82rem;
        line-height: 1.4;
      }

      .divider {
        border: 0;
        height: 1px;
        background: var(--border-color);
      }

      @media (max-width: 900px) {
        .desk-header {
          flex-direction: column;
        }

        .ed-command-bar {
          width: 100%;
        }
      }
    `,
  ],
})
export class DashboardComponent {
  authService = inject(AuthService);

  stats = signal([
    {
      icon: 'assignment',
      value: '486',
      label: 'Solicitudes academicas Mar-Jul',
      trend: '+18% en julio',
      trendColor: 'success',
      color: 'navy',
    },
    {
      icon: 'dynamic_form',
      value: '22',
      label: 'Formularios dinamicos publicados',
      trend: '7 politicas activas',
      trendColor: 'muted',
      color: 'teal',
    },
    {
      icon: 'folder_supervised',
      value: '1,934',
      label: 'Archivos en repositorios por trabajador',
      trend: 'Trazabilidad completa',
      trendColor: 'success',
      color: 'green',
    },
    {
      icon: 'crisis_alert',
      value: '4',
      label: 'Riesgos altos de cuello de botella',
      trend: 'Requiere accion',
      trendColor: 'danger',
      color: 'ruby',
    },
  ]);

  recentDocs = signal([
    {
      icon: 'picture_as_pdf',
      title: 'CE-2026-0714 Registro universitario y carta de solicitud.pdf',
      author: 'Luis Mendoza',
      department: 'Secretaria Academica',
      date: '14 Jul 2026',
      status: 'En curso',
      statusColor: 'info',
    },
    {
      icon: 'table_chart',
      title: 'HN-2026-0709 Planilla de homologacion.xlsx',
      author: 'Mariela Choque',
      department: 'Jefatura de Carrera',
      date: '09 Jul 2026',
      status: 'Observado',
      statusColor: 'warning',
    },
    {
      icon: 'description',
      title: 'CN-2026-0702 Formulario certificado de notas.docx',
      author: 'Diego Paredes',
      department: 'Archivo Academico',
      date: '02 Jul 2026',
      status: 'Aprobado',
      statusColor: 'success',
    },
    {
      icon: 'perm_identity',
      title: 'RB-2026-0628 Documento de identidad y solicitud de beca.jpg',
      author: 'Valeria Rojas',
      department: 'Bienestar Estudiantil',
      date: '28 Jun 2026',
      status: 'Recibido',
      statusColor: 'info',
    },
  ]);
}
