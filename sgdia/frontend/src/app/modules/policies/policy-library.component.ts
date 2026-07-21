import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BusinessPolicy, BusinessPolicyStatus } from '../../core/models/business-policy.model';
import { PolicyLibraryService } from '../../core/services/policy-library.service';

type LibraryView = 'cards' | 'rows';
type StatusFilter = BusinessPolicyStatus | 'all';

@Component({
  selector: 'app-policy-library',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  template: `
    <div class="policy-library">
      <header class="library-header glass-panel">
        <div class="library-heading">
          <span class="ed-page-kicker">
            <span class="material-symbols-outlined">account_tree</span>
            Gobierno de procesos
          </span>
          <h1 class="ed-page-title">Biblioteca de politicas</h1>
          <p class="ed-page-subtitle">
            Diagramas de actividad y formularios que ya forman parte de la operacion academica.
          </p>
        </div>

        <a class="btn btn-accent" routerLink="/uml-designer">
          <span class="material-symbols-outlined">add</span>
          Nueva politica
        </a>
      </header>

      <section class="library-toolbar glass-panel" aria-label="Controles de biblioteca">
        <label class="search-field">
          <span class="material-symbols-outlined">search</span>
          <input
            type="search"
            placeholder="Buscar por nombre o descripcion"
            [value]="searchQuery()"
            (input)="setSearchQuery($event)"
          />
        </label>

        <label class="status-filter">
          <span>Estado</span>
          <select [value]="statusFilter()" (change)="setStatusFilter($event)">
            <option value="all">Todos</option>
            <option value="published">Publicada</option>
            <option value="draft">Borrador</option>
            <option value="archived">Archivada</option>
          </select>
        </label>

        <div class="library-tabs" aria-label="Apartados de biblioteca">
          <button
            type="button"
            [class.active]="activeTab() === 'diagrams'"
            (click)="activeTab.set('diagrams')"
          >
            <span class="material-symbols-outlined">account_tree</span>
            Diagramas
          </button>
          <button
            type="button"
            [class.active]="activeTab() === 'documents'"
            (click)="activeTab.set('documents')"
          >
            <span class="material-symbols-outlined">description</span>
            Documentos
          </button>
          <button
            type="button"
            [class.active]="activeTab() === 'forms'"
            (click)="activeTab.set('forms')"
          >
            <span class="material-symbols-outlined">dynamic_form</span>
            Formularios
          </button>
        </div>
      </section>

      <section
        *ngIf="library.remoteMessage() as remoteMessage"
        class="sync-notice"
        [class.sync-notice-error]="library.remoteState() === 'unauthorized'"
        [class.sync-notice-warning]="library.remoteState() === 'offline'"
        role="status"
      >
        <span class="material-symbols-outlined">
          {{ library.remoteState() === 'unauthorized' ? 'lock' : 'cloud_off' }}
        </span>
        <p>{{ remoteMessage }}</p>
        <button
          *ngIf="library.remoteState() === 'offline'"
          type="button"
          class="icon-button"
          title="Reintentar sincronizacion"
          aria-label="Reintentar sincronizacion"
          (click)="library.refreshFromServer()"
        >
          <span class="material-symbols-outlined">refresh</span>
        </button>
      </section>

      <section class="library-summary" aria-label="Resumen de politicas">
        <div class="summary-item">
          <span class="material-symbols-outlined">library_books</span>
          <div>
            <strong>{{ library.totalPolicies() }}</strong>
            <span>politicas registradas</span>
          </div>
        </div>
        <div class="summary-item">
          <span class="material-symbols-outlined">task_alt</span>
          <div>
            <strong>{{ publishedCount() }}</strong>
            <span>publicadas</span>
          </div>
        </div>
        <div class="summary-item">
          <span class="material-symbols-outlined">assignment</span>
          <div>
            <strong>{{ formCount() }}</strong>
            <span>con formulario</span>
          </div>
        </div>
      </section>

      <section *ngIf="filteredPolicies().length; else emptyLibrary">
        <div class="policy-table glass-panel">
          <div class="table-header" aria-hidden="true">
            <span *ngIf="activeTab() === 'diagrams'">Diagrama (Proceso)</span>
            <span *ngIf="activeTab() === 'documents'">Documento Master</span>
            <span *ngIf="activeTab() === 'forms'">Formulario</span>
            
            <span>Politica Asignada</span>
            <span>Estado</span>
            <span>Fecha de Creacion</span>
            <span>Acciones</span>
          </div>

          <ng-container *ngIf="activeTab() === 'diagrams'">
            <article class="policy-row" *ngFor="let policy of filteredPolicies()">
              <div class="row-name">
                <span class="material-symbols-outlined policy-icon">account_tree</span>
                <div>
                  <strong>Diagrama: {{ policy.name }}</strong>
                  <span>{{ policy.nodes.length }} pasos y {{ policy.edges.length }} uniones</span>
                </div>
              </div>
              <span>{{ policy.name }}</span>
              <span class="policy-status" [class]="'status-' + policy.status">
                {{ statusLabel(policy.status) }}
              </span>
              <span>{{ policy.createdAt | date: 'dd MMM, y' }}</span>
              <div class="row-actions">
                <button type="button" class="btn btn-secondary" (click)="openPolicy(policy.id)">
                  <span class="material-symbols-outlined">visibility</span> Abrir
                </button>
                <a class="btn btn-primary" [routerLink]="['/uml-designer', policy.id]">
                  <span class="material-symbols-outlined">edit</span> Editar
                </a>
              </div>
            </article>
          </ng-container>

          <ng-container *ngIf="activeTab() === 'documents'">
            <ng-container *ngFor="let policy of filteredPolicies()">
              <article class="policy-row" *ngIf="masterArtifact(policy) as artifact">
                <div class="row-name">
                  <span class="material-symbols-outlined policy-icon">description</span>
                  <div>
                    <strong>{{ artifact.title || 'Documento sin titulo' }}</strong>
                    <span>{{ artifact.filename || 'Archivo adjunto' }}</span>
                  </div>
                </div>
                <span>{{ policy.name }}</span>
                <span class="policy-status" [class]="'status-' + policy.status">
                  {{ statusLabel(policy.status) }}
                </span>
                <span>{{ policy.createdAt | date: 'dd MMM, y' }}</span>
                <div class="row-actions">
                  <button type="button" class="btn btn-secondary" (click)="openPolicy(policy.id)">
                    <span class="material-symbols-outlined">visibility</span> Abrir
                  </button>
                  <a class="btn btn-primary" [routerLink]="['/editor']" [queryParams]="{ documentId: artifact.document_id }">
                    <span class="material-symbols-outlined">edit</span> Editar
                  </a>
                </div>
              </article>
            </ng-container>
          </ng-container>

          <ng-container *ngIf="activeTab() === 'forms'">
            <ng-container *ngFor="let policy of filteredPolicies()">
              <article class="policy-row" *ngIf="policy.form && (policy.form.questions.length > 0 || policy.form.attachments.length > 0)">
                <div class="row-name">
                  <span class="material-symbols-outlined policy-icon">dynamic_form</span>
                  <div>
                    <strong>Formulario de: {{ policy.name }}</strong>
                    <span>{{ formLabel(policy) }}</span>
                  </div>
                </div>
                <span>{{ policy.name }}</span>
                <span class="policy-status" [class]="'status-' + policy.status">
                  {{ statusLabel(policy.status) }}
                </span>
                <span>{{ policy.createdAt | date: 'dd MMM, y' }}</span>
                <div class="row-actions">
                  <button type="button" class="btn btn-secondary" (click)="openPolicy(policy.id)">
                    <span class="material-symbols-outlined">visibility</span> Abrir
                  </button>
                  <a class="btn btn-primary" [routerLink]="['/uml-designer', policy.id]" [queryParams]="{ stage: 'form' }">
                    <span class="material-symbols-outlined">edit</span> Editar
                  </a>
                </div>
              </article>
            </ng-container>
          </ng-container>
        </div>
      </section>

      <ng-template #emptyLibrary>
        <section class="empty-library glass-panel">
          <span class="material-symbols-outlined">folder_open</span>
          <h2>{{ emptyLibraryTitle() }}</h2>
          <p>{{ emptyLibraryDetail() }}</p>
          <a class="btn btn-accent" routerLink="/uml-designer">
            <span class="material-symbols-outlined">account_tree</span>
            Crear primera politica
          </a>
        </section>
      </ng-template>

      <aside class="policy-inspector glass-panel" *ngIf="selectedPolicy() as policy">
        <div class="inspector-header">
          <div>
            <span class="ed-page-kicker">Detalle de politica</span>
            <h2>{{ policy.name }}</h2>
          </div>
          <button
            type="button"
            class="icon-button"
            (click)="closePolicy()"
            aria-label="Cerrar detalle"
            title="Cerrar detalle"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <p class="inspector-description">
          {{ policy.description || 'Esta politica no tiene una descripcion registrada.' }}
        </p>

        <div class="inspector-facts">
          <span
            ><strong>Diagrama</strong>{{ policy.nodes.length }} pasos y
            {{ policy.edges.length }} uniones</span
          >
          <span><strong>Formulario</strong>{{ formLabel(policy) }}</span>
          <span><strong>Creada</strong>{{ policy.createdAt | date: 'dd MMMM, y' }}</span>
        </div>

        <section class="artifact-files" aria-label="Archivos de la politica">
          <h3>Archivos de la politica</h3>
          <a
            *ngIf="masterArtifact(policy) as masterArtifact"
            class="artifact-file"
            [routerLink]="['/editor']"
            [queryParams]="{ documentId: masterArtifact.document_id }"
          >
            <span class="material-symbols-outlined">description</span>
            <span>
              <strong>{{ masterArtifact.title }}</strong>
              <small>{{ masterArtifact.filename }}</small>
            </span>
            <span class="material-symbols-outlined artifact-action">open_in_new</span>
          </a>
          <a class="artifact-file" [routerLink]="['/uml-designer', policy.id]">
            <span class="material-symbols-outlined">account_tree</span>
            <span>
              <strong>Diagrama de actividades</strong>
              <small>{{ policy.nodes.length }} pasos y {{ policy.edges.length }} uniones</small>
            </span>
            <span class="material-symbols-outlined artifact-action">edit</span>
          </a>
          <a
            class="artifact-file"
            [routerLink]="['/uml-designer', policy.id]"
            [queryParams]="{ stage: 'form' }"
          >
            <span class="material-symbols-outlined">dynamic_form</span>
            <span>
              <strong>Formulario de solicitud</strong>
              <small>{{ formLabel(policy) }}</small>
            </span>
            <span class="material-symbols-outlined artifact-action">edit</span>
          </a>
        </section>

        <a class="btn btn-primary inspector-edit" [routerLink]="['/uml-designer', policy.id]">
          <span class="material-symbols-outlined">edit</span>
          Editar en el disenador
        </a>
      </aside>
    </div>
  `,
  styles: [
    `
      .policy-library {
        display: flex;
        flex-direction: column;
        gap: 1.2rem;
        max-width: 1480px;
        margin: 0 auto;
        padding-bottom: 1.5rem;
      }

      .library-header,
      .library-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.25rem 1.35rem;
      }

      .library-header {
        border-left: 3px solid rgba(var(--accent-rgb), 0.78);
      }

      .library-heading {
        min-width: 0;
      }

      .library-heading .ed-page-subtitle {
        max-width: 690px;
      }

      .library-toolbar {
        justify-content: flex-start;
        flex-wrap: wrap;
        padding: 0.85rem 1rem;
      }

      .search-field {
        min-width: min(100%, 310px);
        flex: 1 1 420px;
        height: 42px;
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        background: rgba(246, 241, 232, 0.035);
        color: var(--text-muted);
      }

      .search-field:focus-within {
        border-color: var(--border-hover);
        box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.1);
      }

      .search-field input,
      .status-filter select {
        min-width: 0;
        width: 100%;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--text-primary);
        font: inherit;
      }

      .search-field input::placeholder {
        color: var(--text-muted);
      }

      .status-filter {
        min-width: 162px;
        display: flex;
        align-items: center;
        gap: 0.55rem;
        color: var(--text-secondary);
        font-size: 0.78rem;
        font-weight: 760;
      }

      .status-filter select {
        min-height: 42px;
        padding: 0 0.55rem;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        background: var(--bg-tertiary);
      }

      .library-tabs {
        display: inline-flex;
        padding: 0.2rem;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        background: rgba(246, 241, 232, 0.035);
        gap: 0.25rem;
      }

      .library-tabs button {
        height: 38px;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0 1rem;
        border: 1px solid transparent;
        border-radius: var(--border-radius-sm);
        background: transparent;
        color: var(--text-secondary);
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
      }

      .icon-button {
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 1px solid transparent;
        border-radius: var(--border-radius-sm);
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
      }

      .library-tabs button.active,
      .library-tabs button:hover,
      .icon-button:hover {
        color: var(--text-primary);
        background: rgba(var(--accent-rgb), 0.13);
        border-color: var(--border-hover);
      }

      .library-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.8rem;
      }

      .sync-notice {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.7rem 0.9rem;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        color: var(--text-secondary);
        background: rgba(246, 241, 232, 0.035);
      }

      .sync-notice p {
        flex: 1;
        margin: 0;
        font-size: 0.82rem;
        font-weight: 650;
      }

      .sync-notice-error {
        border-color: rgba(210, 93, 93, 0.42);
        color: #e69a9a;
      }

      .sync-notice-warning {
        border-color: rgba(var(--accent-rgb), 0.4);
        color: var(--accent);
      }

      .summary-item {
        min-height: 74px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.85rem 1rem;
        border: 1px solid var(--border-color);
        border-left: 3px solid rgba(var(--accent-rgb), 0.62);
        border-radius: var(--border-radius-md);
        background: rgba(246, 241, 232, 0.035);
      }

      .summary-item > .material-symbols-outlined {
        color: var(--accent);
      }

      .summary-item div {
        display: flex;
        flex-direction: column;
      }

      .summary-item strong {
        font-size: 1.15rem;
      }

      .summary-item span:not(.material-symbols-outlined) {
        color: var(--text-secondary);
        font-size: 0.78rem;
        font-weight: 680;
      }

      .policy-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(305px, 1fr));
        gap: 1rem;
      }

      .policy-card {
        min-height: 280px;
        display: flex;
        flex-direction: column;
        padding: 1.1rem;
      }

      .card-topline,
      .policy-actions,
      .inspector-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .updated-at {
        color: var(--text-muted);
        font-size: 0.72rem;
        font-weight: 650;
        text-align: right;
      }

      .policy-status {
        display: inline-flex;
        width: fit-content;
        padding: 0.25rem 0.6rem;
        border: 1px solid;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 820;
      }

      .status-published {
        color: var(--success);
        background: rgba(79, 163, 107, 0.13);
        border-color: rgba(79, 163, 107, 0.28);
      }

      .status-draft {
        color: var(--warning);
        background: rgba(214, 162, 61, 0.13);
        border-color: rgba(214, 162, 61, 0.28);
      }

      .status-archived {
        color: var(--text-muted);
        background: rgba(127, 139, 153, 0.12);
        border-color: rgba(127, 139, 153, 0.23);
      }

      .policy-title-block {
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
        margin: 1.2rem 0 1rem;
      }

      .policy-icon {
        width: 38px;
        height: 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        border: 1px solid rgba(var(--accent-rgb), 0.32);
        border-radius: var(--border-radius-md);
        background: rgba(var(--primary-rgb), 0.28);
        color: var(--accent);
      }

      .policy-title-block h2,
      .inspector-header h2 {
        margin: 0;
        font-size: 1rem;
      }

      .policy-title-block p {
        display: -webkit-box;
        overflow: hidden;
        margin: 0.3rem 0 0;
        color: var(--text-secondary);
        font-size: 0.82rem;
        line-height: 1.45;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }

      .artifact-counts {
        display: grid;
        gap: 0.55rem;
        margin-top: auto;
        padding: 0.8rem 0;
        border-top: 1px solid var(--border-color);
        border-bottom: 1px solid var(--border-color);
      }

      .artifact-counts span {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        color: var(--text-secondary);
        font-size: 0.76rem;
        font-weight: 650;
      }

      .artifact-counts .material-symbols-outlined {
        color: var(--secondary);
        font-size: 1.05rem;
      }

      .policy-actions {
        justify-content: flex-end;
        margin-top: 0.9rem;
      }

      .policy-actions .btn {
        flex: 1;
      }

      .policy-table {
        overflow-x: auto;
      }

      .table-header,
      .policy-row {
        min-width: 860px;
        display: grid;
        grid-template-columns: minmax(280px, 1.8fr) minmax(180px, 1fr) 112px 140px 220px;
        align-items: center;
        gap: 0.85rem;
        padding: 0.85rem 1rem;
      }

      .table-header {
        border-bottom: 1px solid var(--border-color);
        color: var(--text-muted);
        font-size: 0.7rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      .policy-row {
        min-height: 78px;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-secondary);
        font-size: 0.78rem;
      }

      .policy-row:last-child {
        border-bottom: 0;
      }

      .policy-row:hover {
        background: rgba(var(--accent-rgb), 0.055);
      }

      .row-name {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 0.65rem;
      }

      .row-name div {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .row-name strong,
      .row-name span:not(.material-symbols-outlined) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .row-name strong {
        color: var(--text-primary);
      }

      .row-name span:not(.material-symbols-outlined) {
        color: var(--text-muted);
        font-size: 0.72rem;
      }

      .row-actions {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .empty-library {
        min-height: 330px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        text-align: center;
      }

      .empty-library > .material-symbols-outlined {
        margin-bottom: 0.75rem;
        color: var(--accent);
        font-size: 2.5rem;
      }

      .empty-library h2 {
        font-size: 1.12rem;
      }

      .empty-library p {
        max-width: 470px;
        margin: 0.45rem 0 1.15rem;
        color: var(--text-secondary);
        line-height: 1.55;
      }

      .policy-inspector {
        position: fixed;
        z-index: 40;
        right: 1.5rem;
        bottom: 1.5rem;
        width: min(410px, calc(100vw - 3rem));
        padding: 1.1rem;
        border-top: 2px solid rgba(var(--accent-rgb), 0.7);
      }

      .inspector-header {
        align-items: flex-start;
      }

      .inspector-description {
        margin: 1rem 0;
        color: var(--text-secondary);
        line-height: 1.5;
      }

      .inspector-facts {
        display: grid;
        gap: 0.6rem;
      }

      .inspector-facts span {
        display: grid;
        grid-template-columns: 92px 1fr;
        gap: 0.7rem;
        padding: 0.65rem;
        border-radius: var(--border-radius-sm);
        background: rgba(246, 241, 232, 0.035);
        color: var(--text-secondary);
        font-size: 0.78rem;
      }

      .inspector-facts strong {
        color: var(--accent);
        font-size: 0.7rem;
        text-transform: uppercase;
      }

      .inspector-edit {
        width: 100%;
        margin-top: 1rem;
      }

      .artifact-files {
        display: grid;
        gap: 0.55rem;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color);
      }

      .artifact-files h3 {
        margin: 0 0 0.15rem;
        color: var(--text-secondary);
        font-size: 0.76rem;
        text-transform: uppercase;
      }

      .artifact-file {
        min-height: 52px;
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr) 26px;
        align-items: center;
        gap: 0.6rem;
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-sm);
        background: rgba(246, 241, 232, 0.035);
        color: var(--text-primary);
      }

      .artifact-file:hover {
        border-color: var(--border-hover);
        background: rgba(var(--accent-rgb), 0.08);
      }

      .artifact-file > .material-symbols-outlined:first-child,
      .artifact-action {
        color: var(--accent);
        font-size: 1.1rem;
      }

      .artifact-file > span:nth-child(2) {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .artifact-file strong,
      .artifact-file small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .artifact-file strong {
        font-size: 0.78rem;
      }

      .artifact-file small {
        color: var(--text-muted);
        font-size: 0.7rem;
      }

      @media (max-width: 720px) {
        .library-header {
          align-items: stretch;
          flex-direction: column;
        }

        .library-header > .btn {
          width: 100%;
        }

        .status-filter {
          flex: 1;
        }

        .library-summary {
          grid-template-columns: 1fr;
        }

        .policy-grid {
          grid-template-columns: 1fr;
        }

        .policy-inspector {
          right: 0.75rem;
          bottom: 0.75rem;
          width: calc(100vw - 1.5rem);
        }
      }
    `,
  ],
})
export class PolicyLibraryComponent implements OnInit {
  readonly library = inject(PolicyLibraryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly searchQuery = signal('');
  readonly statusFilter = signal<StatusFilter>('all');
  readonly activeTab = signal<'diagrams' | 'documents' | 'forms'>('diagrams');
  readonly selectedPolicyId = signal<string | null>(null);

  readonly filteredPolicies = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();

    return this.library.policies().filter((policy) => {
      const matchesQuery =
        !query ||
        policy.name.toLowerCase().includes(query) ||
        policy.description?.toLowerCase().includes(query) ||
        false;
      const matchesStatus = status === 'all' || policy.status === status;

      return matchesQuery && matchesStatus;
    });
  });

  readonly selectedPolicy = computed(() => {
    const policyId = this.selectedPolicyId();
    return policyId ? this.library.getById(policyId) : undefined;
  });

  readonly publishedCount = computed(
    () => this.library.policies().filter((policy) => policy.status === 'published').length,
  );

  readonly formCount = computed(
    () =>
      this.library
        .policies()
        .filter((policy) => policy.form.questions.length + policy.form.attachments.length > 0)
        .length,
  );

  readonly emptyLibraryTitle = computed(() =>
    this.library.remoteState() === 'unauthorized'
      ? 'La biblioteca requiere una sesion autorizada'
      : 'Aun no hay politicas registradas',
  );

  readonly emptyLibraryDetail = computed(() =>
    this.library.remoteState() === 'unauthorized'
      ? 'Inicia sesion con una cuenta institucional que tenga acceso a politicas para cargar el catalogo del servidor.'
      : 'Cuando una politica se guarde desde el disenador, aparecera aqui con su diagrama y su formulario asociados.',
  );

  constructor() {
    this.route.paramMap.subscribe((params) => this.selectedPolicyId.set(params.get('policyId')));
  }

  ngOnInit(): void {
    this.library.refreshFromServer();
  }

  setSearchQuery(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  setStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
  }

  openPolicy(id: string): void {
    this.router.navigate(['/policies', id]);
  }

  closePolicy(): void {
    this.router.navigate(['/policies']);
  }

  statusLabel(status: BusinessPolicyStatus): string {
    const labels: Record<BusinessPolicyStatus, string> = {
      draft: 'Borrador',
      published: 'Publicada',
      archived: 'Archivada',
    };

    return labels[status];
  }

  formLabel(policy: BusinessPolicy): string {
    const totalItems = policy.form.questions.length + policy.form.attachments.length;

    return totalItems
      ? `${policy.form.questions.length} campos, ${policy.form.attachments.length} adjuntos`
      : 'Sin formulario';
  }

  masterArtifact(policy: BusinessPolicy) {
    return policy.artifacts?.find((artifact) => artifact.artifact_type === 'master_docx');
  }
}
