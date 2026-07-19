import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="header glass-panel">
      <div class="search-container">
        <span class="material-symbols-outlined search-icon">travel_explore</span>
        <input
          type="text"
          placeholder="Buscar estudiante, tramite, politica o expediente..."
          class="search-input"
        />
      </div>

      <div class="command-status" aria-label="Estado institucional">
        <span class="material-symbols-outlined">task_alt</span>
        Atencion academica abierta
      </div>

      <div class="header-actions">
        <button (click)="toggleTheme()" class="icon-btn" title="Cambiar tema">
          <span class="material-symbols-outlined">{{
            isDarkMode() ? 'light_mode' : 'dark_mode'
          }}</span>
        </button>

        <div class="notification-wrapper">
          <button (click)="toggleNotifications()" class="icon-btn" title="Notificaciones">
            <span class="material-symbols-outlined">notifications</span>
            <span class="badge-dot" *ngIf="hasNotifications()"></span>
          </button>

          <div class="notifications-dropdown glass-panel" *ngIf="showNotifications()">
            <div class="dropdown-header">
              <h3>Alertas EASYDOC</h3>
              <button (click)="clearNotifications()" class="clear-btn">Limpiar</button>
            </div>
            <div class="dropdown-content">
              <div class="notification-item" *ngFor="let notification of notifications()">
                <div class="notification-icon" [ngClass]="notification.type">
                  <span class="material-symbols-outlined">{{ notification.icon }}</span>
                </div>
                <div class="notification-text">
                  <p class="notification-message">{{ notification.message }}</p>
                  <span class="notification-time">{{ notification.time }}</span>
                </div>
              </div>
              <div class="empty-state" *ngIf="notifications().length === 0">
                <span class="material-symbols-outlined empty-icon">notifications_off</span>
                <p>No tienes nuevas alertas</p>
              </div>
            </div>
          </div>
        </div>

        <div class="user-profile" *ngIf="authService.currentUser() as user">
          <div class="profile-info">
            <span class="user-name">{{ user.name }}</span>
            <span class="user-role badge badge-info">{{ getRoleLabel(user.role) }}</span>
          </div>
          <div class="avatar-container" (click)="toggleUserMenu()">
            <img
              src="https://ui-avatars.com/api/?name={{
                user.name
              }}&background=17446B&color=F6F1E8&bold=true"
              alt="Avatar"
              class="avatar"
            />

            <div class="profile-dropdown glass-panel" *ngIf="showUserMenu()">
              <div class="dropdown-user-info">
                <p class="email">{{ user.email }}</p>
              </div>
              <hr class="divider" />
              <button (click)="logout()" class="dropdown-btn logout-btn">
                <span class="material-symbols-outlined">logout</span>
                Cerrar sesion
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      .header {
        min-height: 70px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0 1.5rem;
        border-radius: 0;
        border-bottom: var(--glass-border);
        border-left: none;
        border-right: none;
        border-top: none;
        z-index: 100;
        position: sticky;
        top: 0;
        background: rgba(11, 23, 40, 0.88);
      }

      .search-container {
        display: flex;
        align-items: center;
        background: rgba(246, 241, 232, 0.04);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        padding: 0.55rem 1rem;
        width: min(430px, 42vw);
        gap: 0.6rem;
        transition: var(--transition-fast);

        &:focus-within {
          border-color: rgba(var(--accent-rgb), 0.62);
          box-shadow: 0 0 0 2px var(--primary-glow);
          width: min(520px, 48vw);
        }
      }

      .search-icon {
        color: var(--accent);
        font-size: 1.25rem;
      }

      .search-input {
        background: transparent;
        border: none;
        outline: none;
        color: var(--text-primary);
        width: 100%;
        font-family: inherit;
        font-size: 0.875rem;

        &::placeholder {
          color: var(--text-muted);
        }
      }

      .command-status {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.45rem 0.7rem;
        border-radius: var(--border-radius-md);
        background: rgba(79, 163, 107, 0.12);
        color: var(--success);
        border: 1px solid rgba(79, 163, 107, 0.2);
        font-size: 0.78rem;
        font-weight: 800;
        white-space: nowrap;
      }

      .command-status span {
        font-size: 1rem;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.85rem;
      }

      .icon-btn {
        background: rgba(246, 241, 232, 0.04);
        border: 1px solid var(--border-color);
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: var(--border-radius-md);
        transition: var(--transition-fast);
        position: relative;

        &:hover {
          background: rgba(var(--accent-rgb), 0.1);
          color: var(--text-primary);
          border-color: var(--border-hover);
        }
      }

      .badge-dot {
        position: absolute;
        top: 5px;
        right: 5px;
        width: 8px;
        height: 8px;
        background-color: var(--danger);
        border-radius: 50%;
        border: 2px solid var(--bg-secondary);
      }

      .notification-wrapper {
        position: relative;
      }

      .notifications-dropdown {
        position: absolute;
        top: 48px;
        right: 0;
        width: 372px;
        max-height: 420px;
        overflow-y: auto;
        border-radius: var(--border-radius-lg);
        padding: 0;
        z-index: 1000;
        animation: fadeIn 0.2s ease-out;
      }

      .dropdown-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: var(--border-color) 1px solid;

        h3 {
          font-size: 0.95rem;
          margin: 0;
        }
      }

      .clear-btn {
        background: transparent;
        border: none;
        color: var(--accent);
        font-size: 0.75rem;
        font-weight: 800;
        cursor: pointer;
      }

      .dropdown-content {
        padding: 0.5rem 0;
      }

      .notification-item {
        display: flex;
        gap: 0.85rem;
        padding: 0.75rem 1rem;
        cursor: pointer;
        transition: var(--transition-fast);

        &:hover {
          background: rgba(var(--accent-rgb), 0.08);
        }
      }

      .notification-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: var(--border-radius-md);
        flex-shrink: 0;

        &.info {
          background: rgba(var(--secondary-rgb), 0.16);
          color: var(--secondary);
        }
        &.warning {
          background: rgba(214, 162, 61, 0.16);
          color: var(--warning);
        }
        &.success {
          background: rgba(79, 163, 107, 0.16);
          color: var(--success);
        }
      }

      .notification-message {
        font-size: 0.85rem;
        color: var(--text-primary);
        margin: 0;
        line-height: 1.35;
      }

      .notification-time {
        font-size: 0.75rem;
        color: var(--text-muted);
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2rem;
        color: var(--text-muted);
        gap: 0.5rem;
      }

      .user-profile {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .profile-info {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .user-name {
        font-size: 0.875rem;
        font-weight: 750;
        color: var(--text-primary);
      }

      .user-role {
        font-size: 0.7rem;
        padding: 0.14rem 0.5rem;
      }

      .avatar-container {
        position: relative;
        cursor: pointer;
      }

      .avatar {
        width: 38px;
        height: 38px;
        border-radius: var(--border-radius-md);
        border: 2px solid rgba(var(--accent-rgb), 0.36);
        transition: var(--transition-fast);

        &:hover {
          border-color: var(--accent);
        }
      }

      .profile-dropdown {
        position: absolute;
        top: 48px;
        right: 0;
        width: 220px;
        border-radius: var(--border-radius-md);
        padding: 0.5rem 0;
        z-index: 1000;
        animation: fadeIn 0.2s ease-out;
      }

      .dropdown-user-info {
        padding: 0.5rem 1rem;

        .email {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .divider {
        border: 0;
        height: 1px;
        background: var(--border-color);
        margin: 0.5rem 0;
      }

      .dropdown-btn {
        width: 100%;
        background: transparent;
        border: none;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 1rem;
        font-size: 0.85rem;
        color: var(--text-primary);
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        transition: var(--transition-fast);

        &:hover {
          background: var(--bg-tertiary);
        }
      }

      .logout-btn {
        color: var(--danger);
      }

      @media (max-width: 980px) {
        .command-status,
        .profile-info {
          display: none;
        }

        .search-container {
          width: min(360px, 50vw);
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
export class HeaderComponent {
  authService = inject(AuthService);

  isDarkMode = signal(true);
  showNotifications = signal(false);
  showUserMenu = signal(false);
  hasNotifications = signal(true);

  notifications = signal([
    {
      id: 1,
      type: 'info',
      icon: 'assignment',
      message: 'Solicitud de Casos Especiales ingreso a Secretaria Academica',
      time: 'Hace 5 minutos',
    },
    {
      id: 2,
      type: 'warning',
      icon: 'priority_high',
      message: 'Riesgo de cuello de botella en Revision de requisitos',
      time: 'Hace 15 minutos',
    },
    {
      id: 3,
      type: 'success',
      icon: 'task_alt',
      message: 'Politica de Certificado de Notas publicada para estudiantes',
      time: 'Hace 1 hora',
    },
  ]);

  toggleTheme(): void {
    this.isDarkMode.set(!this.isDarkMode());
    const htmlElement = document.documentElement;
    if (this.isDarkMode()) {
      htmlElement.setAttribute('data-theme', 'dark');
      htmlElement.style.colorScheme = 'dark';
    } else {
      htmlElement.setAttribute('data-theme', 'light');
      htmlElement.style.colorScheme = 'light';
    }
  }

  toggleNotifications(): void {
    this.showNotifications.set(!this.showNotifications());
    this.showUserMenu.set(false);
  }

  toggleUserMenu(): void {
    this.showUserMenu.set(!this.showUserMenu());
    this.showNotifications.set(false);
  }

  clearNotifications(): void {
    this.notifications.set([]);
    this.hasNotifications.set(false);
  }

  logout(): void {
    if (confirm('Deseas cerrar la sesion en EASYDOC?')) {
      this.authService.logout();
    }
  }

  getRoleLabel(role: string): string {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Director';
      case 'user':
        return 'Funcionario';
      case 'approver':
        return 'Secretaria';
      default:
        return role;
    }
  }
}
