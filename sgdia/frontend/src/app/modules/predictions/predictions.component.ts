import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoutePredictionComponent } from './components/route-prediction.component';
import { BottleneckAlertsComponent } from './components/bottleneck-alerts.component';
import { AnomalyTimelineComponent } from './components/anomaly-timeline.component';
import { ResourceOptimizerComponent } from './components/resource-optimizer.component';
import { ModelStatus, PredictionsService, TrainingReadiness } from './predictions.service';

@Component({
  selector: 'app-predictions',
  standalone: true,
  imports: [
    CommonModule,
    RoutePredictionComponent,
    BottleneckAlertsComponent,
    AnomalyTimelineComponent,
    ResourceOptimizerComponent,
  ],
  template: `
    <div class="dashboard-layout">
      <header class="dashboard-header glass-panel">
        <div class="header-content">
          <div>
            <span class="ed-page-kicker">
              <span class="material-symbols-outlined">psychology</span>
              IA local offline
            </span>
            <h2>Riesgos y Predicciones EASYDOC</h2>
            <p class="subtitle">
              Entrenamiento institucional con flujos academicos entre marzo y julio 2026.
            </p>
          </div>

          <div class="model-signature" *ngIf="modelStatus() as model; else offlineModel">
            <span class="model-glyph material-symbols-outlined">memory</span>
            <div>
              <strong>Linea base local</strong>
              <span>{{ model.sampleCount }} flujos | Mar-Jul 2026</span>
            </div>
            <span class="model-state" [class.synthetic]="model.isSynthetic">
              {{ model.isSynthetic ? 'Datos sinteticos' : 'Datos operativos' }}
            </span>
          </div>
          <ng-template #offlineModel>
            <div class="model-signature muted">
              <span class="model-glyph material-symbols-outlined">memory</span>
              <div>
                <strong>Modelo local</strong><span>Esperando artefacto de entrenamiento</span>
              </div>
            </div>
          </ng-template>
        </div>
      </header>

      <section class="governance-strip" *ngIf="trainingReadiness() as readiness">
        <span class="material-symbols-outlined">gpp_maybe</span>
        <div>
          <strong>Control humano activo</strong>
          <span>
            {{ readiness.realCompletedWorkflows }}/{{ readiness.minimumRealCompletedWorkflows }}
            flujos reales anonimizados para abrir revision del modelo.
          </span>
        </div>
        <span
          class="governance-state"
          [class.reviewable]="readiness.decision === 'ready_for_human_review'"
        >
          {{
            readiness.decision === 'blocked' ? 'Automatizacion bloqueada' : 'Lista para revision'
          }}
        </span>
      </section>

      <div class="kpi-grid">
        <div class="kpi-card glass-card">
          <div class="kpi-info">
            <span class="kpi-label">Error medio de duracion</span>
            <h3 class="kpi-value">
              {{ modelStatus()?.durationMaeDays ?? '—' }} <small>dias</small>
            </h3>
            <span class="trend down">
              <span class="material-symbols-outlined">trending_down</span>
              Validado con julio
            </span>
          </div>
          <div class="kpi-icon"><span class="material-symbols-outlined">timer</span></div>
        </div>

        <div class="kpi-card glass-card">
          <div class="kpi-info">
            <span class="kpi-label">Cobertura de rutas</span>
            <h3 class="kpi-value text-danger">{{ routeCoverage() }}%</h3>
            <span class="trend up text-danger">
              <span class="material-symbols-outlined">account_tree</span>
              Politicas evaluadas: {{ modelStatus()?.policiesEvaluated ?? 0 }}
            </span>
          </div>
          <div class="kpi-icon">
            <span class="material-symbols-outlined text-danger">warning</span>
          </div>
        </div>

        <div class="kpi-card glass-card">
          <div class="kpi-info">
            <span class="kpi-label">Muestras de entrenamiento</span>
            <h3 class="kpi-value text-success">{{ modelStatus()?.sampleCount ?? 0 }}</h3>
            <span class="trend up text-success">
              <span class="material-symbols-outlined">verified</span>
              Modelo offline trazable
            </span>
          </div>
          <div class="kpi-icon">
            <span class="material-symbols-outlined text-success">savings</span>
          </div>
        </div>
      </div>

      <div class="widgets-grid">
        <div class="widget-col left-col">
          <app-route-prediction></app-route-prediction>
          <app-resource-optimizer></app-resource-optimizer>
        </div>
        <div class="widget-col right-col">
          <app-bottleneck-alerts></app-bottleneck-alerts>
          <app-anomaly-timeline></app-anomaly-timeline>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-layout {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        height: 100%;
        overflow-y: auto;
      }

      .dashboard-header {
        padding: 1.35rem;
        border-radius: var(--border-radius-lg);
        border-left: 3px solid rgba(var(--accent-rgb), 0.72);
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;

        h2 {
          margin: 0.25rem 0 0.35rem;
          font-size: 1.45rem;
          color: var(--text-primary);
        }

        .subtitle {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.45;
        }
      }

      .model-signature {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        min-width: 270px;
        padding: 0.65rem 0.8rem;
        border: 1px solid rgba(var(--accent-rgb), 0.25);
        background: linear-gradient(
          100deg,
          rgba(var(--accent-rgb), 0.12),
          rgba(var(--secondary-rgb), 0.09)
        );

        &.muted {
          opacity: 0.7;
        }

        .model-glyph {
          color: var(--accent);
        }
        div {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        strong {
          font-size: 0.78rem;
          letter-spacing: 0;
          text-transform: uppercase;
        }
        span {
          color: var(--text-secondary);
          font-size: 0.75rem;
        }

        .model-state {
          margin-left: auto;
          padding: 0.22rem 0.45rem;
          border: 1px solid rgba(var(--success-rgb, 79, 163, 107), 0.4);
          color: var(--success);
          font-weight: 800;
          font-size: 0.67rem;
          text-transform: uppercase;

          &.synthetic {
            border-color: rgba(var(--warning-rgb, 214, 162, 61), 0.4);
            color: var(--warning);
          }
        }
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 1rem;
      }

      .governance-strip {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.8rem 1rem;
        border: 1px solid rgba(var(--warning-rgb, 214, 162, 61), 0.38);
        border-left: 3px solid var(--warning);
        background: rgba(var(--warning-rgb, 214, 162, 61), 0.08);

        > span:first-child {
          color: var(--warning);
        }

        div {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 0.12rem;
          min-width: 0;
        }

        strong {
          color: var(--text-primary);
          font-size: 0.82rem;
        }

        div span {
          color: var(--text-secondary);
          font-size: 0.78rem;
        }

        .governance-state {
          color: var(--warning);
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0;
          text-align: right;
          text-transform: uppercase;

          &.reviewable {
            color: var(--success);
          }
        }

        @media (max-width: 600px) {
          align-items: flex-start;
          flex-wrap: wrap;

          .governance-state {
            width: 100%;
            padding-left: 2rem;
            text-align: left;
          }
        }
      }

      .kpi-card {
        padding: 1.35rem;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;

        .kpi-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .kpi-label {
          font-size: 0.78rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 800;
        }

        .kpi-value {
          margin: 0;
          font-size: 2.25rem;
          font-weight: 820;
          color: var(--text-primary);

          small {
            font-size: 1rem;
            color: var(--text-secondary);
            font-weight: 600;
          }
        }

        .trend {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8rem;
          font-weight: 700;

          &.down {
            color: var(--success);
          }
          &.up:not(.text-danger):not(.text-success) {
            color: var(--danger);
          }

          span {
            font-size: 1.1rem;
          }
        }

        .kpi-icon {
          width: 48px;
          height: 48px;
          background: rgba(var(--accent-rgb), 0.1);
          border-radius: var(--border-radius-md);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;

          span {
            font-size: 1.75rem;
            color: var(--accent);
          }
        }

        .text-danger {
          color: var(--danger);
        }

        .text-success {
          color: var(--success);
        }
      }

      .widgets-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        flex: 1;

        @media (max-width: 1200px) {
          grid-template-columns: 1fr;
        }
      }

      .widget-col {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
    `,
  ],
})
export class PredictionsComponent implements OnInit {
  private readonly predictions = inject(PredictionsService);
  readonly modelStatus = signal<ModelStatus | null>(null);
  readonly trainingReadiness = signal<TrainingReadiness | null>(null);

  ngOnInit(): void {
    this.predictions.getModelStatus().subscribe((status) => this.modelStatus.set(status));
    this.predictions
      .getTrainingReadiness()
      .subscribe((status) => this.trainingReadiness.set(status));
  }

  routeCoverage(): number {
    return Math.round((this.modelStatus()?.routeMatchRate ?? 0) * 100);
  }
}
