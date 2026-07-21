import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar glass-panel">
      <div class="brand">
        <span class="material-symbols-outlined logo-icon">domain_verification</span>
        <div class="brand-copy">
          <h1 class="logo-text">EASYDOC</h1>
          <span class="logo-subtitle">Direccion de Carrera</span>
        </div>
      </div>

      <nav class="nav-menu" aria-label="Navegacion principal">
        <ul class="nav-list">
          <li *ngFor="let item of menuItems">
            <a
              *ngIf="canShowItem(item)"
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
              class="nav-link"
              [attr.title]="item.label"
            >
              <span class="material-symbols-outlined nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          </li>
        </ul>
      </nav>

      <div class="sidebar-footer" *ngIf="authService.currentUser()">
        <span class="material-symbols-outlined footer-icon">verified_user</span>
        <div>
          <span class="footer-role">Sesion segura</span>
          <small>Ambiente institucional</small>
        </div>
      </div>
    </aside>
  `,
  styles: [
    `
      .sidebar {
        width: 272px;
        height: 100vh;
        display: flex;
        flex-direction: column;
        border-radius: 0;
        border-right: var(--glass-border);
        border-left: none;
        border-top: none;
        border-bottom: none;
        background:
          linear-gradient(180deg, rgba(var(--accent-rgb), 0.08), transparent 24%),
          var(--bg-secondary);
        flex-shrink: 0;
        overflow-y: auto;
      }

      .brand {
        min-height: 78px;
        display: flex;
        align-items: center;
        padding: 0 1.35rem;
        gap: 0.85rem;
        border-bottom: 1px solid var(--border-color);
      }

      .logo-icon {
        width: 42px;
        height: 42px;
        border-radius: var(--border-radius-md);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        border: 1px solid rgba(var(--accent-rgb), 0.44);
        color: var(--paper);
        font-size: 1.7rem;
      }

      .brand-copy {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .logo-text {
        font-size: 1.42rem;
        font-weight: 850;
        letter-spacing: 0;
        margin: 0;
        color: var(--text-primary);
      }

      .logo-subtitle {
        color: var(--accent);
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      .nav-menu {
        flex: 1;
        padding: 1.25rem 0.75rem;
      }

      .nav-list {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .nav-link {
        display: flex;
        align-items: center;
        min-height: 44px;
        padding: 0.65rem 0.85rem;
        color: var(--text-secondary);
        border-radius: var(--border-radius-md);
        gap: 0.85rem;
        font-weight: 650;
        font-size: 0.88rem;
        transition: var(--transition-fast);
        border: 1px solid transparent;

        &:hover {
          background: rgba(var(--accent-rgb), 0.08);
          color: var(--text-primary);
          border-color: var(--border-color);
        }

        &.active {
          background:
            linear-gradient(90deg, rgba(var(--accent-rgb), 0.2), transparent),
            rgba(var(--primary-rgb), 0.24);
          color: var(--text-primary);
          border-color: rgba(var(--accent-rgb), 0.35);

          .nav-icon {
            color: var(--accent);
          }
        }
      }

      .nav-icon {
        font-size: 1.22rem;
      }

      .sidebar-footer {
        padding: 1.1rem 1.25rem;
        display: flex;
        align-items: center;
        gap: 0.7rem;
        border-top: 1px solid var(--border-color);
        color: var(--text-secondary);
        font-size: 0.8rem;
        font-weight: 700;
      }

      .sidebar-footer small {
        display: block;
        margin-top: 0.1rem;
        color: var(--text-muted);
        font-weight: 600;
      }

      .footer-icon {
        font-size: 1.3rem;
        color: var(--success);
      }

      @media (max-width: 1600px) {
        .sidebar {
          width: 82px;
        }

        .brand {
          justify-content: center;
          padding: 0;
        }

        .brand-copy,
        .nav-label,
        .sidebar-footer div {
          display: none;
        }

        .nav-menu {
          padding: 1rem 0.6rem;
        }

        .nav-link {
          justify-content: center;
          padding: 0.65rem;
        }

        .sidebar-footer {
          justify-content: center;
          padding: 1rem 0.5rem;
        }
      }

      @media (max-width: 720px) {
        .sidebar {
          width: 64px;
        }

        .logo-icon {
          width: 36px;
          height: 36px;
          font-size: 1.35rem;
        }

        .nav-menu {
          padding: 0.7rem 0.4rem;
        }
      }
    `,
  ],
})
export class SidebarComponent {
  authService = inject(AuthService);

  menuItems: MenuItem[] = [
    { icon: 'space_dashboard', label: 'Mesa de control', route: '/dashboard' },
    { icon: 'folder_managed', label: 'Expedientes', route: '/repository' },
    { icon: 'edit_document', label: 'Actas y anexos', route: '/editor' },
    { icon: 'policy', label: 'Politicas de negocio', route: '/policies' },
    { icon: 'account_tree', label: 'Mapa de tramites', route: '/uml-designer' },
    { icon: 'support_agent', label: 'Asistente EASY', route: '/agent' },
    { icon: 'monitoring', label: 'Riesgos IA', route: '/predictions' },
    { icon: 'query_stats', label: 'Reportes de gestion', route: '/reports' },
    { icon: 'shield_lock', label: 'Trazabilidad', route: '/audit', roles: ['admin'] },
    { icon: 'admin_panel_settings', label: 'Gobierno', route: '/admin', roles: ['admin'] },
  ];

  canShowItem(item: MenuItem): boolean {
    if (!item.roles) {
      return true;
    }
    return this.authService.hasRole(item.roles);
  }
}
