import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class.fullscreen]="fullscreen" class="loader-container">
      <div class="spinner">
        <div class="double-bounce1"></div>
        <div class="double-bounce2"></div>
      </div>
      <p class="loading-text" *ngIf="message">{{ message }}</p>
    </div>
  `,
  styles: [
    `
      .loader-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        gap: 1rem;
      }

      .fullscreen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: var(--bg-glass);
        backdrop-filter: var(--glass-blur);
        z-index: 9999;
      }

      .spinner {
        width: 50px;
        height: 50px;
        position: relative;
      }

      .double-bounce1,
      .double-bounce2 {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background-color: var(--primary);
        opacity: 0.6;
        position: absolute;
        top: 0;
        left: 0;
        animation: bounce 2s infinite ease-in-out;
      }

      .double-bounce2 {
        animation-delay: -1s;
        background-color: var(--secondary);
      }

      .loading-text {
        font-size: 0.875rem;
        color: var(--text-secondary);
        font-weight: 500;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        animation: pulse 1.5s infinite ease-in-out;
      }

      @keyframes bounce {
        0%,
        100% {
          transform: scale(0);
        }
        50% {
          transform: scale(1);
        }
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 0.6;
        }
        50% {
          opacity: 1;
        }
      }
    `,
  ],
})
export class LoadingComponent {
  @Input() fullscreen = false;
  @Input() message = 'Cargando...';
}
