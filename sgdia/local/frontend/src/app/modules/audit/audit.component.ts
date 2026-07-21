import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel page-panel">
      <div class="panel-header">
        <span class="material-symbols-outlined header-icon text-gradient">shield_heart</span>
        <div>
          <h2>Auditoría del Sistema</h2>
          <p>Trazabilidad inmutable de todas las acciones del sistema y flujos de revisión.</p>
        </div>
      </div>
      <div class="mockup-content">
        <span class="material-symbols-outlined placeholder-icon">receipt_long</span>
        <h3>Bitácora de Eventos</h3>
        <p>
          Aquí se listarán todos los registros de auditoría (logs) con filtros por usuario, acción,
          fecha y entidad.
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .page-panel {
        padding: 2rem;
        min-height: 400px;
      }
      .panel-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 2rem;
        h2 {
          margin: 0;
          font-size: 1.5rem;
        }
        p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .header-icon {
          font-size: 2.5rem;
        }
      }
      .mockup-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        border: 2px dashed var(--border-color);
        border-radius: var(--border-radius-lg);
        color: var(--text-muted);
        text-align: center;
        gap: 1rem;
        .placeholder-icon {
          font-size: 4rem;
          color: var(--text-muted);
        }
        h3 {
          color: var(--text-primary);
          margin: 0;
        }
        p {
          max-width: 400px;
          margin: 0;
          font-size: 0.9rem;
        }
      }
    `,
  ],
})
export class AuditComponent {}
