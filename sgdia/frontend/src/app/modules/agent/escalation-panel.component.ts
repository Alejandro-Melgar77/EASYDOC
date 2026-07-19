import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-escalation-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop">
      <div class="modal-panel glass-card">
        <div class="modal-header">
          <div class="header-title">
            <span class="material-symbols-outlined warning-icon">support_agent</span>
            <h3>Hablar con un Humano</h3>
          </div>
          <button class="icon-btn" (click)="close.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="modal-body">
          <p>
            ¿No encontraste la respuesta que buscabas? Puedes escalar esta consulta a un experto en
            normativas del Nivel 2.
          </p>

          <div class="context-card">
            <span class="material-symbols-outlined">library_books</span>
            <div class="context-info">
              <h4>Se transferirá el contexto</h4>
              <p>
                Todo el historial de este chat se adjuntará automáticamente al ticket de soporte
                para que no tengas que repetir tu consulta.
              </p>
            </div>
          </div>

          <div class="form-group mt-3">
            <label>Mensaje adicional (Opcional)</label>
            <textarea
              class="form-control"
              rows="3"
              placeholder="Describe brevemente lo que necesitas..."
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="close.emit()">Cancelar</button>
          <button class="btn btn-primary" (click)="escalate()">Transferir Consulta</button>
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

        .header-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;

          h3 {
            margin: 0;
            font-size: 1.25rem;
          }
        }
      }

      .warning-icon {
        color: #f59e0b;
        font-size: 1.75rem;
      }

      .modal-body {
        padding: 1.5rem;

        p {
          color: var(--text-secondary);
          margin-top: 0;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }
      }

      .context-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);

        span {
          color: var(--primary);
          font-size: 2rem;
        }

        .context-info {
          h4 {
            margin: 0 0 0.25rem 0;
            color: var(--text-primary);
            font-size: 0.95rem;
          }
          p {
            margin: 0;
            font-size: 0.85rem;
            color: var(--text-muted);
          }
        }
      }

      .mt-3 {
        margin-top: 1.5rem;
      }
      textarea {
        width: 100%;
        resize: none;
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
export class EscalationPanelComponent {
  @Output() close = new EventEmitter<void>();

  escalate() {
    alert('Simulación: Ticket creado y transferido al equipo Nivel 2.');
    this.close.emit();
  }
}
