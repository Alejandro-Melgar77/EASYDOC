import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-report-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="report-builder">
      <!-- Stepper Header -->
      <div class="stepper-header">
        <div
          class="step"
          [class.active]="currentStep >= 1"
          [class.completed]="currentStep > 1"
          (click)="setStep(1)"
        >
          <div class="step-circle">1</div>
          <div class="step-label">Datos</div>
        </div>
        <div class="step-line" [class.active]="currentStep > 1"></div>
        <div
          class="step"
          [class.active]="currentStep >= 2"
          [class.completed]="currentStep > 2"
          (click)="setStep(2)"
        >
          <div class="step-circle">2</div>
          <div class="step-label">Filtros</div>
        </div>
        <div class="step-line" [class.active]="currentStep > 2"></div>
        <div
          class="step"
          [class.active]="currentStep >= 3"
          [class.completed]="currentStep > 3"
          (click)="setStep(3)"
        >
          <div class="step-circle">3</div>
          <div class="step-label">Formato</div>
        </div>
      </div>

      <!-- Stepper Content -->
      <div class="stepper-content glass-card">
        <!-- Step 1: Data Source -->
        <div *ngIf="currentStep === 1" class="step-pane animation-slide-in">
          <h3>Selecciona el modulo de datos</h3>
          <p class="text-muted">Sobre que area deseas generar el reporte?</p>

          <div class="options-grid mt-4">
            <div
              class="option-card"
              [class.selected]="config.module === 'solicitudes'"
              (click)="config.module = 'solicitudes'"
            >
              <span class="material-symbols-outlined">assignment</span>
              <h4>Solicitudes</h4>
            </div>
            <div
              class="option-card"
              [class.selected]="config.module === 'formularios'"
              (click)="config.module = 'formularios'"
            >
              <span class="material-symbols-outlined">dynamic_form</span>
              <h4>Formularios</h4>
            </div>
            <div
              class="option-card"
              [class.selected]="config.module === 'expedientes'"
              (click)="config.module = 'expedientes'"
            >
              <span class="material-symbols-outlined">folder_managed</span>
              <h4>Expedientes</h4>
            </div>
          </div>
        </div>

        <!-- Step 2: Filters -->
        <div *ngIf="currentStep === 2" class="step-pane animation-slide-in">
          <h3>Filtros y Parámetros</h3>
          <p class="text-muted">Acota los datos que se incluirán en el reporte.</p>

          <div class="form-grid mt-4">
            <div class="form-group">
              <label>Rango de Fechas</label>
              <select class="form-control" [(ngModel)]="config.dateRange">
                <option value="mes">Mes actual</option>
                <option value="q1">Primer Trimestre (Q1)</option>
                <option value="year">Año actual</option>
                <option value="custom">Personalizado...</option>
              </select>
            </div>
            <div class="form-group">
              <label>Agrupar por</label>
              <select class="form-control" [(ngModel)]="config.groupBy">
                <option value="depto">Departamento</option>
                <option value="estado">Estado del Documento</option>
                <option value="usuario">Usuario Solicitante</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Step 3: Format -->
        <div *ngIf="currentStep === 3" class="step-pane animation-slide-in">
          <h3>Formato de Salida</h3>
          <p class="text-muted">Elige cómo deseas visualizar la información.</p>

          <div class="options-grid mt-4">
            <div
              class="option-card"
              [class.selected]="config.format === 'bar'"
              (click)="config.format = 'bar'"
            >
              <span class="material-symbols-outlined">bar_chart</span>
              <h4>Gráfico de Barras</h4>
            </div>
            <div
              class="option-card"
              [class.selected]="config.format === 'pie'"
              (click)="config.format = 'pie'"
            >
              <span class="material-symbols-outlined">pie_chart</span>
              <h4>Gráfico Circular</h4>
            </div>
            <div
              class="option-card"
              [class.selected]="config.format === 'table'"
              (click)="config.format = 'table'"
            >
              <span class="material-symbols-outlined">table_view</span>
              <h4>Solo Tabla</h4>
            </div>
          </div>
        </div>
      </div>

      <!-- Stepper Footer -->
      <div class="stepper-footer">
        <button class="btn btn-secondary" [disabled]="currentStep === 1" (click)="prevStep()">
          Atrás
        </button>

        <button class="btn btn-primary" *ngIf="currentStep < 3" (click)="nextStep()">
          Siguiente
        </button>
        <button class="btn btn-success" *ngIf="currentStep === 3" (click)="generate.emit(config)">
          <span class="material-symbols-outlined">bolt</span> Generar Reporte
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .report-builder {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        max-width: 800px;
        margin: 0 auto;
      }

      .stepper-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 2rem;
      }

      .step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        position: relative;
        z-index: 2;

        .step-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          border: 2px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: var(--text-muted);
          transition: all 0.3s;
        }

        .step-label {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 500;
          transition: all 0.3s;
        }

        &.active {
          .step-circle {
            border-color: var(--primary);
            color: var(--primary);
            box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
          }
          .step-label {
            color: var(--primary);
          }
        }

        &.completed {
          .step-circle {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
          }
        }
      }

      .step-line {
        flex: 1;
        height: 2px;
        background: var(--border-color);
        margin: 0 -20px;
        z-index: 1;
        position: relative;
        top: -10px;
        transition: background 0.3s;
        &.active {
          background: var(--primary);
        }
      }

      .stepper-content {
        padding: 2rem;
        min-height: 350px;
        display: flex;
        flex-direction: column;
      }

      .step-pane {
        h3 {
          margin: 0;
          color: var(--text-primary);
          font-size: 1.25rem;
        }
        .text-muted {
          margin-top: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
      }

      .options-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
      }

      .option-card {
        border: 2px solid var(--border-color);
        border-radius: var(--border-radius-md);
        padding: 2rem 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        cursor: pointer;
        transition: all 0.2s;
        background: var(--bg-tertiary);

        span {
          font-size: 3rem;
          color: var(--text-muted);
          transition: all 0.2s;
        }
        h4 {
          margin: 0;
          font-size: 1rem;
          color: var(--text-secondary);
        }

        &:hover {
          border-color: rgba(99, 102, 241, 0.5);
          transform: translateY(-2px);
        }
        &.selected {
          border-color: var(--primary);
          background: var(--primary-glow);
          span,
          h4 {
            color: var(--primary);
          }
        }
      }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
      }

      .stepper-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 1rem;
      }

      .btn-success {
        background: var(--success);
        color: white;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        &:hover {
          background: #16a34a;
          transform: translateY(-2px);
        }
      }

      .mt-4 {
        margin-top: 2rem;
      }
      .animation-slide-in {
        animation: slideIn 0.3s ease-out forwards;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `,
  ],
})
export class ReportBuilderComponent {
  @Output() generate = new EventEmitter<any>();

  currentStep = 1;
  config = {
    module: 'viaticos',
    dateRange: 'mes',
    groupBy: 'depto',
    format: 'bar',
  };

  setStep(step: number) {
    if (step <= this.currentStep || this.isValid(step - 1)) {
      this.currentStep = step;
    }
  }

  nextStep() {
    if (this.currentStep < 3 && this.isValid(this.currentStep)) {
      this.currentStep++;
    }
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  isValid(step: number): boolean {
    if (step === 1) return !!this.config.module;
    if (step === 2) return !!this.config.dateRange && !!this.config.groupBy;
    return true;
  }
}
