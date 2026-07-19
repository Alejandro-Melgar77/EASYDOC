import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: { [module: string]: { [action: string]: boolean } };
  isSystem?: boolean; // System roles cannot be deleted or customized
}

@Component({
  selector: 'app-role-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="role-manager-container">
      <!-- Sidebar de Roles -->
      <div class="roles-sidebar glass-panel">
        <div class="sidebar-header">
          <h3>Roles del Sistema</h3>
          <button
            class="btn btn-secondary btn-sm icon-only-btn"
            (click)="createNewRole()"
            title="Crear Rol"
          >
            <span class="material-symbols-outlined">add</span>
          </button>
        </div>
        <ul class="role-list">
          <li
            *ngFor="let role of roles()"
            [class.active]="selectedRole().id === role.id"
            (click)="selectRole(role)"
            class="role-item"
          >
            <div class="role-item-info">
              <span class="role-name">{{ role.name }}</span>
              <span class="role-desc">{{ role.description }}</span>
            </div>
            <span
              class="material-symbols-outlined system-lock"
              *ngIf="role.isSystem"
              title="Rol protegido"
              >lock</span
            >
            <button
              *ngIf="!role.isSystem"
              class="delete-role-btn"
              (click)="deleteRole(role, $event)"
              title="Eliminar Rol"
            >
              <span class="material-symbols-outlined">delete</span>
            </button>
          </li>
        </ul>
      </div>

      <!-- Matriz de Permisos -->
      <div class="permissions-panel glass-panel">
        <div class="panel-header">
          <div>
            <h3>
              Permisos: <span class="highlight">{{ selectedRole().name }}</span>
            </h3>
            <p class="desc">{{ selectedRole().description }}</p>
          </div>
          <span class="badge badge-warning" *ngIf="selectedRole().isSystem">
            Rol del Sistema (Solo Lectura)
          </span>
        </div>

        <div class="matrix-wrapper">
          <table class="permissions-matrix">
            <thead>
              <tr>
                <th>Módulo</th>
                <th *ngFor="let action of actions">{{ getActionLabel(action) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let module of modules">
                <td class="module-cell">
                  <span class="material-symbols-outlined cell-icon">{{
                    getModuleIcon(module)
                  }}</span>
                  <span>{{ getModuleLabel(module) }}</span>
                </td>
                <td *ngFor="let action of actions" class="checkbox-cell">
                  <label class="custom-checkbox">
                    <input
                      type="checkbox"
                      [checked]="hasPermission(module, action)"
                      (change)="togglePermission(module, action)"
                      [disabled]="selectedRole().isSystem"
                    />
                    <span class="checkmark"></span>
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="panel-footer" *ngIf="!selectedRole().isSystem">
          <button class="btn btn-primary" (click)="savePermissions()">
            <span class="material-symbols-outlined">save</span>
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .role-manager-container {
        display: grid;
        grid-template-columns: 300px 1fr;
        gap: 1.5rem;
        align-items: start;

        @media (max-width: 768px) {
          grid-template-columns: 1fr;
        }
      }

      .roles-sidebar {
        padding: 1.25rem 0;
        border-radius: var(--border-radius-lg);
      }

      .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 1.25rem 1rem 1.25rem;
        border-bottom: 1px solid var(--border-color);

        h3 {
          font-size: 0.95rem;
          margin: 0;
        }
      }

      .icon-only-btn {
        padding: 0.3rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .role-list {
        list-style: none;
        padding: 0.5rem 0;
      }

      .role-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1.25rem;
        cursor: pointer;
        border-left: 3px solid transparent;
        transition: var(--transition-fast);

        &:hover {
          background: var(--bg-tertiary);
        }

        &.active {
          background: var(--primary-glow);
          border-left-color: var(--primary);

          .role-name {
            color: var(--primary);
          }
        }
      }

      .role-item-info {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        flex: 1;
      }

      .role-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .role-desc {
        font-size: 0.75rem;
        color: var(--text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
      }

      .system-lock {
        font-size: 1.1rem;
        color: var(--warning);
      }

      .delete-role-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.25rem;
        border-radius: var(--border-radius-sm);
        transition: var(--transition-fast);

        &:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
        }
      }

      .permissions-panel {
        padding: 1.5rem;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 1rem;

        h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.1rem;
        }
        .highlight {
          color: var(--primary);
        }
        .desc {
          margin: 0;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
      }

      .matrix-wrapper {
        width: 100%;
        overflow-x: auto;
      }

      .permissions-matrix {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 0.875rem;

        th {
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.01);
          border-bottom: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-weight: 600;
          text-align: center;
        }

        th:first-child {
          text-align: left;
        }

        td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        tr:hover td {
          background: rgba(255, 255, 255, 0.005);
        }
      }

      .module-cell {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 500;
        color: var(--text-primary);
      }

      .cell-icon {
        font-size: 1.25rem;
        color: var(--text-secondary);
      }

      .checkbox-cell {
        text-align: center;
      }

      // Custom design checkbox for premium feeling
      .custom-checkbox {
        display: inline-block;
        position: relative;
        width: 20px;
        height: 20px;
        cursor: pointer;

        input {
          position: absolute;
          opacity: 0;
          cursor: pointer;
          height: 0;
          width: 0;

          &:checked ~ .checkmark {
            background-color: var(--primary);
            border-color: var(--primary);

            &::after {
              display: block;
            }
          }

          &:disabled ~ .checkmark {
            opacity: 0.4;
            cursor: not-allowed;
          }
        }

        .checkmark {
          position: absolute;
          top: 0;
          left: 0;
          height: 20px;
          width: 20px;
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          transition: var(--transition-fast);

          &::after {
            content: '';
            position: absolute;
            display: none;
            left: 6px;
            top: 3px;
            width: 5px;
            height: 10px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
          }
        }
      }

      .panel-footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 1.5rem;
        border-top: 1px solid var(--border-color);
        padding-top: 1rem;
      }
    `,
  ],
})
export class RoleManagerComponent implements OnInit {
  roles = signal<Role[]>([]);
  selectedRole = signal<Role>({} as Role);

  modules = ['repository', 'editor', 'uml_designer', 'agent_ia', 'reports', 'audit'];
  actions = ['read', 'write', 'delete', 'approve'];

  ngOnInit(): void {
    this.loadMockRoles();
  }

  loadMockRoles(): void {
    const rolesData: Role[] = [
      {
        id: '1',
        name: 'Administrador',
        description: 'Control total de la plataforma y configuraciones globales.',
        isSystem: true,
        permissions: this.createFullPermissions(true),
      },
      {
        id: '2',
        name: 'Usuario Estándar',
        description: 'Acceso de consulta y edición de documentos propios.',
        isSystem: false,
        permissions: {
          repository: { read: true, write: true, delete: false, approve: false },
          editor: { read: true, write: true, delete: false, approve: false },
          uml_designer: { read: true, write: false, delete: false, approve: false },
          agent_ia: { read: true, write: true, delete: false, approve: false },
          reports: { read: true, write: false, delete: false, approve: false },
          audit: { read: false, write: false, delete: false, approve: false },
        },
      },
      {
        id: '3',
        name: 'Aprobador',
        description: 'Responsable de validar políticas y flujos documentales.',
        isSystem: false,
        permissions: {
          repository: { read: true, write: true, delete: false, approve: true },
          editor: { read: true, write: true, delete: false, approve: true },
          uml_designer: { read: true, write: true, delete: false, approve: true },
          agent_ia: { read: true, write: true, delete: false, approve: false },
          reports: { read: true, write: true, delete: false, approve: false },
          audit: { read: true, write: false, delete: false, approve: false },
        },
      },
    ];

    this.roles.set(rolesData);
    this.selectedRole.set(rolesData[0]); // Default to admin
  }

  createFullPermissions(value: boolean) {
    const permissions: any = {};
    this.modules.forEach((mod) => {
      permissions[mod] = {};
      this.actions.forEach((act) => {
        permissions[mod][act] = value;
      });
    });
    return permissions;
  }

  selectRole(role: Role): void {
    this.selectedRole.set({ ...role });
  }

  createNewRole(): void {
    const newId = Math.random().toString(36).substr(2, 9);
    const newRole: Role = {
      id: newId,
      name: 'Nuevo Rol Customizado',
      description: 'Rol personalizado creado por el administrador.',
      isSystem: false,
      permissions: this.createFullPermissions(false),
    };
    this.roles.set([...this.roles(), newRole]);
    this.selectedRole.set(newRole);
  }

  deleteRole(role: Role, event: Event): void {
    event.stopPropagation();
    if (role.isSystem) return;

    if (confirm(`¿Estás seguro de que deseas eliminar el rol "${role.name}"?`)) {
      const updated = this.roles().filter((r) => r.id !== role.id);
      this.roles.set(updated);
      this.selectedRole.set(updated[0]);
    }
  }

  hasPermission(module: string, action: string): boolean {
    const role = this.selectedRole();
    return !!role.permissions?.[module]?.[action];
  }

  togglePermission(module: string, action: string): void {
    const role = this.selectedRole();
    if (role.isSystem) return;

    const updatedPermissions = { ...role.permissions };
    if (!updatedPermissions[module]) {
      updatedPermissions[module] = {};
    }
    updatedPermissions[module][action] = !updatedPermissions[module][action];

    this.selectedRole.set({
      ...role,
      permissions: updatedPermissions,
    });
  }

  savePermissions(): void {
    const current = this.selectedRole();
    const updated = this.roles().map((r) => {
      if (r.id === current.id) {
        return current;
      }
      return r;
    });
    this.roles.set(updated);
    alert('Permisos del rol actualizados correctamente.');
  }

  // Label Formatter Helpers
  getModuleLabel(module: string): string {
    switch (module) {
      case 'repository':
        return 'Repositorio Documental';
      case 'editor':
        return 'Co-Edición Online';
      case 'uml_designer':
        return 'Diagramador de Políticas';
      case 'agent_ia':
        return 'Agente de IA';
      case 'reports':
        return 'Generador de Reportes';
      case 'audit':
        return 'Bitácora de Auditoría';
      default:
        return module;
    }
  }

  getModuleIcon(module: string): string {
    switch (module) {
      case 'repository':
        return 'folder_open';
      case 'editor':
        return 'edit_document';
      case 'uml_designer':
        return 'schema';
      case 'agent_ia':
        return 'chat';
      case 'reports':
        return 'insert_chart';
      case 'audit':
        return 'shield_heart';
      default:
        return 'help';
    }
  }

  getActionLabel(action: string): string {
    switch (action) {
      case 'read':
        return 'Lectura';
      case 'write':
        return 'Escritura';
      case 'delete':
        return 'Eliminar';
      case 'approve':
        return 'Aprobar';
      default:
        return action;
    }
  }
}
