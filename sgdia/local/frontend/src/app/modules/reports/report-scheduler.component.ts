import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-report-scheduler',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop">
      <div class="modal-panel glass-card">
        <div class="modal-header">
          <h3>Programar Reporte</h3>
          <button class="icon-btn" (click)="close.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group mb-4">
            <label>Frecuencia de Envío</label>
            <div class="frequency-options">
              <div class="freq-card active">
                <span class="material-symbols-outlined">today</span>
                <span>Diario</span>
              </div>
              <div class="freq-card">
                <span class="material-symbols-outlined">date_range</span>
                <span>Semanal</span>
              </div>
              <div class="freq-card">
                <span class="material-symbols-outlined">calendar_month</span>
                <span>Mensual</span>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label>Hora de Ejecución</label>
              <input type="time" class="form-control" value="08:00" />
            </div>
            <div class="form-group flex-1">
              <label>Formato Adjunto</label>
              <select class="form-control">
                <option>PDF Document</option>
                <option>Excel Spreadsheet</option>
                <option>CSV Data</option>
              </select>
            </div>
          </div>

          <div class="form-group mt-4">
            <label>Destinatarios (Correos)</label>
            <div class="recipients-box form-control">
              <span class="pill"
                >direccion&#64;easydoc.edu
                <span class="material-symbols-outlined">close</span></span
              >
              <span class="pill"
                >secretaria&#64;easydoc.edu
                <span class="material-symbols-outlined">close</span></span
              >
              <input type="text" placeholder="Añadir correo..." />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="close.emit()">Cancelar</button>
          <button class="btn btn-primary" (click)="save()">Guardar Programación</button>
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
        width: 550px;
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

      .frequency-options {
        display: flex;
        gap: 1rem;
        margin-top: 0.5rem;
      }

      .freq-card {
        flex: 1;
        padding: 1rem;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        background: var(--bg-tertiary);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        transition: all 0.2s;
        color: var(--text-secondary);

        span.material-symbols-outlined {
          font-size: 2rem;
        }

        &:hover {
          border-color: var(--primary);
          background: var(--bg-secondary);
        }
        &.active {
          background: var(--primary-glow);
          border-color: var(--primary);
          color: var(--primary);
        }
      }

      .form-row {
        display: flex;
        gap: 1.5rem;
      }
      .flex-1 {
        flex: 1;
      }
      .mb-4 {
        margin-bottom: 1.5rem;
      }
      .mt-4 {
        margin-top: 1.5rem;
      }

      .recipients-box {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0.5rem;
        min-height: auto;

        input {
          background: transparent;
          border: none;
          color: var(--text-primary);
          outline: none;
          flex: 1;
          min-width: 120px;
        }
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.8rem;

        span {
          font-size: 1rem;
          cursor: pointer;
          color: var(--text-muted);
          &:hover {
            color: var(--danger);
          }
        }
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
export class ReportSchedulerComponent {
  @Output() close = new EventEmitter<void>();

  save() {
    alert('Programación guardada con éxito.');
    this.close.emit();
  }
}
