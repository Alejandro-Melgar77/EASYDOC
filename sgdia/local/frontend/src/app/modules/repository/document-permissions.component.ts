import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Document, DocumentPermission } from '../../core/models/document.model';

interface SearchUserResult {
  id: string;
  name: string;
  email: string;
}

@Component({
  selector: 'app-document-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="permissions-container">
      <div class="permissions-header">
        <h4>Permisos de Acceso</h4>
        <span class="doc-title-meta">{{ document.title }}</span>
      </div>

      <!-- Add New Permission with Autocomplete -->
      <div class="add-permission-form">
        <label for="user-search">Asignar Acceso a Usuario</label>
        <div class="search-input-wrapper">
          <span class="material-symbols-outlined input-icon">person_search</span>
          <input
            id="user-search"
            type="text"
            placeholder="Escribe el nombre o correo del usuario..."
            [(ngModel)]="searchQuery"
            (input)="onSearchInput()"
            class="form-control"
            autocomplete="off"
          />

          <!-- Autocomplete Dropdown suggestions -->
          <div
            class="autocomplete-dropdown glass-panel"
            *ngIf="showSuggestions() && suggestions().length > 0"
          >
            <div
              class="suggestion-item"
              *ngFor="let user of suggestions()"
              (click)="addUserPermission(user)"
            >
              <div class="item-info">
                <span class="name">{{ user.name }}</span>
                <span class="email">{{ user.email }}</span>
              </div>
              <span class="material-symbols-outlined add-icon">add_circle</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Permissions List Grid -->
      <div class="permissions-list">
        <div class="permission-row" *ngFor="let perm of localPermissions(); let idx = index">
          <div class="subject-info">
            <span class="material-symbols-outlined subject-icon">
              {{ perm.type === 'role' ? 'shield_person' : 'person' }}
            </span>
            <div class="subject-text">
              <span class="name">{{ perm.subjectName }}</span>
              <span class="type">{{ perm.type === 'role' ? 'Rol' : 'Usuario' }}</span>
            </div>
          </div>

          <div class="permission-actions">
            <!-- Access Level Selection -->
            <select
              [(ngModel)]="perm.level"
              (change)="onLevelChange()"
              [disabled]="perm.subjectId === 'admin'"
              class="form-control select-level"
            >
              <option value="read">Lectura</option>
              <option value="write">Escritura</option>
              <option value="approve">Aprobar</option>
              <option value="admin">Administrador</option>
            </select>

            <!-- Delete Permission -->
            <button
              class="remove-btn"
              (click)="removePermission(idx)"
              [disabled]="perm.subjectId === 'admin'"
              title="Quitar acceso"
            >
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <button class="btn btn-primary" (click)="savePermissions()">
          <span class="material-symbols-outlined">save</span>
          Aplicar Cambios
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .permissions-container {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .permissions-header {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.75rem;

        h4 {
          font-size: 0.9rem;
          font-weight: 700;
          margin: 0;
        }
        .doc-title-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      }

      .add-permission-form {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;

        label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
        }
      }

      .search-input-wrapper {
        position: relative;
      }

      .input-icon {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-secondary);
        font-size: 1.25rem;
      }

      .form-control {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        padding: 0.55rem 0.75rem 0.55rem 2.5rem;
        color: var(--text-primary);
        font-family: inherit;
        font-size: 0.85rem;
        width: 100%;
        outline: none;

        &:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px var(--primary-glow);
        }
      }

      .autocomplete-dropdown {
        position: absolute;
        top: 45px;
        left: 0;
        right: 0;
        max-height: 180px;
        overflow-y: auto;
        z-index: 100;
        border-radius: var(--border-radius-md);
        padding: 0.25rem 0;
      }

      .suggestion-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0.75rem;
        cursor: pointer;
        transition: var(--transition-fast);

        &:hover {
          background: var(--bg-tertiary);
        }
      }

      .item-info {
        display: flex;
        flex-direction: column;

        .name {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .email {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
      }

      .add-icon {
        color: var(--primary);
        font-size: 1.25rem;
      }

      .permissions-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-top: 0.5rem;
        max-height: 250px;
        overflow-y: auto;
      }

      .permission-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.6rem 0.8rem;
        background: rgba(255, 255, 255, 0.01);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
      }

      .subject-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .subject-icon {
        color: var(--text-secondary);
        font-size: 1.5rem;
      }

      .subject-text {
        display: flex;
        flex-direction: column;

        .name {
          font-size: 0.8rem;
          font-weight: 600;
        }
        .type {
          font-size: 0.65rem;
          color: var(--text-muted);
        }
      }

      .permission-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      .select-level {
        width: 120px;
        padding: 0.35rem 0.5rem;
        font-size: 0.75rem;
        cursor: pointer;
      }

      .remove-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 0.25rem;
        border-radius: 4px;

        &:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      }

      .panel-footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 1rem;
        border-top: 1px solid var(--border-color);
        padding-top: 1rem;
      }
    `,
  ],
})
export class DocumentPermissionsComponent {
  @Input() document!: Document;
  @Output() permissionsUpdated = new EventEmitter<DocumentPermission[]>();

  localPermissions = signal<DocumentPermission[]>([]);
  searchQuery = '';
  showSuggestions = signal(false);
  suggestions = signal<SearchUserResult[]>([]);

  // Mock list of database users to simulate autocomplete search
  private mockUsers: SearchUserResult[] = [
    { id: 'usr_1', name: 'Dra. Camila Ferrufino', email: 'direccion@easydoc.edu' },
    { id: 'usr_2', name: 'Sofia Vargas', email: 'sofia.vargas@easydoc.edu' },
    { id: 'usr_3', name: 'Rodrigo Lima', email: 'rodrigo.lima@easydoc.edu' },
    { id: 'usr_4', name: 'Mariana Roca', email: 'mariana.roca@easydoc.edu' },
    { id: 'usr_5', name: 'Paola Andrade', email: 'paola.andrade@easydoc.edu' },
  ];

  ngOnChanges(): void {
    if (this.document) {
      // Clone existing permissions locally to modify them
      this.localPermissions.set(JSON.parse(JSON.stringify(this.document.permissions)));
    }
  }

  onSearchInput(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (query.length < 2) {
      this.suggestions.set([]);
      this.showSuggestions.set(false);
      return;
    }

    // Filter suggestions from mock user database (excluding those that already have permission)
    const currentSubjectIds = this.localPermissions().map((p) => p.subjectId);
    const filtered = this.mockUsers.filter(
      (u) =>
        !currentSubjectIds.includes(u.id) &&
        (u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)),
    );

    this.suggestions.set(filtered);
    this.showSuggestions.set(true);
  }

  addUserPermission(user: SearchUserResult): void {
    const newPermission: DocumentPermission = {
      subjectId: user.id,
      subjectName: user.name,
      type: 'user',
      level: 'read',
    };

    this.localPermissions.set([...this.localPermissions(), newPermission]);
    this.searchQuery = '';
    this.suggestions.set([]);
    this.showSuggestions.set(false);
  }

  removePermission(index: number): void {
    const updated = [...this.localPermissions()];
    if (updated[index].subjectId === 'admin') return; // Cannot delete admin
    updated.splice(index, 1);
    this.localPermissions.set(updated);
  }

  onLevelChange(): void {
    // Flag changes locally
  }

  savePermissions(): void {
    this.permissionsUpdated.emit(this.localPermissions());
    alert('Permisos del documento actualizados.');
  }
}
