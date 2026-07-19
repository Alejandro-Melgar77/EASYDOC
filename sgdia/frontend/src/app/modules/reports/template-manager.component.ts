import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-template-manager',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="template-manager">
      <div class="toolbar">
        <div class="search-box">
          <span class="material-symbols-outlined">search</span>
          <input type="text" placeholder="Buscar plantillas..." />
        </div>
      </div>

      <div class="templates-grid">
        <div class="template-card glass-card" *ngFor="let tmpl of templates">
          <div class="card-header">
            <span class="material-symbols-outlined template-icon" [ngClass]="tmpl.iconColor">{{
              tmpl.icon
            }}</span>
            <div class="actions">
              <button class="icon-btn" title="Editar">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="icon-btn text-danger" title="Eliminar">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>

          <div class="card-body">
            <h4>{{ tmpl.title }}</h4>
            <p>{{ tmpl.description }}</p>
          </div>

          <div class="card-footer">
            <span class="meta-tag"
              ><span class="material-symbols-outlined">schedule</span> {{ tmpl.frequency }}</span
            >
            <button class="btn btn-primary btn-sm">Generar Ahora</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .template-manager {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .toolbar {
        display: flex;
        justify-content: flex-end;
      }

      .search-box {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: 20px;
        padding: 0.5rem 1rem;
        width: 300px;

        span {
          color: var(--text-muted);
          font-size: 1.25rem;
        }
        input {
          background: transparent;
          border: none;
          color: var(--text-primary);
          outline: none;
          flex: 1;
          &::placeholder {
            color: var(--text-muted);
          }
        }
      }

      .templates-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1.5rem;
      }

      .template-card {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        transition: transform 0.2s;

        &:hover {
          transform: translateY(-4px);
          border-color: var(--primary);
        }
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;

        .template-icon {
          font-size: 2.5rem;
          padding: 0.5rem;
          border-radius: 12px;
          background: var(--bg-secondary);

          &.blue {
            color: #3b82f6;
            background: rgba(59, 130, 246, 0.1);
          }
          &.green {
            color: #22c55e;
            background: rgba(34, 197, 94, 0.1);
          }
          &.purple {
            color: #8b5cf6;
            background: rgba(139, 92, 246, 0.1);
          }
        }

        .actions {
          display: flex;
          gap: 0.25rem;
        }
        .text-danger {
          color: var(--danger);
        }
      }

      .card-body {
        h4 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
          font-size: 1.1rem;
        }
        p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.85rem;
          line-height: 1.5;
        }
      }

      .card-footer {
        margin-top: auto;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;

        .meta-tag {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 500;
          span {
            font-size: 1.1rem;
          }
        }
      }
    `,
  ],
})
export class TemplateManagerComponent {
  templates = [
    {
      title: 'Reporte Mensual de Tramites',
      description: 'Resumen agrupado por departamento, politica academica y estado del expediente.',
      frequency: 'Mensual',
      icon: 'assignment',
      iconColor: 'blue',
    },
    {
      title: 'Cuellos de Botella Julio',
      description:
        'Listado de etapas con retraso, funcionarios sobrecargados y prioridad sugerida por IA.',
      frequency: 'Trimestral',
      icon: 'crisis_alert',
      iconColor: 'green',
    },
    {
      title: 'Auditoria de Asistente EASY',
      description: 'Registro de consultas estudiantiles y politicas recomendadas por el agente.',
      frequency: 'Semanal',
      icon: 'support_agent',
      iconColor: 'purple',
    },
  ];
}
