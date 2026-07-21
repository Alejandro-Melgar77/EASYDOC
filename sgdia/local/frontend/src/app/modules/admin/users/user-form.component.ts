import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal-content glass-panel" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ user ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
          <button class="close-btn" (click)="onClose()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <form [formGroup]="userForm" (ngSubmit)="onSubmit()" class="user-form">
          <div class="form-group">
            <label for="name">Nombre Completo</label>
            <input
              id="name"
              type="text"
              formControlName="name"
              placeholder="Ej. Sofia Vargas"
              class="form-control"
              [class.invalid]="isFieldInvalid('name')"
            />
            <span class="error-text" *ngIf="isFieldInvalid('name')">El nombre es requerido</span>
          </div>

          <div class="form-group">
            <label for="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="sofia.vargas@easydoc.edu"
              class="form-control"
              [class.invalid]="isFieldInvalid('email')"
            />
            <span class="error-text" *ngIf="isFieldInvalid('email')"
              >Por favor ingrese un correo válido</span
            >
          </div>

          <div class="row">
            <div class="form-group col">
              <label for="role">Rol de Acceso</label>
              <select id="role" formControlName="role" class="form-control">
                <option value="admin">Administrador</option>
                <option value="user">Usuario</option>
                <option value="approver">Aprobador</option>
              </select>
            </div>

            <div class="form-group col">
              <label for="status">Estado</label>
              <select id="status" formControlName="status" class="form-control">
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <div class="form-group" *ngIf="!user">
            <label for="password">Contraseña Temporal</label>
            <input
              id="password"
              type="text"
              formControlName="password"
              class="form-control"
              placeholder="Generado automáticamente o escribe uno"
              [class.invalid]="isFieldInvalid('password')"
            />
            <button
              type="button"
              class="btn btn-secondary btn-sm generate-pass-btn"
              (click)="generateTempPassword()"
            >
              Generar Contraseña
            </button>
            <span class="error-text" *ngIf="isFieldInvalid('password')"
              >La contraseña temporal debe tener al menos 6 caracteres</span
            >
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="onClose()">Cancelar</button>
            <button type="submit" [disabled]="userForm.invalid" class="btn btn-primary">
              {{ user ? 'Actualizar' : 'Crear Usuario' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease-out;
      }

      .modal-content {
        width: 500px;
        padding: 2rem;
        border-radius: var(--border-radius-lg);
        background: var(--bg-card);
        border: var(--glass-border);
        box-shadow: var(--glass-shadow);
        animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;

        h2 {
          font-size: 1.25rem;
          margin: 0;
        }
      }

      .close-btn {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.25rem;
        border-radius: 50%;
        transition: var(--transition-fast);

        &:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
      }

      .user-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        position: relative;

        label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      }

      .form-control {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        padding: 0.6rem 0.8rem;
        color: var(--text-primary);
        font-family: inherit;
        font-size: 0.875rem;
        transition: var(--transition-fast);

        &:focus {
          border-color: var(--primary);
          outline: none;
          box-shadow: 0 0 0 2px var(--primary-glow);
        }

        &.invalid {
          border-color: var(--danger);
        }
      }

      .row {
        display: flex;
        gap: 1rem;
      }

      .col {
        flex: 1;
      }

      .generate-pass-btn {
        align-self: flex-start;
        margin-top: 0.25rem;
        padding: 0.3rem 0.6rem;
        font-size: 0.75rem;
      }

      .error-text {
        color: var(--danger);
        font-size: 0.75rem;
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.5rem;
        border-top: 1px solid var(--border-color);
        padding-top: 1rem;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes scaleUp {
        from {
          transform: scale(0.9);
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
export class UserFormComponent implements OnInit {
  private fb = inject(FormBuilder);

  @Input() user: User | null = null;
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  userForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    role: ['user', [Validators.required]],
    status: ['active', [Validators.required]],
    password: [''],
  });

  ngOnInit(): void {
    if (this.user) {
      this.userForm.patchValue({
        name: this.user.name,
        email: this.user.email,
        role: this.user.role,
        status: this.user.status,
      });
      this.userForm.get('password')?.clearValidators();
    } else {
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.generateTempPassword();
    }
    this.userForm.get('password')?.updateValueAndValidity();
  }

  isFieldInvalid(field: string): boolean {
    const control = this.userForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  generateTempPassword(): void {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.userForm.patchValue({ password: pass });
  }

  onSubmit(): void {
    if (this.userForm.invalid) return;
    this.save.emit(this.userForm.value);
  }

  onClose(): void {
    this.close.emit();
  }
}
