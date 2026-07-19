import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictionsService, ResourceSuggestion } from '../predictions.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-resource-optimizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="widget glass-panel">
      <div class="widget-header">
        <h3>Asignacion de recursos IA</h3>
        <span class="material-symbols-outlined text-primary">group_work</span>
      </div>

      <div class="widget-body">
        <p class="subtitle">Redistribucion sugerida para equilibrar cargas de trabajo por rol.</p>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Carga actual</th>
                <th>Carga optima</th>
                <th>Sugerencia IA</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngIf="suggestions$ | async as suggestions; else loading">
                <tr *ngFor="let row of suggestions">
                  <td>
                    <div class="user-cell">
                      <div class="avatar">{{ row.user.charAt(0) }}</div>
                      <span>{{ row.user }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="progress-bar">
                      <div
                        class="progress-fill"
                        [ngStyle]="{ width: Math.min(row.currentLoad, 100) + '%' }"
                        [class.danger]="row.currentLoad > 100"
                        [class.warning]="row.currentLoad > 90 && row.currentLoad <= 100"
                        [class.success]="row.currentLoad <= 90"
                      ></div>
                    </div>
                    <span class="load-text" [class.text-danger]="row.currentLoad > 100">
                      {{ row.currentLoad }}%
                    </span>
                  </td>
                  <td>
                    <div class="progress-bar optimal">
                      <div
                        class="progress-fill success"
                        [ngStyle]="{ width: row.optimalLoad + '%' }"
                      ></div>
                    </div>
                    <span class="load-text">{{ row.optimalLoad }}%</span>
                  </td>
                  <td class="suggestion-text">{{ row.suggestion }}</td>
                  <td>
                    <button class="btn btn-sm btn-secondary" [disabled]="row.currentLoad <= 100">
                      Aplicar
                    </button>
                  </td>
                </tr>
              </ng-container>

              <ng-template #loading>
                <tr *ngFor="let i of [1, 2, 3]">
                  <td colspan="5">
                    <div class="skeleton-line"></div>
                  </td>
                </tr>
              </ng-template>
            </tbody>
          </table>
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
        margin-bottom: 1rem;
      }

      .table-responsive {
        overflow-x: auto;
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;

        th {
          text-align: left;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-muted);
          font-weight: 800;
          font-size: 0.8rem;
          text-transform: uppercase;
        }

        td {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        tr:last-child td {
          border-bottom: none;
        }
      }

      .user-cell {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .avatar {
          width: 28px;
          height: 28px;
          border-radius: var(--border-radius-md);
          background: rgba(var(--accent-rgb), 0.1);
          border: 1px solid rgba(var(--accent-rgb), 0.26);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 850;
          font-size: 0.8rem;
          color: var(--accent);
        }
      }

      .progress-bar {
        width: 100px;
        height: 6px;
        background: var(--bg-tertiary);
        border-radius: 3px;
        overflow: hidden;
        display: inline-block;
        vertical-align: middle;
        margin-right: 0.5rem;

        &.optimal {
          opacity: 0.7;
        }

        .progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease-out;

          &.danger {
            background: var(--danger);
          }
          &.warning {
            background: var(--warning);
          }
          &.success {
            background: var(--success);
          }
        }
      }

      .load-text {
        font-size: 0.8rem;
        font-variant-numeric: tabular-nums;
      }

      .suggestion-text {
        color: var(--text-secondary);
        font-size: 0.85rem;
      }

      .btn-sm {
        padding: 0.25rem 0.75rem;
        font-size: 0.8rem;
      }

      .text-danger {
        color: var(--danger);
        font-weight: 800;
      }

      .skeleton-line {
        height: 24px;
        background: var(--bg-tertiary);
        border-radius: var(--border-radius-sm);
        animation: pulse 1.5s infinite;
      }
    `,
  ],
})
export class ResourceOptimizerComponent implements OnInit {
  predService = inject(PredictionsService);
  suggestions$!: Observable<ResourceSuggestion[]>;
  Math = Math;

  ngOnInit() {
    this.suggestions$ = this.predService.getResourceOptimizations();
  }
}
