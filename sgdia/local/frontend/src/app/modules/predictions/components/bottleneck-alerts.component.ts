import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictionsService, BottleneckAlert } from '../predictions.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-bottleneck-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="widget glass-panel">
      <div class="widget-header">
        <h3>Cuellos de botella</h3>
        <span class="material-symbols-outlined text-danger">warning</span>
      </div>

      <div class="widget-body">
        <ng-container *ngIf="alerts$ | async as alerts; else loading">
          <div class="alert-list">
            <div class="alert-item" *ngFor="let alert of alerts">
              <div class="risk-indicator" [ngClass]="alert.riskLevel"></div>

              <div class="alert-content">
                <div class="alert-title">{{ alert.stage }}</div>
                <div class="alert-meta">
                  <span
                    >Retraso prom: <strong>{{ alert.avgDelay }}</strong></span
                  >
                </div>
              </div>

              <div class="alert-trend" [ngClass]="alert.trend">
                <span class="material-symbols-outlined">
                  {{
                    alert.trend === 'up'
                      ? 'trending_up'
                      : alert.trend === 'down'
                        ? 'trending_down'
                        : 'trending_flat'
                  }}
                </span>
              </div>
            </div>
          </div>
        </ng-container>

        <ng-template #loading>
          <div class="skeleton-list">
            <div class="skeleton-item" *ngFor="let i of [1, 2, 3]"></div>
          </div>
        </ng-template>
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

      .text-danger {
        color: var(--danger);
      }

      .alert-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .alert-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: var(--bg-tertiary);
        border-radius: var(--border-radius-md);
        border: 1px solid var(--border-color);
        transition: transform 0.2s;

        &:hover {
          transform: translateX(4px);
        }
      }

      .risk-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;

        &.high {
          background: var(--danger);
          box-shadow: 0 0 8px var(--danger);
        }
        &.medium {
          background: #f59e0b;
          box-shadow: 0 0 8px #f59e0b;
        }
        &.low {
          background: var(--success);
          box-shadow: 0 0 8px var(--success);
        }
      }

      .alert-content {
        flex: 1;
      }

      .alert-title {
        font-weight: 600;
        color: var(--text-primary);
        font-size: 0.95rem;
        margin-bottom: 0.25rem;
      }

      .alert-meta {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .alert-trend {
        &.up {
          color: var(--danger);
        }
        &.down {
          color: var(--success);
        }
        &.stable {
          color: var(--text-muted);
        }
      }

      .skeleton-item {
        height: 60px;
        background: var(--bg-tertiary);
        border-radius: var(--border-radius-md);
        margin-bottom: 1rem;
        animation: pulse 1.5s infinite;
      }
    `,
  ],
})
export class BottleneckAlertsComponent implements OnInit {
  predService = inject(PredictionsService);
  alerts$!: Observable<BottleneckAlert[]>;

  ngOnInit() {
    this.alerts$ = this.predService.getBottlenecks();
  }
}
