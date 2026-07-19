import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UmlEdgeKind, UmlLane, UmlNodeType, UmlStoreService } from './uml-store.service';

@Component({
  selector: 'app-property-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <aside class="property-panel glass-panel">
      <header class="panel-heading">
        <div>
          <span class="eyebrow">Configuracion</span>
          <h3 class="panel-title">
            <span class="material-symbols-outlined">tune</span>
            Propiedades y carriles
          </h3>
        </div>
      </header>

      <section class="connection-state" *ngIf="store.connectionSourceId()">
        <span class="material-symbols-outlined">add_link</span>
        <div>
          <strong>Conexion en curso</strong>
          <span>Elige el destino o cancela la conexion.</span>
        </div>
        <button type="button" title="Cancelar conexion" (click)="store.cancelConnection()">
          <span class="material-symbols-outlined">close</span>
        </button>
      </section>

      <section class="lane-manager" aria-label="Carriles de responsabilidad">
        <header>
          <div>
            <h4>Carriles de responsabilidad</h4>
            <span>Particiones UML por departamento</span>
          </div>
          <button
            type="button"
            class="icon-button"
            title="Agregar carril"
            (click)="store.addLane()"
          >
            <span class="material-symbols-outlined">add</span>
          </button>
        </header>
        <div class="lane-row" *ngFor="let lane of store.lanes(); trackBy: trackByLane">
          <input
            class="lane-color"
            type="color"
            [value]="lane.color || '#caa34c'"
            [attr.aria-label]="'Color de ' + lane.name"
            (change)="store.updateLane(lane.id, { color: colorValue($event) })"
          />
          <input
            class="form-control"
            type="text"
            [name]="'lane-' + lane.id"
            [ngModel]="lane.name"
            [attr.aria-label]="'Nombre del carril ' + lane.name"
            (ngModelChange)="store.updateLane(lane.id, { name: $event })"
          />
          <button
            type="button"
            class="icon-button danger"
            title="Eliminar carril"
            [disabled]="store.lanes().length === 1"
            (click)="store.deleteLane(lane.id)"
          >
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </section>

      <section class="selected-node" *ngIf="store.selectedNode() as node; else noSelection">
        <header class="section-heading">
          <h4>Elemento seleccionado</h4>
          <span>{{ nodeTypeLabel(node.type) }}</span>
        </header>
        <form class="properties-form">
          <div class="form-group">
            <label>Etiqueta</label>
            <input
              type="text"
              class="form-control"
              [ngModel]="node.label"
              [name]="'label-' + node.id"
              (ngModelChange)="store.updateNodeProperties(node.id, { label: $event })"
            />
          </div>

          <div class="form-group">
            <label>Carril responsable</label>
            <select
              class="form-control"
              [ngModel]="node.laneId"
              [name]="'lane-select-' + node.id"
              (ngModelChange)="store.moveNodeToLane(node.id, $event)"
            >
              <option *ngFor="let lane of store.lanes(); trackBy: trackByLane" [value]="lane.id">
                {{ lane.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Responsable</label>
            <input
              type="text"
              class="form-control"
              placeholder="Ej. Secretaria academica"
              [ngModel]="node.assignee"
              [name]="'assignee-' + node.id"
              (ngModelChange)="store.updateNodeProperties(node.id, { assignee: $event })"
            />
          </div>

          <div class="form-group">
            <label>Descripcion operativa</label>
            <textarea
              class="form-control textarea"
              rows="3"
              [ngModel]="node.description"
              [name]="'description-' + node.id"
              (ngModelChange)="store.updateNodeProperties(node.id, { description: $event })"
            ></textarea>
          </div>

          <div class="position-grid">
            <div class="form-group">
              <label>Posicion X</label>
              <input
                type="number"
                class="form-control"
                [ngModel]="node.x"
                [name]="'x-' + node.id"
                (ngModelChange)="store.updateNodePosition(node.id, numberValue($event), node.y)"
              />
            </div>
            <div class="form-group">
              <label>Posicion Y</label>
              <input
                type="number"
                class="form-control"
                [ngModel]="node.y"
                [name]="'y-' + node.id"
                (ngModelChange)="store.updateNodePosition(node.id, node.x, numberValue($event))"
              />
            </div>
          </div>

          <button
            class="btn btn-secondary connect-button"
            type="button"
            (click)="store.handleConnectionClick(node.id)"
          >
            <span class="material-symbols-outlined">add_link</span>
            Crear conexion desde aqui
          </button>
          <button class="btn btn-outline-danger" type="button" (click)="store.deleteNode(node.id)">
            <span class="material-symbols-outlined">delete</span>
            Eliminar elemento
          </button>
        </form>
      </section>

      <ng-template #noSelection>
        <div class="empty-state">
          <span class="material-symbols-outlined">touch_app</span>
          <p>Selecciona un elemento para editarlo. Los carriles permanecen disponibles aqui.</p>
        </div>
      </ng-template>

      <section class="edge-editor" *ngIf="store.edges().length > 0">
        <header class="section-heading">
          <h4>Conexiones</h4>
          <span>Control u objeto</span>
        </header>
        <div class="edge-row" *ngFor="let edge of store.edges(); trackBy: trackByEdge">
          <input
            class="form-control"
            placeholder="Etiqueta o guarda"
            [ngModel]="edge.label"
            [name]="'edge-label-' + edge.id"
            (ngModelChange)="store.updateEdge(edge.id, { label: $event })"
          />
          <select
            class="form-control edge-kind"
            [ngModel]="edge.kind"
            [name]="'edge-kind-' + edge.id"
            (ngModelChange)="updateEdgeKind(edge.id, $event)"
          >
            <option value="control">Control</option>
            <option value="object">Objeto</option>
          </select>
          <button
            type="button"
            class="icon-button danger"
            title="Eliminar conexion"
            (click)="store.deleteEdge(edge.id)"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </section>
    </aside>
  `,
  styles: [
    `
      .property-panel {
        width: 318px;
        min-width: 318px;
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        border: 0;
        border-left: var(--glass-border);
        border-radius: 0;
        background: var(--bg-secondary);
        overflow-y: auto;
      }

      .eyebrow {
        color: var(--accent);
        font-size: 0.6rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .panel-heading {
        padding-bottom: 0.75rem;
        border-bottom: 1px solid var(--border-color);
      }

      .panel-title {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        margin: 0.18rem 0 0;
        color: var(--text-primary);
        font-size: 0.94rem;
        font-weight: 850;

        .material-symbols-outlined {
          color: var(--accent);
          font-size: 1.1rem;
        }
      }

      .connection-state {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.7rem;
        border: 1px solid rgba(79, 163, 107, 0.28);
        border-radius: 7px;
        background: rgba(79, 163, 107, 0.1);
        color: var(--success);
        font-size: 0.72rem;

        > div {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          gap: 0.12rem;
        }

        span:not(.material-symbols-outlined) {
          color: var(--text-secondary);
        }

        button {
          width: 28px;
          height: 28px;
          border: 1px solid rgba(79, 163, 107, 0.36);
          border-radius: 6px;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }
      }

      .lane-manager,
      .selected-node,
      .edge-editor {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }

      .lane-manager {
        padding: 0.75rem;
        border: 1px solid rgba(var(--accent-rgb), 0.2);
        border-radius: 7px;
        background: rgba(var(--accent-rgb), 0.045);
      }

      .lane-manager header,
      .section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.7rem;
      }

      .lane-manager h4,
      .section-heading h4 {
        margin: 0;
        color: var(--text-primary);
        font-size: 0.78rem;
        font-weight: 850;
      }

      .lane-manager header span,
      .section-heading span {
        color: var(--text-muted);
        font-size: 0.62rem;
      }

      .lane-row {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr) 30px;
        gap: 0.35rem;
        align-items: center;
      }

      .lane-color {
        width: 28px;
        height: 32px;
        padding: 2px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: transparent;
        cursor: pointer;
      }

      .properties-form {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
      }

      .textarea {
        min-height: 82px;
        resize: vertical;
      }

      .position-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.55rem;
      }

      .connect-button,
      .btn-outline-danger {
        width: 100%;
        justify-content: center;
      }

      .btn-outline-danger {
        border-color: rgba(196, 87, 87, 0.38);
        background: rgba(196, 87, 87, 0.08);
        color: var(--danger);
      }

      .empty-state {
        min-height: 132px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        padding: 0.6rem;
        color: var(--text-muted);
        text-align: center;

        .material-symbols-outlined {
          color: var(--accent);
          font-size: 2rem;
          opacity: 0.72;
        }

        p {
          margin: 0;
          font-size: 0.72rem;
          line-height: 1.35;
        }
      }

      .edge-editor {
        padding-top: 0.9rem;
        border-top: 1px dashed var(--border-color);
      }

      .edge-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 82px 30px;
        gap: 0.35rem;
        align-items: center;
      }

      .edge-kind {
        padding-right: 0.25rem;
        font-size: 0.68rem;
      }

      .icon-button {
        width: 30px;
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: rgba(var(--primary-rgb), 0.24);
        color: var(--accent);
        cursor: pointer;

        &:disabled {
          cursor: not-allowed;
          opacity: 0.38;
        }

        .material-symbols-outlined {
          font-size: 1rem;
        }
      }

      .icon-button.danger {
        border-color: rgba(196, 87, 87, 0.32);
        background: rgba(196, 87, 87, 0.08);
        color: var(--danger);
      }

      @media (max-width: 1600px) {
        .property-panel {
          width: 100%;
          min-width: 0;
          height: auto;
          max-height: none;
          border-top: var(--glass-border);
          border-left: 0;
        }

        .lane-manager {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-items: end;
        }

        .lane-manager header {
          grid-column: 1 / -1;
        }

        .selected-node,
        .edge-editor {
          max-width: 720px;
        }
      }

      @media (max-width: 720px) {
        .property-panel {
          padding: 0.75rem;
        }

        .lane-manager {
          grid-template-columns: 1fr;
        }

        .lane-manager header {
          grid-column: auto;
        }

        .edge-row {
          grid-template-columns: minmax(0, 1fr) 76px 30px;
        }
      }
    `,
  ],
})
export class PropertyPanelComponent {
  readonly store = inject(UmlStoreService);

  colorValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  numberValue(value: string | number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  updateEdgeKind(id: string, value: string): void {
    const kind: UmlEdgeKind = value === 'object' ? 'object' : 'control';
    this.store.updateEdge(id, { kind });
  }

  nodeTypeLabel(type: UmlNodeType): string {
    const labels: Record<UmlNodeType, string> = {
      start: 'Nodo inicial',
      end: 'Final de actividad',
      flowFinal: 'Final de flujo',
      activity: 'Accion',
      callAction: 'Llamar actividad',
      acceptEvent: 'Aceptar evento',
      sendSignal: 'Enviar senal',
      decision: 'Decision',
      merge: 'Merge',
      fork: 'Fork',
      join: 'Join',
      object: 'Nodo objeto',
      dataStore: 'Almacen de datos',
    };
    return labels[type];
  }

  trackByLane(_index: number, lane: UmlLane): string {
    return lane.id;
  }

  trackByEdge(_index: number, edge: { id: string }): string {
    return edge.id;
  }
}
