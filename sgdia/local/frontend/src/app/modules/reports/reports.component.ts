import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportBuilderComponent } from './report-builder.component';
import { TemplateManagerComponent } from './template-manager.component';
import { VoiceReportComponent } from './voice-report.component';
import { ReportViewerComponent } from './report-viewer.component';
import { ReportSchedulerComponent } from './report-scheduler.component';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReportBuilderComponent,
    TemplateManagerComponent,
    VoiceReportComponent,
    ReportViewerComponent,
    ReportSchedulerComponent,
  ],
  template: `
    <div class="reports-layout">
      <!-- Header -->
      <header class="reports-header glass-panel">
        <div class="header-left">
          <h2>Generador de Reportes</h2>
          <p class="subtitle">Crea, visualiza y programa informes analíticos</p>
        </div>

        <div class="header-right">
          <button class="btn btn-ai pulse-effect" (click)="showVoiceModal = true">
            <span class="material-symbols-outlined">mic_double</span> Reporte por Voz (IA)
          </button>
        </div>
      </header>

      <!-- Tabs -->
      <div class="tabs-container">
        <div class="tabs-nav">
          <button
            class="tab-btn"
            [class.active]="activeTab === 'builder'"
            (click)="activeTab = 'builder'"
          >
            <span class="material-symbols-outlined">add_circle</span> Crear Nuevo Reporte
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab === 'templates'"
            (click)="activeTab = 'templates'"
          >
            <span class="material-symbols-outlined">grid_view</span> Plantillas Guardadas
          </button>
        </div>

        <div class="tab-content">
          <app-report-builder
            *ngIf="activeTab === 'builder'"
            (generate)="onGenerateReport($event)"
          ></app-report-builder>
          <app-template-manager *ngIf="activeTab === 'templates'"></app-template-manager>
        </div>
      </div>

      <!-- Modals -->
      <app-voice-report
        *ngIf="showVoiceModal"
        (close)="showVoiceModal = false"
        (confirm)="onVoiceConfirm()"
      ></app-voice-report>
      <app-report-viewer
        *ngIf="showViewerModal"
        (close)="showViewerModal = false"
        (schedule)="openScheduler()"
      ></app-report-viewer>
      <app-report-scheduler
        *ngIf="showSchedulerModal"
        (close)="showSchedulerModal = false"
      ></app-report-scheduler>
    </div>
  `,
  styles: [
    `
      .reports-layout {
        padding: 2rem;
        display: flex;
        flex-direction: column;
        gap: 2rem;
        height: 100%;
        overflow-y: auto;
      }

      .reports-header {
        padding: 1.5rem 2rem;
        border-radius: var(--border-radius-lg);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .header-left {
        h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
          color: var(--text-primary);
        }
        .subtitle {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.95rem;
        }
      }

      .btn-ai {
        background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
        color: white;
        border: none;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;

        span {
          font-size: 1.25rem;
        }
        &:hover {
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
          transform: translateY(-2px);
        }
      }

      .pulse-effect {
        animation: softPulse 2s infinite;
      }

      .tabs-container {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        flex: 1;
      }

      .tabs-nav {
        display: flex;
        gap: 1rem;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.5rem;
      }

      .tab-btn {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        font-size: 1rem;
        font-weight: 500;
        padding: 0.5rem 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        position: relative;
        transition: color 0.2s;

        &:hover {
          color: var(--text-primary);
        }
        &.active {
          color: var(--primary);
          &::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: 0;
            width: 100%;
            height: 3px;
            background: var(--primary);
            border-radius: 3px 3px 0 0;
          }
        }
      }

      @keyframes softPulse {
        0% {
          box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(99, 102, 241, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
        }
      }
    `,
  ],
})
export class ReportsComponent {
  activeTab: 'builder' | 'templates' = 'builder';

  showVoiceModal = false;
  showViewerModal = false;
  showSchedulerModal = false;

  onVoiceConfirm() {
    this.showVoiceModal = false;
    this.activeTab = 'builder';
    // Emulate that the builder was filled by AI
    setTimeout(() => {
      this.showViewerModal = true;
    }, 500);
  }

  onGenerateReport(config: any) {
    console.log('Generating report with config:', config);
    this.showViewerModal = true;
  }

  openScheduler() {
    this.showViewerModal = false;
    this.showSchedulerModal = true;
  }
}
