import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ElementPaletteComponent } from './element-palette.component';
import { ExportDialogComponent } from './export-dialog.component';
import { PolicyFormBuilderComponent } from './policy-form-builder.component';
import { PropertyPanelComponent } from './property-panel.component';
import { UmlCanvasComponent } from './uml-canvas.component';
import { UmlStoreService } from './uml-store.service';
import { PolicyCollaborationService } from '../../core/services/policy-collaboration.service';

@Component({
  selector: 'app-uml-designer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ElementPaletteComponent,
    UmlCanvasComponent,
    PropertyPanelComponent,
    ExportDialogComponent,
    PolicyFormBuilderComponent,
  ],
  template: `
    <div class="designer-layout">
      <ng-container *ngIf="store.stage() === 'diagram'; else formStage">
        <header class="designer-toolbar glass-panel">
          <div class="toolbar-left">
            <span class="material-symbols-outlined brand-mark">schema</span>
            <div>
              <span class="ed-page-kicker">EASYDOC Workflow Studio</span>
              <h2>Disenador de actividades UML</h2>
            </div>
          </div>

          <label class="process-name">
            Nombre del proceso
            <input
              type="text"
              class="form-control"
              placeholder="Ej. Casos especiales academicos"
              [ngModel]="store.processName()"
              (ngModelChange)="store.setProcessName($event)"
            />
          </label>

          <div class="toolbar-center">
            <span class="editor-status" [class.live]="collaboration.isConnected()">
              <span class="presence-dot" aria-hidden="true"></span>
              <span class="material-symbols-outlined">groups</span>
              <strong>{{ collaboration.remoteCollaboratorCount() }}</strong>
              <span>colaborador(es) activo(s)</span>
            </span>
            <span
              class="sync-status"
              [class.error]="collaboration.persistenceError()"
              *ngIf="collaboration.lastPersistedAt() || collaboration.persistenceError()"
            >
              <span class="material-symbols-outlined">
                {{ collaboration.persistenceError() ? 'sync_problem' : 'cloud_done' }}
              </span>
              {{ collaboration.persistenceError() || 'Cambios sincronizados' }}
            </span>
          </div>

          <div class="toolbar-right">
            <button class="btn btn-secondary" type="button" (click)="showExport = true">
              <span class="material-symbols-outlined">download</span>
              Exportar
            </button>
            <button
              class="btn btn-secondary"
              type="button"
              [disabled]="!store.canRegisterPolicy()"
              (click)="saveDiagram()"
            >
              <span class="material-symbols-outlined">save</span>
              Guardar diagrama
            </button>
            <button
              class="btn btn-primary"
              type="button"
              [disabled]="!store.canRegisterPolicy()"
              (click)="store.registerPolicy()"
            >
              <span class="material-symbols-outlined">app_registration</span>
              Registrar politica
            </button>
          </div>
        </header>

        <div
          class="flow-alert"
          *ngIf="store.saveState().message"
          [ngClass]="store.saveState().status"
        >
          <span class="material-symbols-outlined">
            {{ store.saveState().status === 'error' ? 'error' : 'info' }}
          </span>
          {{ store.saveState().message }}
        </div>

        <main class="designer-workspace">
          <app-element-palette></app-element-palette>
          <app-uml-canvas></app-uml-canvas>
          <app-property-panel></app-property-panel>
        </main>
      </ng-container>

      <ng-template #formStage>
        <app-policy-form-builder></app-policy-form-builder>
      </ng-template>

      <app-export-dialog *ngIf="showExport" (close)="showExport = false"></app-export-dialog>
    </div>
  `,
  styles: [
    `
      .designer-layout {
        display: flex;
        flex-direction: column;
        min-height: calc(100vh - 8rem);
        width: 100%;
        min-width: 0;
      }

      .designer-toolbar {
        min-height: 84px;
        display: grid;
        grid-template-columns: minmax(220px, 1fr) minmax(250px, 1.05fr) auto auto;
        align-items: center;
        gap: 1rem;
        padding: 0.85rem 1.25rem;
        border-radius: 0;
        border-bottom: var(--glass-border);
        background:
          linear-gradient(90deg, rgba(var(--accent-rgb), 0.08), transparent 54%),
          var(--bg-secondary);
        flex-shrink: 0;
        z-index: 10;
      }

      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        min-width: 0;

        h2 {
          margin: 0.15rem 0 0;
          font-size: 1.22rem;
          font-weight: 850;
        }
      }

      .brand-mark {
        width: 42px;
        height: 42px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--accent);
        background: rgba(var(--accent-rgb), 0.11);
        border: 1px solid rgba(var(--accent-rgb), 0.22);
      }

      .process-name {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        color: var(--text-secondary);
        font-size: 0.74rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .toolbar-center {
        display: flex;
        align-items: center;
        gap: 1rem;
        justify-content: center;

        .editor-status {
          position: relative;
          font-size: 0.85rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;

          .material-symbols-outlined {
            color: var(--text-muted);
            font-size: 1.1rem;
          }

          strong {
            color: var(--text-primary);
            font-size: 0.9rem;
          }

          &.live .material-symbols-outlined {
            color: var(--success);
          }
        }

        .presence-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--text-muted);

          .live & {
            background: var(--success);
            box-shadow: 0 0 0 4px rgba(79, 163, 107, 0.12);
          }
        }

        .sync-status {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          color: var(--success);
          font-size: 0.72rem;
          font-weight: 800;
          white-space: nowrap;

          .material-symbols-outlined {
            color: currentColor;
            font-size: 1rem;
          }

          &.error {
            color: var(--danger);
          }
        }
      }

      .toolbar-right {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
      }

      .flow-alert {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        min-height: 42px;
        padding: 0.65rem 1.25rem;
        border-bottom: 1px solid var(--border-color);
        background: rgba(var(--primary-rgb), 0.2);
        color: var(--text-secondary);

        &.error {
          color: var(--danger);
          background: rgba(196, 87, 87, 0.1);
        }
      }

      .designer-workspace {
        flex: 1;
        min-height: 620px;
        display: grid;
        grid-template-columns: 250px minmax(0, 1fr) 318px;
        overflow: hidden;
      }

      app-uml-canvas {
        min-width: 0;
        min-height: 0;
        display: flex;
      }

      @media (max-width: 1600px) {
        .designer-layout {
          min-height: 0;
        }

        .designer-workspace {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          grid-template-rows: auto minmax(620px, 1fr) auto;
          min-height: 0;
          overflow: visible;
        }

        app-uml-canvas {
          min-height: 680px;
        }
      }

      @media (max-width: 1180px) {
        .designer-toolbar {
          grid-template-columns: 1fr 1fr;
        }

        .toolbar-center,
        .toolbar-right {
          justify-content: flex-start;
        }
      }

      @media (max-width: 720px) {
        .designer-toolbar {
          grid-template-columns: minmax(0, 1fr);
          gap: 0.75rem;
          padding: 0.8rem;
        }

        .toolbar-right {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .toolbar-right .btn {
          justify-content: center;
        }

        .toolbar-center {
          justify-content: flex-start;
        }

        .designer-workspace {
          grid-template-rows: auto minmax(520px, 1fr) auto;
        }

        app-uml-canvas {
          min-height: 560px;
        }

        .flow-alert {
          padding: 0.65rem 0.8rem;
          font-size: 0.8rem;
        }
      }
    `,
  ],
})
export class UmlDesignerComponent implements OnInit {
  store = inject(UmlStoreService);
  collaboration = inject(PolicyCollaborationService);
  private route = inject(ActivatedRoute);
  showExport = false;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const policyId = this.route.snapshot.paramMap.get('policyId') ?? params.get('policyId');
      if (policyId)
        this.store.loadPolicy(policyId, params.get('stage') === 'form' ? 'form' : 'diagram');
    });

    this.route.paramMap.subscribe((params) => {
      const policyId = params.get('policyId');
      if (policyId) {
        this.store.loadPolicy(
          policyId,
          this.route.snapshot.queryParamMap.get('stage') === 'form' ? 'form' : 'diagram',
        );
      }
    });
  }

  saveDiagram(): void {
    this.store.savePolicy().subscribe();
  }
}
