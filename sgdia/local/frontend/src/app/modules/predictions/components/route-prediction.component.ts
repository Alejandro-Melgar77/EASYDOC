import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-route-prediction',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="widget glass-panel">
      <div class="widget-header">
        <h3>Ruta optima sugerida</h3>
        <span class="material-symbols-outlined text-primary">route</span>
      </div>

      <div class="widget-body">
        <p class="subtitle">
          Desviacion detectada en "Casos Especiales" por requisitos incompletos.
        </p>

        <div class="route-comparison">
          <div class="route real-route">
            <span class="route-label">Ruta actual (prom. 5.6 dias)</span>
            <div class="nodes">
              <div class="node completed" title="Recepcion">REC</div>
              <div class="line completed"></div>
              <div class="node completed" title="Revision de requisitos">REQ</div>
              <div class="line warning"></div>
              <div class="node warning" title="Validacion academica">VAC</div>
              <div class="line"></div>
              <div class="node pending" title="Consejo de carrera">CON</div>
              <div class="line"></div>
              <div class="node pending" title="Respuesta">RES</div>
            </div>
          </div>

          <div class="route optimal-route">
            <span class="route-label text-success">Ruta IA (pred. 3.1 dias)</span>
            <div class="nodes">
              <div class="node optimal">REC</div>
              <div class="line optimal"></div>
              <div class="node optimal">REQ</div>
              <div class="line optimal dashed"></div>
              <div class="node optimal highlight">DIR</div>
              <div class="line optimal"></div>
              <div class="node optimal">RES</div>
            </div>
          </div>
        </div>

        <div class="insight-card">
          <span class="material-symbols-outlined icon-bulb">lightbulb</span>
          <p>
            <strong>Insight:</strong> Si EASYDOC valida el registro universitario al recibir la
            solicitud, Direccion solo revisa expedientes completos y se reducen 2.5 dias.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .widget {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        height: 100%;
      }

      .widget-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        h3 {
          margin: 0;
          font-size: 1.1rem;
          color: var(--text-primary);
        }
      }

      .text-primary {
        color: var(--accent);
      }

      .subtitle {
        color: var(--text-secondary);
        font-size: 0.9rem;
        margin-top: 0;
      }

      .route-comparison {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .route-label {
        display: block;
        font-size: 0.8rem;
        font-weight: 700;
        margin-bottom: 0.75rem;
        color: var(--text-muted);
      }

      .text-success {
        color: var(--success);
      }

      .nodes {
        display: flex;
        align-items: center;
        width: 100%;
      }

      .node {
        min-width: 38px;
        height: 34px;
        border-radius: var(--border-radius-md);
        background: var(--bg-tertiary);
        border: 2px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.68rem;
        font-weight: 850;
        color: var(--text-secondary);
        z-index: 2;
        flex-shrink: 0;

        &.completed {
          border-color: var(--secondary);
          color: var(--secondary);
        }
        &.warning {
          border-color: var(--warning);
          color: var(--warning);
          box-shadow: 0 0 10px rgba(214, 162, 61, 0.25);
        }
        &.pending {
          border-color: var(--border-color);
          opacity: 0.55;
        }
        &.optimal {
          border-color: var(--success);
          color: var(--success);
        }
        &.highlight {
          background: rgba(79, 163, 107, 0.18);
        }
      }

      .line {
        flex: 1;
        height: 2px;
        background: var(--border-color);
        z-index: 1;

        &.completed {
          background: var(--secondary);
        }
        &.warning {
          background: var(--warning);
        }
        &.optimal {
          background: var(--success);
        }
        &.dashed {
          background: repeating-linear-gradient(
            90deg,
            var(--success),
            var(--success) 5px,
            transparent 5px,
            transparent 10px
          );
        }
      }

      .insight-card {
        margin-top: auto;
        background: rgba(var(--accent-rgb), 0.1);
        border-left: 3px solid var(--accent);
        padding: 1rem;
        border-radius: var(--border-radius-md);
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;

        .icon-bulb {
          color: var(--accent);
        }

        p {
          margin: 0;
          font-size: 0.85rem;
          line-height: 1.5;
          color: var(--text-secondary);
        }
      }
    `,
  ],
})
export class RoutePredictionComponent {}
