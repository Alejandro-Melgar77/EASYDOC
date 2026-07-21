import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UmlNodeType, UmlStoreService } from './uml-store.service';

interface PaletteItem {
  type: UmlNodeType;
  label: string;
  hint: string;
}

interface PaletteGroup {
  label: string;
  items: PaletteItem[];
}

@Component({
  selector: 'app-element-palette',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="palette glass-panel">
      <header class="palette-header">
        <div>
          <span class="eyebrow">UML 2.5+</span>
          <h3 class="palette-title">
            <span class="material-symbols-outlined">account_tree</span>
            Elementos de actividad
          </h3>
        </div>
        <button class="mini-action" type="button" title="Agregar carril" (click)="store.addLane()">
          <span class="material-symbols-outlined">view_stream</span>
        </button>
      </header>

      <div class="palette-scroll">
        <section class="palette-group" *ngFor="let group of paletteGroups">
          <h4>{{ group.label }}</h4>
          <div class="palette-grid">
            <button
              type="button"
              class="palette-item"
              *ngFor="let item of group.items"
              draggable="true"
              [class.active]="store.selectedPaletteType() === item.type"
              [attr.aria-label]="item.label + ': ' + item.hint"
              [title]="item.hint"
              (click)="store.selectPaletteType(item.type)"
              (dragstart)="startDrag($event, item)"
            >
              <span class="uml-symbol" [ngClass]="item.type" aria-hidden="true">
                <span class="symbol-core"></span>
              </span>
              <span class="item-label">{{ item.label }}</span>
              <small>{{ item.hint }}</small>
            </button>
          </div>
        </section>

        <section class="palette-group flow-reference" aria-label="Flujo de control UML">
          <h4>Conexiones</h4>
          <div class="flow-key">
            <span class="flow-arrow" aria-hidden="true"></span>
            <div>
              <strong>Flujo de control</strong>
              <small>Flecha solida UML</small>
            </div>
          </div>
        </section>
      </div>
    </aside>
  `,
  styles: [
    `
      .palette {
        width: 258px;
        min-width: 258px;
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        padding: 1rem;
        border: 0;
        border-right: var(--glass-border);
        border-radius: 0;
        background:
          linear-gradient(180deg, rgba(var(--accent-rgb), 0.07), transparent 280px),
          var(--bg-secondary);
      }

      .palette-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.65rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid var(--border-color);
      }

      .eyebrow {
        color: var(--accent);
        font-size: 0.6rem;
        font-weight: 900;
      }

      .palette-title {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        margin: 0.2rem 0 0;
        color: var(--text-primary);
        font-size: 0.92rem;
        font-weight: 850;
      }

      .palette-title .material-symbols-outlined {
        color: var(--accent);
        font-size: 1.1rem;
      }

      .mini-action {
        width: 34px;
        height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(var(--accent-rgb), 0.35);
        border-radius: 7px;
        background: rgba(var(--accent-rgb), 0.1);
        color: var(--accent);
        cursor: pointer;
      }

      .palette-scroll {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        gap: 0.9rem;
        overflow-y: auto;
        padding-right: 0.15rem;
      }

      .palette-group h4 {
        margin: 0 0 0.45rem;
        color: var(--text-muted);
        font-size: 0.63rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .palette-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.45rem;
      }

      .palette-item {
        min-height: 112px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.32rem;
        padding: 0.55rem 0.35rem;
        border: 1px solid var(--border-color);
        border-radius: 7px;
        background: rgba(var(--primary-rgb), 0.18);
        color: var(--text-primary);
        cursor: grab;
        text-align: center;
        transition: var(--transition-fast);
      }

      .palette-item:hover,
      .palette-item.active {
        border-color: rgba(var(--accent-rgb), 0.68);
        background: rgba(var(--accent-rgb), 0.12);
        transform: translateY(-1px);
      }

      .palette-item:active {
        cursor: grabbing;
      }

      .uml-symbol {
        position: relative;
        width: 48px;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #f6f1e8;
      }

      .uml-symbol.start,
      .uml-symbol.flowFinal {
        width: 30px;
        height: 30px;
        border: 2px solid #05080d;
        border-radius: 50%;
        background: #05080d;
      }

      .uml-symbol.end {
        width: 30px;
        height: 30px;
        border: 2px solid #f6f1e8;
        border-radius: 50%;
      }

      .uml-symbol.end::after {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #05080d;
        content: '';
      }

      .uml-symbol.flowFinal {
        border-color: #d26f6f;
        background: transparent;
      }

      .uml-symbol.flowFinal::after {
        color: #d26f6f;
        content: 'x';
        font-size: 1.2rem;
        font-weight: 900;
      }

      .uml-symbol.activity,
      .uml-symbol.callAction,
      .uml-symbol.acceptEvent,
      .uml-symbol.sendSignal {
        width: 52px;
        height: 30px;
        border: 2px solid #caa34c;
        border-radius: 9px;
        background: #17334a;
      }

      .uml-symbol.callAction {
        border-width: 4px;
      }

      .uml-symbol.acceptEvent {
        border-color: #58a6aa;
        background: #15323b;
      }

      .uml-symbol.sendSignal {
        border-color: #b399da;
        background: #302c43;
      }

      .uml-symbol.decision,
      .uml-symbol.merge {
        width: 31px;
        height: 31px;
        border: 2px solid #d8ae3d;
        background: #143246;
        transform: rotate(45deg);
      }

      .uml-symbol.merge {
        border-color: #79aeb2;
        background: #203142;
      }

      .uml-symbol.fork,
      .uml-symbol.join {
        width: 54px;
        height: 8px;
        border-radius: 1px;
        background: #05080d;
      }

      .uml-symbol.object {
        width: 46px;
        height: 30px;
        border: 2px solid #8ca3c0;
        background: #202b40;
      }

      .uml-symbol.object::after {
        position: absolute;
        top: -2px;
        right: -2px;
        width: 11px;
        height: 11px;
        border-bottom: 2px solid #8ca3c0;
        border-left: 2px solid #8ca3c0;
        background: var(--bg-secondary);
        content: '';
      }

      .uml-symbol.dataStore {
        width: 48px;
        height: 28px;
        border: 2px solid #87b7bd;
        border-radius: 50% / 22%;
        background: #1c4050;
      }

      .uml-symbol.dataStore::before,
      .uml-symbol.dataStore::after {
        position: absolute;
        right: 4px;
        left: 4px;
        height: 7px;
        border: 1px solid #87b7bd;
        border-radius: 50%;
        content: '';
      }

      .uml-symbol.dataStore::before {
        top: 3px;
      }

      .uml-symbol.dataStore::after {
        bottom: 3px;
      }

      .item-label {
        font-size: 0.7rem;
        font-weight: 850;
        line-height: 1.1;
      }

      .palette-item small,
      .flow-key small {
        color: var(--text-muted);
        font-size: 0.58rem;
        line-height: 1.18;
      }

      .flow-key {
        min-height: 58px;
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.6rem;
        border: 1px solid rgba(var(--accent-rgb), 0.24);
        border-radius: 7px;
        background: rgba(var(--accent-rgb), 0.055);
      }

      .flow-key > div {
        display: flex;
        flex-direction: column;
        gap: 0.14rem;
      }

      .flow-key strong {
        color: var(--text-primary);
        font-size: 0.7rem;
      }

      .flow-arrow {
        position: relative;
        width: 54px;
        height: 3px;
        flex: 0 0 auto;
        background: #d5ab3d;
      }

      .flow-arrow::after {
        position: absolute;
        top: -5px;
        right: -1px;
        width: 0;
        height: 0;
        border-top: 6px solid transparent;
        border-bottom: 6px solid transparent;
        border-left: 10px solid #d5ab3d;
        content: '';
      }

      @media (max-width: 1600px) {
        .palette {
          width: 100%;
          min-width: 0;
          height: auto;
          border-right: 0;
          border-bottom: var(--glass-border);
        }

        .palette-header {
          align-items: center;
        }

        .palette-scroll {
          flex-direction: row;
          overflow-x: auto;
          overflow-y: hidden;
          padding-bottom: 0.2rem;
        }

        .palette-group {
          width: 312px;
          flex: 0 0 312px;
        }
      }

      @media (max-width: 720px) {
        .palette {
          padding: 0.75rem;
        }

        .palette-group {
          width: 274px;
          flex-basis: 274px;
        }

        .palette-item {
          min-height: 102px;
        }
      }
    `,
  ],
})
export class ElementPaletteComponent {
  readonly store = inject(UmlStoreService);

  readonly paletteGroups: PaletteGroup[] = [
    {
      label: 'Inicio y cierre',
      items: [
        { type: 'start', label: 'Nodo inicial', hint: 'Circulo negro solido' },
        { type: 'end', label: 'Final actividad', hint: 'Diana de cierre total' },
        { type: 'flowFinal', label: 'Final de flujo', hint: 'Cierra una ruta' },
      ],
    },
    {
      label: 'Acciones y eventos',
      items: [
        { type: 'activity', label: 'Accion', hint: 'Rectangulo redondeado' },
        { type: 'callAction', label: 'Llamar actividad', hint: 'Subproceso reutilizable' },
        { type: 'acceptEvent', label: 'Aceptar evento', hint: 'Espera una senal' },
        { type: 'sendSignal', label: 'Enviar senal', hint: 'Notifica a otro flujo' },
      ],
    },
    {
      label: 'Control del flujo',
      items: [
        { type: 'decision', label: 'Decision', hint: 'Rombo con guardas' },
        { type: 'merge', label: 'Merge', hint: 'Rombo de alternativas' },
        { type: 'fork', label: 'Fork', hint: 'Barra de trabajo paralelo' },
        { type: 'join', label: 'Join', hint: 'Barra de sincronizacion' },
      ],
    },
    {
      label: 'Datos',
      items: [
        { type: 'object', label: 'Nodo objeto', hint: 'Documento o dato' },
        { type: 'dataStore', label: 'Almacen de datos', hint: 'Repositorio persistente' },
      ],
    },
  ];

  startDrag(event: DragEvent, item: PaletteItem): void {
    this.store.selectPaletteType(item.type);
    event.dataTransfer?.setData('application/x-easydoc-uml', item.type);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
  }
}
