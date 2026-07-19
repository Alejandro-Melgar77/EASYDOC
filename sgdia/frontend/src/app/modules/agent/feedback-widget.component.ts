import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-feedback-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="feedback-container">
      <div class="feedback-actions" *ngIf="status === 'idle'">
        <button class="feedback-btn" (click)="setStatus('positive')" title="Respuesta útil">
          <span class="material-symbols-outlined">thumb_up</span>
        </button>
        <button class="feedback-btn" (click)="setStatus('negative')" title="Respuesta incorrecta">
          <span class="material-symbols-outlined">thumb_down</span>
        </button>
      </div>

      <div class="feedback-thanks" *ngIf="status === 'positive'">
        <span class="material-symbols-outlined text-success">check_circle</span>
        ¡Gracias por tu valoración!
      </div>

      <div class="feedback-form" *ngIf="status === 'negative'">
        <input
          type="text"
          class="form-control form-control-sm"
          placeholder="¿En qué podemos mejorar?"
        />
        <button class="btn btn-primary btn-sm" (click)="setStatus('thanks')">Enviar</button>
      </div>

      <div class="feedback-thanks" *ngIf="status === 'thanks'">
        <span class="material-symbols-outlined text-success">check_circle</span>
        Feedback recibido.
      </div>
    </div>
  `,
  styles: [
    `
      .feedback-container {
        display: flex;
        align-items: center;
        margin-top: 0.5rem;
        gap: 0.5rem;
      }

      .feedback-actions {
        display: flex;
        gap: 0.25rem;
      }

      .feedback-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;

        &:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        span {
          font-size: 1.1rem;
        }
      }

      .feedback-thanks {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
        animation: fadeIn 0.3s;

        .text-success {
          color: var(--success);
          font-size: 1.1rem;
        }
      }

      .feedback-form {
        display: flex;
        gap: 0.5rem;
        animation: fadeIn 0.3s;

        .form-control-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.8rem;
          height: 28px;
          min-width: 200px;
        }

        .btn-sm {
          padding: 0.25rem 0.75rem;
          font-size: 0.8rem;
          height: 28px;
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class FeedbackWidgetComponent {
  status: 'idle' | 'positive' | 'negative' | 'thanks' = 'idle';

  setStatus(newStatus: 'idle' | 'positive' | 'negative' | 'thanks') {
    this.status = newStatus;
  }
}
