import { Component, Output, EventEmitter, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-report-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop">
      <div class="modal-panel glass-card viewer-panel">
        <div class="modal-header">
          <div class="header-info">
            <h3>Visualización del Reporte</h3>
            <span class="badge badge-success">Generado</span>
          </div>

          <div class="header-actions">
            <button class="btn btn-outline-primary btn-sm" (click)="schedule.emit()">
              <span class="material-symbols-outlined">schedule</span> Programar
            </button>
            <button class="btn btn-primary btn-sm">
              <span class="material-symbols-outlined">download</span> Descargar PDF
            </button>
            <button class="icon-btn ml-3" (click)="close.emit()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div class="modal-body viewer-body">
          <div class="report-document glass-panel">
            <h1 class="report-title">Reporte de Tramites Academicos</h1>
            <p class="report-meta">
              Generado el: {{ currentDate | date: 'medium' }} | Modulo: Solicitudes
            </p>

            <div class="kpi-row">
              <div class="kpi-box">
                <span class="label">Total Solicitudes</span>
                <span class="value">142</span>
              </div>
              <div class="kpi-box">
                <span class="label">Casos resueltos</span>
                <span class="value">118</span>
              </div>
              <div class="kpi-box">
                <span class="label">Tiempo Promedio</span>
                <span class="value">3.2 días</span>
              </div>
            </div>

            <div class="chart-container">
              <canvas #barChart></canvas>
            </div>

            <table class="report-table">
              <thead>
                <tr>
                  <th>Departamento</th>
                  <th>Solicitudes</th>
                  <th>Monto Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Ventas</td>
                  <td>85</td>
                  <td>$32,000</td>
                  <td><span class="status-dot success"></span> Dentro del ppto</td>
                </tr>
                <tr>
                  <td>Marketing</td>
                  <td>34</td>
                  <td>$8,500</td>
                  <td><span class="status-dot success"></span> Dentro del ppto</td>
                </tr>
                <tr>
                  <td>Dirección</td>
                  <td>23</td>
                  <td>$4,700</td>
                  <td><span class="status-dot warning"></span> Alerta de exceso</td>
                </tr>
              </tbody>
            </table>
          </div>
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
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .viewer-panel {
        width: 90vw;
        max-width: 1000px;
        height: 90vh;
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
        background: var(--bg-secondary);

        .header-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          h3 {
            margin: 0;
          }
        }
        .header-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .ml-3 {
          margin-left: 1rem;
        }
      }

      .viewer-body {
        padding: 2rem;
        flex: 1;
        overflow-y: auto;
        background: var(--bg-primary);
      }

      .report-document {
        background: var(--bg-secondary);
        padding: 3rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        max-width: 800px;
        margin: 0 auto;
      }

      .report-title {
        margin: 0 0 0.5rem 0;
        color: var(--text-primary);
        font-size: 2rem;
        border-bottom: 2px solid var(--primary);
        padding-bottom: 1rem;
      }
      .report-meta {
        color: var(--text-muted);
        font-size: 0.9rem;
        margin-bottom: 2rem;
      }

      .kpi-row {
        display: flex;
        gap: 1.5rem;
        margin-bottom: 2.5rem;
      }

      .kpi-box {
        flex: 1;
        background: var(--bg-tertiary);
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        .label {
          color: var(--text-secondary);
          font-size: 0.85rem;
          text-transform: uppercase;
          font-weight: 600;
        }
        .value {
          color: var(--primary);
          font-size: 2rem;
          font-weight: bold;
        }
      }

      .chart-container {
        height: 300px;
        margin-bottom: 2.5rem;
        position: relative;
      }

      .report-table {
        width: 100%;
        border-collapse: collapse;

        th {
          text-align: left;
          padding: 1rem;
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border-bottom: 2px solid var(--border-color);
        }
        td {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-secondary);
        }

        .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 0.5rem;
          &.success {
            background: var(--success);
            box-shadow: 0 0 5px var(--success);
          }
          &.warning {
            background: #f59e0b;
            box-shadow: 0 0 5px #f59e0b;
          }
        }
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
export class ReportViewerComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() schedule = new EventEmitter<void>();
  @ViewChild('barChart', { static: true }) chartRef!: ElementRef;

  currentDate = new Date();
  chart!: Chart;

  ngOnInit() {
    this.initChart();
  }

  initChart() {
    const ctx = this.chartRef.nativeElement.getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Solicitudes academicas',
            data: [58, 74, 91, 126, 141, 168],
            backgroundColor: 'rgba(99, 102, 241, 0.6)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#9ca3af' },
          },
          x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
        },
      },
    });
  }
}
