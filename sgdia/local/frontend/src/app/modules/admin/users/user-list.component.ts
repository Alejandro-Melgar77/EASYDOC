import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../../core/models/user.model';
import { UserFormComponent } from './user-form.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, UserFormComponent],
  template: `
    <div class="user-list-container">
      <!-- Controls Header -->
      <div class="controls-header">
        <div class="search-filters">
          <div class="search-input-wrapper">
            <span class="material-symbols-outlined search-icon">search</span>
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              [(ngModel)]="searchQuery"
              class="form-control filter-input"
            />
          </div>

          <select [(ngModel)]="roleFilter" class="form-control select-filter">
            <option value="all">Todos los Roles</option>
            <option value="admin">Administrador</option>
            <option value="user">Usuario</option>
            <option value="approver">Aprobador</option>
          </select>

          <select [(ngModel)]="statusFilter" class="form-control select-filter">
            <option value="all">Todos los Estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        <button class="btn btn-primary" (click)="openCreateModal()">
          <span class="material-symbols-outlined">person_add</span>
          Nuevo Usuario
        </button>
      </div>

      <!-- Users Table -->
      <div class="table-wrapper glass-panel">
        <table class="users-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo Electrónico</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of filteredUsers()">
              <td class="name-cell">
                <img
                  src="https://ui-avatars.com/api/?name={{
                    user.name
                  }}&background=6366F1&color=fff&bold=true"
                  alt="Avatar"
                  class="avatar"
                />
                <span>{{ user.name }}</span>
              </td>
              <td>{{ user.email }}</td>
              <td>
                <span class="badge badge-info">{{ getRoleLabel(user.role) }}</span>
              </td>
              <td>
                <span
                  class="badge"
                  [ngClass]="user.status === 'active' ? 'badge-success' : 'badge-danger'"
                >
                  {{ user.status === 'active' ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="actions-cell">
                <button class="action-btn" (click)="openEditModal(user)" title="Editar">
                  <span class="material-symbols-outlined edit-icon">edit</span>
                </button>
                <button class="action-btn" (click)="toggleUserStatus(user)" title="Cambiar Estado">
                  <span
                    class="material-symbols-outlined"
                    [ngClass]="user.status === 'active' ? 'deactivate-icon' : 'activate-icon'"
                  >
                    {{ user.status === 'active' ? 'person_off' : 'person_check' }}
                  </span>
                </button>
              </td>
            </tr>
            <tr *ngIf="filteredUsers().length === 0">
              <td colspan="5" class="empty-row">
                <span class="material-symbols-outlined empty-icon">group_off</span>
                <p>No se encontraron usuarios coincidentes</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- User Form Modal -->
      <app-user-form
        *ngIf="showFormModal()"
        [user]="selectedUser()"
        (save)="onSaveUser($event)"
        (close)="closeFormModal()"
      ></app-user-form>
    </div>
  `,
  styles: [
    `
      .user-list-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .controls-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .search-filters {
        display: flex;
        gap: 1rem;
        flex: 1;
        flex-wrap: wrap;
      }

      .search-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        min-width: 250px;
        flex: 1;
      }

      .search-icon {
        position: absolute;
        left: 0.75rem;
        color: var(--text-secondary);
        font-size: 1.25rem;
      }

      .filter-input {
        padding-left: 2.5rem !important;
        width: 100%;
      }

      .select-filter {
        width: 180px;
        cursor: pointer;
      }

      .form-control {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        padding: 0.55rem 0.75rem;
        color: var(--text-primary);
        font-family: inherit;
        font-size: 0.85rem;
        outline: none;
        transition: var(--transition-fast);

        &:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px var(--primary-glow);
        }
      }

      .table-wrapper {
        width: 100%;
        overflow-x: auto;
        border-radius: var(--border-radius-lg);
      }

      .users-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 0.9rem;

        th {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid var(--border-color);
          font-weight: 600;
          color: var(--text-secondary);
        }

        td {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-primary);
        }

        tr:last-child td {
          border-bottom: none;
        }

        tr:hover td {
          background: rgba(255, 255, 255, 0.01);
        }
      }

      .name-cell {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 500;
      }

      .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
      }

      .actions-cell {
        display: flex;
        gap: 0.5rem;
      }

      .action-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.4rem;
        border-radius: var(--border-radius-sm);
        color: var(--text-secondary);
        transition: var(--transition-fast);

        &:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
      }

      .edit-icon:hover {
        color: var(--primary);
      }
      .deactivate-icon:hover {
        color: var(--danger);
      }
      .activate-icon:hover {
        color: var(--success);
      }

      .empty-row {
        text-align: center;
        padding: 3rem 1rem !important;
        color: var(--text-muted);

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }
        p {
          margin: 0;
          font-size: 0.95rem;
        }
      }
    `,
  ],
})
export class UserListComponent implements OnInit {
  // Signals for local state management
  users = signal<User[]>([]);
  showFormModal = signal(false);
  selectedUser = signal<User | null>(null);

  // Filter properties (bound via NgModel)
  searchQuery = '';
  roleFilter = 'all';
  statusFilter = 'all';

  ngOnInit(): void {
    this.loadMockUsers();
  }

  // Reactive filtering using computed signal
  filteredUsers = computed(() => {
    const query = this.searchQuery.toLowerCase().trim();
    const role = this.roleFilter;
    const status = this.statusFilter;

    return this.users().filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);

      const matchesRole = role === 'all' || u.role === role;
      const matchesStatus = status === 'all' || u.status === status;

      return matchesSearch && matchesRole && matchesStatus;
    });
  });

  loadMockUsers(): void {
    this.users.set([
      {
        id: '1',
        name: 'Dra. Camila Ferrufino',
        email: 'direccion@easydoc.edu',
        role: 'admin',
        status: 'active',
      },
      {
        id: '2',
        name: 'Sofia Vargas',
        email: 'sofia.vargas@easydoc.edu',
        role: 'user',
        status: 'active',
      },
      {
        id: '3',
        name: 'Rodrigo Lima',
        email: 'rodrigo.lima@easydoc.edu',
        role: 'approver',
        status: 'active',
      },
      {
        id: '4',
        name: 'Mariana Roca',
        email: 'mariana.roca@easydoc.edu',
        role: 'user',
        status: 'inactive',
      },
    ]);
  }

  openCreateModal(): void {
    this.selectedUser.set(null);
    this.showFormModal.set(true);
  }

  openEditModal(user: User): void {
    this.selectedUser.set(user);
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
    this.selectedUser.set(null);
  }

  onSaveUser(userData: any): void {
    const currentSelected = this.selectedUser();
    if (currentSelected) {
      // Edit User
      const updatedList = this.users().map((u) => {
        if (u.id === currentSelected.id) {
          return { ...u, ...userData };
        }
        return u;
      });
      this.users.set(updatedList);
    } else {
      // Create User
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: userData.name,
        email: userData.email,
        role: userData.role,
        status: userData.status,
      };
      this.users.set([...this.users(), newUser]);
    }
    this.closeFormModal();
  }

  toggleUserStatus(user: User): void {
    const updated = this.users().map((u) => {
      if (u.id === user.id) {
        const newStatus = u.status === 'active' ? ('inactive' as const) : ('active' as const);
        return { ...u, status: newStatus };
      }
      return u;
    });
    this.users.set(updated);
  }

  getRoleLabel(role: string): string {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Administrador';
      case 'user':
        return 'Usuario';
      case 'approver':
        return 'Aprobador';
      default:
        return role;
    }
  }
}
