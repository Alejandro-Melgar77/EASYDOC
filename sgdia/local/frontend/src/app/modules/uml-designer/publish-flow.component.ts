import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-publish-flow',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop">
      <div class="modal-panel glass-card">
        <div class="modal-header">
          <h3>Publicar Diagrama</h3>
          <button class="icon-btn" (click)="close.emit()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="modal-body">
          <div class="stepper">
            <div class="step" [ngClass]="{ active: currentStep >= 1, completed: currentStep > 1 }">
              <div class="step-icon">1</div>
              <span class="step-label">Borrador</span>
            </div>
            <div class="step-line" [ngClass]="{ active: currentStep > 1 }"></div>
            <div class="step" [ngClass]="{ active: currentStep >= 2, completed: currentStep > 2 }">
              <div class="step-icon">2</div>
              <span class="step-label">Revisión</span>
            </div>
            <div class="step-line" [ngClass]="{ active: currentStep > 2 }"></div>
            <div class="step" [ngClass]="{ active: currentStep >= 3, completed: currentStep > 3 }">
              <div class="step-icon">3</div>
              <span class="step-label">Aprobación</span>
            </div>
            <div class="step-line" [ngClass]="{ active: currentStep > 3 }"></div>
            <div class="step" [ngClass]="{ active: currentStep >= 4 }">
              <div class="step-icon">4</div>
              <span class="step-label">Publicado</span>
            </div>
          </div>

          <div class="step-content">
            <div *ngIf="currentStep === 1">
              <h4>Confirmar Borrador</h4>
              <p>El diagrama actual será enviado a revisión. ¿Deseas añadir algún comentario?</p>
              <textarea
                class="form-control"
                rows="3"
                placeholder="Comentarios adicionales..."
              ></textarea>
            </div>

            <div *ngIf="currentStep === 2">
              <h4>En Revisión</h4>
              <p>Simulando aprobación de Supervisor...</p>
              <div class="loading-bar"></div>
            </div>

            <div *ngIf="currentStep === 3">
              <h4>Aprobación Final</h4>
              <p>El diagrama ha sido revisado. Listo para publicación oficial.</p>
            </div>

            <div *ngIf="currentStep === 4" class="success-state">
              <span class="material-symbols-outlined success-icon">check_circle</span>
              <h4>¡Diagrama Publicado!</h4>
              <p>La nueva versión ya está disponible en el repositorio.</p>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="close.emit()" *ngIf="currentStep !== 4">
            Cancelar
          </button>
          <button class="btn btn-primary" (click)="nextStep()" *ngIf="currentStep < 4">
            {{
              currentStep === 1 ? 'Enviar a Revisión' : currentStep === 3 ? 'Publicar' : 'Avanzar'
            }}
          </button>
          <button class="btn btn-primary" (click)="close.emit()" *ngIf="currentStep === 4">
            Terminar
          </button>
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
        width: 600px;
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

        h3 {
          margin: 0;
          font-size: 1.25rem;
        }
      }

      .modal-body {
        padding: 2rem 1.5rem;
      }

      .stepper {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 2.5rem;
      }

      .step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        opacity: 0.5;

        &.active {
          opacity: 1;
          .step-icon {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
          }
        }

        &.completed {
          .step-icon {
            background: var(--success);
            border-color: var(--success);
            color: white;
          }
        }
      }

      .step-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid var(--text-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        transition: all 0.3s;
      }

      .step-label {
        font-size: 0.85rem;
        font-weight: 500;
      }

      .step-line {
        flex: 1;
        height: 2px;
        background: var(--border-color);
        margin: 0 1rem;
        margin-bottom: 1.5rem;
        transition: background 0.3s;

        &.active {
          background: var(--primary);
        }
      }

      .step-content {
        min-height: 120px;

        h4 {
          margin-top: 0;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }
        p {
          color: var(--text-secondary);
          margin-bottom: 1rem;
        }
        textarea {
          width: 100%;
          resize: none;
        }
      }

      .loading-bar {
        height: 4px;
        background: var(--bg-tertiary);
        border-radius: 2px;
        overflow: hidden;
        position: relative;

        &::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 30%;
          background: var(--primary);
          animation: loading 1s infinite linear;
        }
      }

      .success-state {
        text-align: center;
        .success-icon {
          font-size: 4rem;
          color: var(--success);
          margin-bottom: 1rem;
        }
      }

      .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid var(--border-color);
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
      }

      @keyframes loading {
        0% {
          left: -30%;
        }
        100% {
          left: 100%;
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
export class PublishFlowComponent {
  @Output() close = new EventEmitter<void>();
  currentStep = 1;

  nextStep() {
    if (this.currentStep < 4) {
      if (this.currentStep === 1) {
        this.currentStep++;
        // Simulate auto-advance for demo
        setTimeout(() => {
          if (this.currentStep === 2) this.currentStep++;
        }, 1500);
      } else {
        this.currentStep++;
      }
    }
  }
}
