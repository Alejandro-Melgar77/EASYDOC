import { Component, OnInit, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { PredictionsService } from '../predictions.service';

Chart.register(...registerables);

@Component({
  selector: 'app-anomaly-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="widget glass-panel">
      <div class="widget-header">
        <h3>Línea de Tiempo de Anomalías</h3>
        <span class="material-symbols-outlined text-info">timeline</span>
      </div>
      <div class="widget-body chart-container">
        <canvas #anomalyChart></canvas>
      </div>
    </div>
  `,
  styles: [
    `
      .widget {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
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

      .text-info {
        color: #3b82f6;
      }

      .chart-container {
        flex: 1;
        position: relative;
        min-height: 250px;
      }
    `,
  ],
})
export class AnomalyTimelineComponent implements OnInit {
  @ViewChild('anomalyChart', { static: true }) chartRef!: ElementRef;
  predService = inject(PredictionsService);
  chart!: Chart;

  ngOnInit(): void {
    this.predService.getAnomalyData().subscribe((anomalyData) => this.initChart(anomalyData));
  }

  initChart(anomalyData: Array<{ x: number; y: number; r: number }>): void {
    const ctx = this.chartRef.nativeElement.getContext('2d');

    this.chart = new Chart(ctx, {
      type: 'bubble',
      data: {
        datasets: [
          {
            label: 'Anomalías Detectadas',
            data: anomalyData,
            backgroundColor: 'rgba(239, 68, 68, 0.6)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context: any) =>
                `Día ${context.raw.x}, Hora ${context.raw.y}:00 - Severidad: ${context.raw.r}`,
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Día del Mes', color: '#9ca3af' },
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#9ca3af' },
          },
          y: {
            title: { display: true, text: 'Hora (0-23)', color: '#9ca3af' },
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#9ca3af' },
          },
        },
      },
    });
  }
}
