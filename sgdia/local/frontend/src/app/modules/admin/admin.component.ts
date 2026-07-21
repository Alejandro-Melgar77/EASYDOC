import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserListComponent } from './users/user-list.component';
import { RoleManagerComponent } from './roles/role-manager.component';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, UserListComponent, RoleManagerComponent],
  template: `
    <div class="admin-panel-wrapper">
      <!-- Section Header -->
      <header class="section-header">
        <h1 class="welcome-title">Panel de Administración</h1>
        <p class="welcome-subtitle">
          Configuración global de usuarios, roles de seguridad y matriz de accesos.
        </p>
      </header>

      <!-- Tabs Navigation -->
      <div class="tabs-navigation glass-panel">
        <button
          (click)="setActiveTab('users')"
          [class.active]="activeTab() === 'users'"
          class="tab-btn"
        >
          <span class="material-symbols-outlined">manage_accounts</span>
          <span>Usuarios</span>
        </button>
        <button
          (click)="setActiveTab('roles')"
          [class.active]="activeTab() === 'roles'"
          class="tab-btn"
        >
          <span class="material-symbols-outlined">shield_lock</span>
          <span>Roles y Permisos</span>
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="tab-content">
        <app-user-list *ngIf="activeTab() === 'users'"></app-user-list>
        <app-role-manager *ngIf="activeTab() === 'roles'"></app-role-manager>
      </div>
    </div>
  `,
  styles: [
    `
      .admin-panel-wrapper {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .section-header {
        .welcome-title {
          font-size: 1.75rem;
          font-weight: 800;
        }
        .welcome-subtitle {
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }
      }

      .tabs-navigation {
        display: flex;
        padding: 0.5rem;
        gap: 0.5rem;
        border-radius: var(--border-radius-md);
        align-self: flex-start;
        margin-bottom: 0.5rem;
      }

      .tab-btn {
        background: transparent;
        border: none;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 1.25rem;
        color: var(--text-secondary);
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        border-radius: var(--border-radius-sm);
        transition: var(--transition-fast);
        font-family: inherit;

        &:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        &.active {
          background: var(--primary);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.25);
        }
      }

      .tab-content {
        animation: fadeIn 0.3s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class AdminComponent {
  activeTab = signal<'users' | 'roles'>('users');

  setActiveTab(tab: 'users' | 'roles'): void {
    this.activeTab.set(tab);
  }
}
