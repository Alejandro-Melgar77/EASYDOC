import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  Folder,
  Document,
  DocumentVersion,
  DocumentPermission,
} from '../../core/models/document.model';
import { DocumentUploadComponent } from './document-upload.component';
import { DocumentPreviewComponent } from './document-preview.component';
import { DocumentVersionsComponent } from './document-versions.component';
import { DocumentPermissionsComponent } from './document-permissions.component';
import { ApiService } from '../../core/services/api.service';

interface OperationalFolder {
  id: string;
  name: string;
  parent_id: string | null;
  department: string | null;
  is_synthetic: boolean;
}

interface OperationalEntry {
  id: string;
  repository_id: string;
  filename: string;
  request_code: string | null;
  department: string | null;
  worker: string | null;
  uploaded_by: string | null;
  status: string | null;
  stored_at: string | null;
  is_synthetic: boolean;
}

interface OperationalRepository {
  folders: OperationalFolder[];
  entries: OperationalEntry[];
}

@Component({
  selector: 'app-repository-explorer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DocumentUploadComponent,
    DocumentPreviewComponent,
    DocumentVersionsComponent,
    DocumentPermissionsComponent,
  ],
  template: `
    <div class="explorer-layout">
      <!-- 📁 PANEL IZQUIERDO: Carpetas (Árbol) -->
      <aside class="sidebar-folders glass-panel">
        <div class="sidebar-title">
          <h3>Carpetas</h3>
          <button
            class="btn btn-secondary btn-xs add-folder-btn"
            (click)="createNewFolder()"
            title="Crear Carpeta"
          >
            <span class="material-symbols-outlined">create_new_folder</span>
          </button>
        </div>
        <p class="repository-source" *ngIf="operationalDataLoaded()">
          <span class="material-symbols-outlined">account_tree</span>
          Bitacora operativa por departamento y responsable
        </p>
        <ul class="folder-list">
          <li
            *ngFor="let folder of folders()"
            [class.active]="selectedFolderId() === folder.id"
            (click)="selectFolder(folder.id)"
            class="folder-item"
            (dragover)="onFolderDragOver($event, folder.id)"
            (dragleave)="onFolderDragLeave($event)"
            (drop)="onFolderDrop($event, folder.id)"
            [class.drag-target]="dragTargetFolderId() === folder.id"
          >
            <span class="material-symbols-outlined folder-icon">
              {{ selectedFolderId() === folder.id ? 'folder_open' : 'folder' }}
            </span>
            <span class="folder-name">{{ folder.name }}</span>
          </li>
        </ul>
      </aside>

      <!-- 🖥️ ÁREA PRINCIPAL: Explorador y Búsqueda -->
      <section class="explorer-main">
        <!-- Barra de búsqueda avanzada (Tarea 2.3) -->
        <div class="search-panel glass-panel">
          <div class="search-row">
            <div class="search-input-box">
              <span class="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                placeholder="Buscar por título, etiquetas o contenido..."
                [(ngModel)]="searchQuery"
                (input)="onSearchInputChange()"
                class="form-control"
              />
              <!-- Autocompletar sugerencias de búsqueda -->
              <div
                class="search-autocomplete glass-panel"
                *ngIf="showSearchSuggestions() && searchSuggestions().length > 0"
              >
                <div
                  class="suggestion-item"
                  *ngFor="let suggestion of searchSuggestions()"
                  (click)="applySearchSuggestion(suggestion)"
                >
                  <span class="material-symbols-outlined suggestion-icon">history</span>
                  <span>{{ suggestion }}</span>
                </div>
              </div>
            </div>

            <!-- Toggle búsqueda semántica vs texto -->
            <div class="search-toggle">
              <span class="label">Búsqueda Semántica (IA)</span>
              <label class="switch">
                <input type="checkbox" [(ngModel)]="isSemanticSearch" />
                <span class="slider round"></span>
              </label>
            </div>

            <button class="btn btn-primary" (click)="openUploadModal()">
              <span class="material-symbols-outlined">cloud_upload</span>
              Cargar
            </button>
          </div>

          <!-- Filtros avanzados -->
          <div class="filters-row">
            <div class="filter-group">
              <label>Tipo:</label>
              <select [(ngModel)]="typeFilter" class="form-control filter-control">
                <option value="all">Todos</option>
                <option value="pdf">PDF</option>
                <option value="doc">Word</option>
                <option value="xls">Excel</option>
                <option value="img">Imagen</option>
              </select>
            </div>

            <div class="filter-group">
              <label>Autor:</label>
              <input
                type="text"
                [(ngModel)]="authorFilter"
                placeholder="Filtrar por autor..."
                class="form-control filter-control"
              />
            </div>

            <div class="filter-group">
              <label>Etiqueta:</label>
              <select [(ngModel)]="tagFilter" class="form-control filter-control">
                <option value="all">Todas</option>
                <option *ngFor="let tag of allTags()" [value]="tag">{{ tag }}</option>
              </select>
            </div>

            <div class="view-toggles">
              <button
                class="view-btn"
                [class.active]="viewMode() === 'list'"
                (click)="setViewMode('list')"
                title="Vista de lista"
              >
                <span class="material-symbols-outlined">format_list_bulleted</span>
              </button>
              <button
                class="view-btn"
                [class.active]="viewMode() === 'grid'"
                (click)="setViewMode('grid')"
                title="Vista de cuadrícula"
              >
                <span class="material-symbols-outlined">grid_view</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Breadcrumbs y Contenido -->
        <div class="explorer-content glass-panel">
          <div class="breadcrumb-bar">
            <span class="breadcrumb-item" (click)="selectFolder('root')">Repositorio</span>
            <span class="separator" *ngFor="let crumb of breadcrumbPath()">
              <span class="material-symbols-outlined crumb-divider-icon">navigate_next</span>
              <span class="breadcrumb-item" (click)="selectFolder(crumb.id)">{{ crumb.name }}</span>
            </span>
          </div>

          <!-- Lista de Items con soporte Drag & Drop -->
          <div class="items-viewport" [class.grid-layout]="viewMode() === 'grid'">
            <!-- Si es Vista Lista -->
            <div
              class="list-headers"
              *ngIf="viewMode() === 'list' && filteredDocuments().length > 0"
            >
              <div class="col-title">Nombre</div>
              <div class="col-meta">Autor</div>
              <div class="col-meta">Creado</div>
              <div class="col-meta">Tamaño</div>
            </div>

            <!-- Loop Documentos -->
            <div
              class="document-item"
              *ngFor="let doc of filteredDocuments()"
              [class.selected]="activeDocumentId() === doc.id"
              (click)="selectDocument(doc.id)"
              draggable="true"
              (dragstart)="onDragStart($event, doc.id)"
            >
              <div class="item-main-info">
                <span class="material-symbols-outlined type-icon">{{ getFileIcon(doc.type) }}</span>
                <div class="item-text">
                  <span class="title">{{ doc.title }}</span>
                  <div class="tags-row">
                    <span class="tag-label" *ngFor="let tag of doc.tags">{{ tag }}</span>
                  </div>
                </div>
              </div>
              <div class="item-details" *ngIf="viewMode() === 'list'">
                <span class="author">{{ doc.author }}</span>
                <span class="date">{{ doc.createdAt }}</span>
                <span class="size">{{ doc.size }}</span>
              </div>
            </div>

            <!-- Empty State -->
            <div class="empty-state" *ngIf="filteredDocuments().length === 0">
              <span class="material-symbols-outlined empty-icon">folder_open</span>
              <p>No se encontraron documentos en esta carpeta</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 🔎 PANEL DERECHO: Detalles y Acciones Contextuales -->
      <aside class="detail-sidebar glass-panel" *ngIf="activeDocument() as doc">
        <div class="detail-header">
          <h3>Detalle del Archivo</h3>
          <button class="close-detail-btn" (click)="clearActiveDocument()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="detail-tabs">
          <button [class.active]="detailTab() === 'info'" (click)="setDetailTab('info')">
            Info
          </button>
          <button [class.active]="detailTab() === 'versions'" (click)="setDetailTab('versions')">
            Versiones
          </button>
          <button
            [class.active]="detailTab() === 'permissions'"
            (click)="setDetailTab('permissions')"
          >
            Permisos
          </button>
        </div>

        <div class="tab-scroller">
          <!-- Pestaña Info -->
          <div class="tab-pane" *ngIf="detailTab() === 'info'">
            <div class="doc-summary-card">
              <span class="material-symbols-outlined doc-giant-icon">{{
                getFileIcon(doc.type)
              }}</span>
              <h4>{{ doc.title }}</h4>
              <p class="desc">{{ doc.description }}</p>
            </div>

            <div class="doc-metadata-fields">
              <div class="field">
                <span class="label">Tamaño:</span>
                <span class="val">{{ doc.size }}</span>
              </div>
              <div class="field">
                <span class="label">Autor:</span>
                <span class="val">{{ doc.author }}</span>
              </div>
              <div class="field">
                <span class="label">Creado:</span>
                <span class="val">{{ doc.createdAt }}</span>
              </div>
              <div class="field">
                <span class="label">Versión actual:</span>
                <span class="val">v{{ doc.versions[0]?.version }}</span>
              </div>
            </div>

            <div class="action-buttons-group">
              <button class="btn btn-primary" (click)="openPreviewModal()">
                <span class="material-symbols-outlined">visibility</span>
                Vista Previa
              </button>
              <button class="btn btn-secondary btn-danger" (click)="deleteDocument(doc)">
                <span class="material-symbols-outlined">delete</span>
                Eliminar
              </button>
            </div>
          </div>

          <!-- Pestaña Versiones (Tarea 2.4) -->
          <div class="tab-pane" *ngIf="detailTab() === 'versions'">
            <app-document-versions
              [document]="doc"
              (versionRestored)="onVersionRestored($event)"
            ></app-document-versions>
          </div>

          <!-- Pestaña Permisos (Tarea 2.5) -->
          <div class="tab-pane" *ngIf="detailTab() === 'permissions'">
            <app-document-permissions
              [document]="doc"
              (permissionsUpdated)="onPermissionsUpdated($event)"
            ></app-document-permissions>
          </div>
        </div>
      </aside>
    </div>

    <!-- Modales de Carga y Previsualización -->
    <app-document-upload
      *ngIf="showUploadModal()"
      [folders]="folders()"
      [currentFolderId]="selectedFolderId()"
      (completed)="onUploadCompleted($event)"
      (close)="closeUploadModal()"
    ></app-document-upload>

    <app-document-preview
      *ngIf="showPreviewModal() && activeDocument()"
      [document]="activeDocument()!"
      (close)="closePreviewModal()"
    ></app-document-preview>
  `,
  styles: [
    `
      .explorer-layout {
        display: grid;
        grid-template-columns: 240px 1fr;
        gap: 1.5rem;
        height: calc(100vh - 110px);
        align-items: start;

        &:has(.detail-sidebar) {
          grid-template-columns: 240px 1fr 320px;
        }

        @media (max-width: 1200px) {
          grid-template-columns: 200px 1fr !important;
          .detail-sidebar {
            position: fixed;
            right: 0;
            top: 70px;
            height: calc(100vh - 70px);
            z-index: 90;
          }
        }
      }

      /* Sidebars */
      .sidebar-folders,
      .detail-sidebar {
        height: 100%;
        overflow-y: auto;
        border-radius: var(--border-radius-lg);
      }

      .sidebar-folders {
        padding: 1.25rem 0;
      }

      .sidebar-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 1.25rem 0.75rem 1.25rem;
        border-bottom: 1px solid var(--border-color);
        h3 {
          font-size: 0.9rem;
          margin: 0;
        }
      }
      .repository-source {
        display: flex;
        align-items: flex-start;
        gap: 0.4rem;
        margin: 0 0 0.75rem;
        color: var(--text-muted);
        font-size: 0.68rem;
        line-height: 1.35;
      }
      .repository-source .material-symbols-outlined {
        color: var(--accent);
        font-size: 0.95rem;
      }

      .add-folder-btn {
        padding: 0.2rem;
        display: flex;
        align-items: center;
      }

      .folder-list {
        list-style: none;
        padding: 0.5rem 0;
      }

      .folder-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.7rem 1.25rem;
        cursor: pointer;
        color: var(--text-secondary);
        border-left: 3px solid transparent;
        transition: var(--transition-fast);

        &:hover,
        &.drag-target {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        &.active {
          background: var(--primary-glow);
          color: var(--primary);
          border-left-color: var(--primary);
          font-weight: 600;
          .folder-icon {
            color: var(--primary);
          }
        }
      }

      .folder-icon {
        font-size: 1.25rem;
      }

      .folder-name {
        font-size: 0.85rem;
      }

      /* Explorer Main Content */
      .explorer-main {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        height: 100%;
      }

      .search-panel {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .search-row {
        display: flex;
        gap: 1rem;
        align-items: center;
      }

      .search-input-box {
        position: relative;
        flex: 1;

        .form-control {
          padding-left: 2.5rem;
          width: 100%;
        }
      }

      .search-icon {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-secondary);
      }

      .search-autocomplete {
        position: absolute;
        top: 45px;
        left: 0;
        right: 0;
        z-index: 1000;
        border-radius: var(--border-radius-md);
        padding: 0.25rem 0;
      }

      .suggestion-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0.75rem;
        cursor: pointer;
        font-size: 0.85rem;
        color: var(--text-secondary);
        &:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
      }

      .suggestion-icon {
        font-size: 1.1rem;
      }

      .search-toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-secondary);
      }

      /* Switch styling */
      .switch {
        position: relative;
        display: inline-block;
        width: 42px;
        height: 22px;
      }

      .switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        transition: 0.4s;
      }

      .slider:before {
        position: absolute;
        content: '';
        height: 14px;
        width: 14px;
        left: 3px;
        bottom: 3px;
        background-color: var(--text-secondary);
        transition: 0.4s;
      }

      input:checked + .slider {
        background-color: var(--primary);
      }
      input:checked + .slider:before {
        transform: translateX(20px);
        background-color: white;
      }
      .slider.round {
        border-radius: 34px;
      }
      .slider.round:before {
        border-radius: 50%;
      }

      .filters-row {
        display: flex;
        gap: 1rem;
        align-items: center;
        border-top: 1px solid var(--border-color);
        padding-top: 0.75rem;
        flex-wrap: wrap;
      }

      .filter-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
        font-weight: 600;
      }

      .filter-control {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-sm);
        padding: 0.35rem 0.5rem;
        color: var(--text-primary);
        font-family: inherit;
        font-size: 0.8rem;
        outline: none;
      }

      .view-toggles {
        display: flex;
        gap: 0.25rem;
        margin-left: auto;
      }

      .view-btn {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        padding: 0.4rem;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        transition: var(--transition-fast);

        &:hover,
        &.active {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
      }

      /* Content Pane */
      .explorer-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .breadcrumb-bar {
        padding: 0.75rem 1rem;
        background: rgba(255, 255, 255, 0.01);
        border-bottom: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.25rem;
        font-size: 0.8rem;
      }

      .breadcrumb-item {
        color: var(--text-secondary);
        font-weight: 500;
        cursor: pointer;
        &:hover {
          color: var(--primary);
          text-decoration: underline;
        }
      }

      .separator {
        display: flex;
        align-items: center;
        color: var(--text-muted);
      }

      .crumb-divider-icon {
        font-size: 1.1rem;
      }

      .items-viewport {
        flex: 1;
        overflow-y: auto;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;

        &.grid-layout {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1rem;
          align-content: start;

          .document-item {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 1.5rem 1rem;
            height: 140px;

            .item-main-info {
              flex-direction: column;
              gap: 0.5rem;
            }

            .type-icon {
              font-size: 2.5rem;
            }
            .tags-row {
              justify-content: center;
            }
          }
        }
      }

      .list-headers {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 120px;
        padding: 0.5rem 1rem;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--text-muted);
        border-bottom: 1px solid var(--border-color);
        text-transform: uppercase;
      }

      .document-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        border-radius: var(--border-radius-md);
        border: 1px solid transparent;
        cursor: pointer;
        transition: var(--transition-fast);

        &:hover {
          background: rgba(255, 255, 255, 0.01);
          border-color: var(--border-color);
        }

        &.selected {
          background: var(--primary-glow);
          border-color: rgba(99, 102, 241, 0.25);
          .title {
            color: var(--primary);
          }
        }
      }

      .item-main-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex: 2;
        overflow: hidden;
      }

      .type-icon {
        font-size: 1.75rem;
        color: var(--primary);
        flex-shrink: 0;
      }

      .item-text {
        display: flex;
        flex-direction: column;
        overflow: hidden;

        .title {
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .tags-row {
        display: flex;
        gap: 0.25rem;
        margin-top: 0.2rem;
      }

      .tag-label {
        font-size: 0.65rem;
        padding: 0.05rem 0.3rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        color: var(--text-muted);
      }

      .item-details {
        display: grid;
        grid-template-columns: 1fr 1fr 120px;
        flex: 2;
        font-size: 0.8rem;
        color: var(--text-secondary);
        align-items: center;
        text-align: left;
      }

      /* Detail Sidebar */
      .detail-sidebar {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        border: var(--glass-border);
        background: var(--bg-secondary);
      }

      .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.75rem;
        h3 {
          font-size: 0.95rem;
          margin: 0;
        }
      }

      .close-detail-btn {
        background: transparent;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        padding: 0.2rem;
        border-radius: 50%;
        &:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
      }

      .detail-tabs {
        display: flex;
        border-bottom: 1px solid var(--border-color);
        margin-bottom: 1.25rem;

        button {
          flex: 1;
          background: transparent;
          border: none;
          padding: 0.6rem 0;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition-fast);

          &.active {
            color: var(--primary);
            border-bottom: 2px solid var(--primary);
          }
        }
      }

      .tab-scroller {
        flex: 1;
        overflow-y: auto;
      }

      .doc-summary-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.5rem;
        margin-bottom: 1.5rem;

        .doc-giant-icon {
          font-size: 3.5rem;
          color: var(--primary);
        }
        h4 {
          font-size: 0.95rem;
          font-weight: 700;
          margin: 0;
        }
        .desc {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.4;
        }
      }

      .doc-metadata-fields {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        margin-bottom: 2rem;

        .field {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          border-bottom: 1px dashed var(--border-color);
          padding-bottom: 0.4rem;

          .label {
            color: var(--text-muted);
            font-weight: 600;
          }
          .val {
            color: var(--text-primary);
            font-weight: 500;
          }
        }
      }

      .action-buttons-group {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 1rem;
        color: var(--text-muted);
        gap: 0.5rem;

        .empty-icon {
          font-size: 3rem;
        }
        p {
          font-size: 0.85rem;
          margin: 0;
        }
      }
    `,
  ],
})
export class RepositoryComponent implements OnInit {
  private readonly api = inject(ApiService);
  // Signals for state
  folders = signal<Folder[]>([]);
  documents = signal<Document[]>([]);
  operationalDataLoaded = signal(false);

