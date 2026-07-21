import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-wrapper">
      <div class="login-card glass-panel fade-in">
        <!-- Logo / Brand -->
        <div class="brand">
          <span class="material-symbols-outlined logo-icon text-gradient">domain_verification</span>
          <h1 class="logo-text text-gradient">EASYDOC</h1>
          <p class="subtitle">Gestion documental academica</p>
        </div>

        <!-- Error Alert -->
        <div class="error-alert" *ngIf="errorMessage()">
          <span class="material-symbols-outlined">error</span>
          <span>{{ errorMessage() }}</span>
        </div>

        <!-- Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="email">Correo institucional</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">mail</span>
              <input
                id="email"
                type="email"
                formControlName="email"
                placeholder="direccion@easydoc.edu"
                class="form-control"
                [class.invalid]="isFieldInvalid('email')"
              />
            </div>
            <span class="error-text" *ngIf="isFieldInvalid('email')">
              Ingresa un correo valido
            </span>
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <div class="input-wrapper">
              <span class="material-symbols-outlined input-icon">lock</span>
              <input
                id="password"
                type="password"
                formControlName="password"
                placeholder="••••••••"
                class="form-control"
                [class.invalid]="isFieldInvalid('password')"
              />
            </div>
            <span class="error-text" *ngIf="isFieldInvalid('password')">
              La contrasena debe tener al menos 6 caracteres
            </span>
          </div>

          <button
            type="submit"
            [disabled]="loginForm.invalid || isLoading()"
            class="btn btn-primary submit-btn"
          >
            <span class="material-symbols-outlined spinner" *ngIf="isLoading()">sync</span>
            <span>{{ isLoading() ? 'Iniciando sesion...' : 'Iniciar sesion' }}</span>
          </button>
        </form>
        <a class="guest-access" routerLink="/guest/guide">
          <span class="material-symbols-outlined">public</span>
          Soy estudiante o visitante
        </a>
      </div>
    </div>
  `,
  styles: [
    `
      .login-wrapper {
        width: 100vw;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background:
          linear-gradient(135deg, rgba(var(--primary-rgb), 0.28), transparent 42%),
          linear-gradient(180deg, rgba(var(--accent-rgb), 0.08), transparent 55%), var(--bg-primary);
        overflow: hidden;
      }

      .login-card {
        width: 440px;
        padding: 3rem 2.5rem;
        border-radius: var(--border-radius-lg);
        animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .brand {
        text-align: center;
        margin-bottom: 2.5rem;

        .logo-icon {
          font-size: 3.5rem;
          margin-bottom: 0.5rem;
        }

        .logo-text {
          font-size: 2.25rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          margin: 0;
        }

        .subtitle {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
          font-weight: 500;
        }
      }

      .error-alert {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
        color: var(--danger);
        padding: 0.75rem 1rem;
        border-radius: var(--border-radius-md);
        margin-bottom: 1.5rem;
        font-size: 0.85rem;
        font-weight: 500;
      }

      .login-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      }

      .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }

      .input-icon {
        position: absolute;
        left: 1rem;
        color: var(--text-muted);
        font-size: 1.25rem;
      }

      .form-control {
        width: 100%;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        padding: 0.75rem 1rem 0.75rem 2.75rem;
        color: var(--text-primary);
        font-family: inherit;
        font-size: 0.9rem;
        transition: var(--transition-fast);

        &:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px var(--primary-glow);
          outline: none;
        }

        &.invalid {
          border-color: var(--danger);
        }
      }

      .error-text {
        color: var(--danger);
        font-size: 0.75rem;
        margin-top: 0.25rem;
      }

      .submit-btn {
        width: 100%;
        padding: 0.85rem;
        font-size: 0.95rem;
        margin-top: 1rem;
      }

      .spinner {
        animation: spin 1.5s linear infinite;
      }

      .guest-access {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.45rem;
        margin-top: 1rem;
        color: var(--secondary);
        font-size: 0.84rem;
        font-weight: 750;
        text-decoration: none;

        .material-symbols-outlined {
          font-size: 1rem;
        }
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const credentials = this.loginForm.value;

    // Simulate login request (if server is not running yet, we use a timeout with standard mock data)
    this.authService.login(credentials).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.error?.error?.message ?? 'No fue posible iniciar sesion. Verifica tus credenciales.',
        );
      },
    });
  }
}