  selectedFolderId = signal<string>('root');
  activeDocumentId = signal<string | null>(null);

  // Modal toggles
  showUploadModal = signal(false);
  showPreviewModal = signal(false);

  // View states
  viewMode = signal<'list' | 'grid'>('list');
  detailTab = signal<'info' | 'versions' | 'permissions'>('info');

  // Search state
  searchQuery = '';
  isSemanticSearch = false;
  showSearchSuggestions = signal(false);
  searchSuggestions = signal<string[]>([]);

  // Filters
  typeFilter = 'all';
  authorFilter = '';
  tagFilter = 'all';

  // Drag and drop tracking
  draggedDocumentId: string | null = null;
  dragTargetFolderId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadMockData();
    void this.loadOperationalData();
  }

  private async loadOperationalData(): Promise<void> {
    try {
      const repository = await firstValueFrom(
        this.api.get<OperationalRepository>('/documents/operational-repository'),
      );
      if (!repository.entries.length) return;
      const rootId = 'easydoc:departments';
      const folders: Folder[] = [
        { id: rootId, name: 'EASYDOC | Repositorios operativos', parentId: null, path: [] },
        ...repository.folders.map((folder) => ({
          id: folder.id,
          name: folder.name,
          parentId: folder.parent_id || rootId,
          path: [],
        })),
      ];
      const knownFolderIds = new Set(folders.map((folder) => folder.id));
      const documents = repository.entries.map((entry) =>
        this.toOperationalDocument(
          entry,
          knownFolderIds.has(entry.repository_id) ? entry.repository_id : rootId,
        ),
      );
      this.folders.set(folders);
      this.documents.set(documents);
      this.selectedFolderId.set(rootId);
      this.operationalDataLoaded.set(true);
    } catch {
      this.operationalDataLoaded.set(false);
    }
  }

  private toOperationalDocument(entry: OperationalEntry, folderId: string): Document {
    const type = this.documentType(entry.filename);
    const storedAt = entry.stored_at ? new Date(entry.stored_at) : new Date();
    return {
      id: entry.id,
      title: entry.filename,
      description: [entry.request_code, entry.department, entry.status].filter(Boolean).join(' | '),
      type,
      size: 'Bitacora',
      folderId,
      tags: [
        entry.department,
        entry.worker,
        entry.status,
        entry.is_synthetic ? 'dato-sintetico' : 'operativo',
      ].filter((value): value is string => Boolean(value)),
      author: entry.uploaded_by || entry.worker || 'EASYDOC',
      createdAt: storedAt.toLocaleString('es-BO'),
      status: 'active',
      versions: [
        {
          version: '1.0',
          author: entry.uploaded_by || entry.worker || 'EASYDOC',
          date: storedAt.toLocaleString('es-BO'),
          summary: entry.status || 'Registro de trazabilidad',
          fileSize: 'Bitacora',
        },
      ],
      permissions: [],
    };
  }

  private documentType(filename: string): Document['type'] {
    const suffix = filename.split('.').pop()?.toLowerCase();
    if (suffix === 'pdf') return 'pdf';
    if (suffix === 'doc' || suffix === 'docx') return 'doc';
    if (suffix === 'xls' || suffix === 'xlsx') return 'xls';
    return 'img';
  }

  // Active document object
  activeDocument = computed(() => {
    const activeId = this.activeDocumentId();
    if (!activeId) return null;
    return this.documents().find((d) => d.id === activeId) || null;
  });

  // Breadcrumbs calculation
  breadcrumbPath = computed(() => {
    const activeFolderId = this.selectedFolderId();
    if (activeFolderId === 'root') return [];

    const path: Folder[] = [];
    let currentFolder = this.folders().find((f) => f.id === activeFolderId);

    while (currentFolder) {
      path.unshift(currentFolder);
      if (currentFolder.parentId) {
        currentFolder = this.folders().find((f) => f.id === currentFolder!.parentId);
      } else {
        currentFolder = undefined;
      }
    }

    return path;
  });

  // Tags filter list helper
  allTags = computed(() => {
    const all = new Set<string>();
    this.documents().forEach((d) => d.tags.forEach((t) => all.add(t)));
    return Array.from(all);
  });

  // Main filter function
  filteredDocuments = computed(() => {
    const activeFolderId = this.selectedFolderId();
    const query = this.searchQuery.toLowerCase().trim();
    const type = this.typeFilter;
    const author = this.authorFilter.toLowerCase().trim();
    const tag = this.tagFilter;

    return this.documents().filter((doc) => {
      // 1. Folder check (if searching, ignore active folder hierarchy to search globally, else only current folder)
      const matchesFolder = query.length > 0 ? true : doc.folderId === activeFolderId;

      // 2. Query search
      const matchesQuery =
        query.length === 0
          ? true
          : doc.title.toLowerCase().includes(query) ||
            doc.description.toLowerCase().includes(query) ||
            doc.tags.some((t) => t.toLowerCase().includes(query));

      // 3. Type search
      const matchesType = type === 'all' || doc.type === type;

      // 4. Author search
      const matchesAuthor = author.length === 0 ? true : doc.author.toLowerCase().includes(author);

      // 5. Tag search
      const matchesTag = tag === 'all' || doc.tags.includes(tag);

      return matchesFolder && matchesQuery && matchesType && matchesAuthor && matchesTag;
    });
  });

  loadMockData(): void {
    // folders
    this.folders.set([
      { id: 'root', name: 'Repositorio', parentId: null, path: [] },
      { id: 'fold_legal', name: 'Legal', parentId: 'root', path: ['root'] },
      { id: 'fold_politicas', name: 'Políticas Generales', parentId: 'root', path: ['root'] },
      { id: 'fold_finanzas', name: 'Finanzas', parentId: 'root', path: ['root'] },
      { id: 'fold_rh', name: 'Recursos Humanos', parentId: 'root', path: ['root'] },
    ]);

    // docs
    this.documents.set([
      {
        id: 'doc_1',
        title: 'Manual_Procedimientos_SGA_2026',
        description:
          'Manual general para la gestión ambiental y reglamentaciones corporativas internas.',
        type: 'pdf',
        size: '14.8 MB',
        folderId: 'fold_politicas',
        tags: ['manual', 'sga', 'politica'],
        author: 'Carlos Pérez',
        createdAt: '08 Jun 2026',
        status: 'active',
        versions: [
          {
            version: '1.1',
            author: 'Carlos Pérez',
            date: '08 Jun 2026',
            summary: 'Se agregaron las nuevas regulaciones ambientales de emisión.',
            fileSize: '14.8 MB',
          },
          {
            version: '1.0',
            author: 'Carlos Pérez',
            date: '02 Jun 2026',
            summary: 'Carga inicial del documento.',
            fileSize: '14.2 MB',
          },
        ],
        permissions: [
          { subjectId: 'admin', subjectName: 'Administrador', type: 'role', level: 'admin' },
          { subjectId: 'user', subjectName: 'Usuario', type: 'role', level: 'read' },
        ],
      },
      {
        id: 'doc_2',
        title: 'Política_Seguridad_Informacion',
        description:
          'Políticas corporativas referentes a contraseñas, accesos y seguridad informática global.',
        type: 'doc',
        size: '1.2 MB',
        folderId: 'fold_politicas',
        tags: ['politica', 'legal'],
        author: 'Ana Gómez',
        createdAt: '07 Jun 2026',
        status: 'active',
        versions: [
          {
            version: '1.0',
            author: 'Ana Gómez',
            date: '07 Jun 2026',
            summary: 'Carga inicial del documento.',
            fileSize: '1.2 MB',
          },
        ],
        permissions: [
          { subjectId: 'admin', subjectName: 'Administrador', type: 'role', level: 'admin' },
        ],
      },
      {
        id: 'doc_3',
        title: 'Plan_Negocios_Anual',
        description:
          'Hoja de cálculo detallada con el presupuesto y metas financieras del periodo actual.',
        type: 'xls',
        size: '3.4 MB',
        folderId: 'fold_finanzas',
        tags: ['finanzas', 'excel'],
        author: 'Marcos Ruiz',
        createdAt: '05 Jun 2026',
        status: 'active',
        versions: [
          {
            version: '1.0',
            author: 'Marcos Ruiz',
            date: '05 Jun 2026',
            summary: 'Carga inicial del presupuesto.',
            fileSize: '3.4 MB',
          },
        ],
        permissions: [
          { subjectId: 'admin', subjectName: 'Administrador', type: 'role', level: 'admin' },
          { subjectId: 'approver', subjectName: 'Aprobador', type: 'role', level: 'approve' },
        ],
      },
      {
        id: 'doc_4',
        title: 'Contrato_Soporte_AWS',
        description: 'Copia digital firmada del acuerdo comercial con Amazon Web Services.',
        type: 'img',
        size: '4.5 MB',
        folderId: 'fold_legal',
        tags: ['contrato', 'legal', 'aws'],
        author: 'Ana Gómez',
        createdAt: '01 Jun 2026',
        status: 'active',
        versions: [
          {
            version: '1.0',
            author: 'Ana Gómez',
            date: '01 Jun 2026',
            summary: 'Escaneo firmado de contrato.',
            fileSize: '4.5 MB',
          },
        ],
        permissions: [
          { subjectId: 'admin', subjectName: 'Administrador', type: 'role', level: 'admin' },
        ],
      },
    ]);
  }

  selectFolder(folderId: string): void {
    this.selectedFolderId.set(folderId);
    this.activeDocumentId.set(null); // Clear selected doc when switching folders
  }

  selectDocument(docId: string): void {
    this.activeDocumentId.set(docId);
    this.detailTab.set('info'); // Reset tab to info pane
  }

  clearActiveDocument(): void {
    this.activeDocumentId.set(null);
  }

  setViewMode(mode: 'list' | 'grid'): void {
    this.viewMode.set(mode);
  }

  setDetailTab(tab: 'info' | 'versions' | 'permissions'): void {
    this.detailTab.set(tab);
  }

  // Folder creation (CRUD folder)
  createNewFolder(): void {
    const name = prompt('Nombre de la nueva carpeta:');
    if (name && name.trim()) {
      const newFolder: Folder = {
        id: 'fold_' + Math.random().toString(36).substr(2, 9),
        name: name.trim(),
        parentId: this.selectedFolderId() === 'root' ? 'root' : this.selectedFolderId(),
        path: [...this.breadcrumbPath().map((c) => c.id), this.selectedFolderId()],
      };
      this.folders.set([...this.folders(), newFolder]);
    }
  }

  // Upload actions
  openUploadModal(): void {
    this.showUploadModal.set(true);
  }
  closeUploadModal(): void {
    this.showUploadModal.set(false);
  }

  onUploadCompleted(newDocs: Document[]): void {
    this.documents.set([...this.documents(), ...newDocs]);
    this.closeUploadModal();
  }

  // Preview actions
  openPreviewModal(): void {
    this.showPreviewModal.set(true);
  }
  closePreviewModal(): void {
    this.showPreviewModal.set(false);
  }

  // Search autocomplete
  onSearchInputChange(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (query.length < 2) {
      this.searchSuggestions.set([]);
      this.showSearchSuggestions.set(false);
      return;
    }

    // Mock search history suggestions
    const items = ['manual sga', 'contrato legal', 'presupuesto finanzas', 'politica de seguridad'];
    const filtered = items.filter((i) => i.includes(query));

    this.searchSuggestions.set(filtered);
    this.showSearchSuggestions.set(true);
  }

  applySearchSuggestion(val: string): void {
    this.searchQuery = val;
    this.searchSuggestions.set([]);
    this.showSearchSuggestions.set(false);
  }

  // Drag and drop handlers to move documents into folders (Tarea 2.1)
  onDragStart(event: DragEvent, docId: string): void {
    this.draggedDocumentId = docId;
    event.dataTransfer?.setData('text/plain', docId);
  }

  onFolderDragOver(event: DragEvent, folderId: string): void {
    event.preventDefault();
    if (this.selectedFolderId() !== folderId) {
      this.dragTargetFolderId.set(folderId);
    }
  }

  onFolderDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragTargetFolderId.set(null);
  }

  onFolderDrop(event: DragEvent, folderId: string): void {
    event.preventDefault();
    this.dragTargetFolderId.set(null);
    const docId = event.dataTransfer?.getData('text/plain') || this.draggedDocumentId;

    if (docId && docId !== folderId) {
      // Update document's folder ID
      const updated = this.documents().map((doc) => {
        if (doc.id === docId) {
          return { ...doc, folderId: folderId };
        }
        return doc;
      });
      this.documents.set(updated);
      this.draggedDocumentId = null;
    }
  }

  // Version management callback (Tarea 2.4)
  onVersionRestored(ver: DocumentVersion): void {
    const activeDoc = this.activeDocument();
    if (!activeDoc) return;

    // Create a new version item on top representing the restore operation
    const newVerNum = (parseFloat(activeDoc.versions[0].version) + 0.1).toFixed(1);
    const newVer: DocumentVersion = {
      version: newVerNum,
      author: 'Administrador Sistema',
      date: new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      summary: `Restaurada versión ${ver.version}. Motivo: ${ver.summary}`,
      fileSize: ver.fileSize,
    };

    const updated = this.documents().map((d) => {
      if (d.id === activeDoc.id) {
        return {
          ...d,
          size: ver.fileSize,
          versions: [newVer, ...d.versions],
        };
      }
      return d;
    });

    this.documents.set(updated);
    alert(`Se ha restaurado el documento a la versión ${ver.version}.`);
  }

  // Permissions management callback (Tarea 2.5)
  onPermissionsUpdated(newPermissions: DocumentPermission[]): void {
    const activeDoc = this.activeDocument();
    if (!activeDoc) return;

    const updated = this.documents().map((d) => {
      if (d.id === activeDoc.id) {
        return {
          ...d,
          permissions: newPermissions,
        };
      }
      return d;
    });

    this.documents.set(updated);
  }

  // Delete Document (Tarea 2.6)
  deleteDocument(doc: Document): void {
    if (confirm(`¿Estás seguro de que deseas archivar/eliminar permanentemente "${doc.title}"?`)) {
      const updated = this.documents().filter((d) => d.id !== doc.id);
      this.documents.set(updated);
      this.activeDocumentId.set(null);
    }
  }

  // Icon Utilities
  getFileIcon(type: 'pdf' | 'doc' | 'xls' | 'img'): string {
    switch (type) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'doc':
        return 'description';
      case 'xls':
        return 'table_chart';
      case 'img':
        return 'image';
      default:
        return 'draft';
    }
  }
}
