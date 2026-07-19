import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import {
  Cell,
  CellOverlay,
  ConnectionHandler,
  Graph,
  ImageBox,
  InternalEvent,
  type CellStyle,
  type EventObject,
} from '@maxgraph/core';
import { UmlEdge, UmlLane, UmlNode, UmlNodeType, UmlStoreService } from './uml-store.service';

const lanePrefix = 'lane:';
const edgePrefix = 'edge:';
const terminalTypes = new Set<UmlNodeType>(['start', 'end', 'flowFinal']);
const sourceRestrictedTypes = new Set<UmlNodeType>(['end', 'flowFinal']);
const connectionPortImage = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="#102b42" stroke="#d5ab3d" stroke-width="2"/><path d="M9 14h8m-3-4 4 4-4 4" fill="none" stroke="#f6f1e8" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
)}`;
const umlNodeTypes: readonly UmlNodeType[] = [
  'start',
  'end',
  'flowFinal',
  'activity',
  'callAction',
  'acceptEvent',
  'sendSignal',
  'decision',
  'merge',
  'fork',
  'join',
  'object',
  'dataStore',
];

@Component({
  selector: 'app-uml-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="diagram-shell" (keydown)="onKeyDown($event)" tabindex="0">
      <header class="diagram-toolbar" aria-label="Herramientas del diagrama">
        <div class="toolbar-group lane-count">
          <span class="material-symbols-outlined">view_stream</span>
          <strong>{{ store.lanes().length }}</strong>
          <span>Carriles</span>
        </div>
        <button type="button" class="toolbar-icon" title="Agregar carril" (click)="store.addLane()">
          <span class="material-symbols-outlined">add_chart</span>
        </button>
        <button
          type="button"
          class="toolbar-icon"
          title="Crear flujo desde el elemento seleccionado"
          aria-label="Crear flujo desde el elemento seleccionado"
          (click)="beginSelectedConnection()"
        >
          <span class="material-symbols-outlined">arrow_right_alt</span>
        </button>
        <span class="toolbar-divider" aria-hidden="true"></span>
        <button type="button" class="toolbar-icon" title="Acercar" (click)="zoomIn()">
          <span class="material-symbols-outlined">zoom_in</span>
        </button>
        <button type="button" class="toolbar-icon" title="Alejar" (click)="zoomOut()">
          <span class="material-symbols-outlined">zoom_out</span>
        </button>
        <button type="button" class="toolbar-icon" title="Tamaño real" (click)="zoomActual()">
          <span class="material-symbols-outlined">center_focus_strong</span>
        </button>
      </header>

      <div class="diagram-viewport" #viewport aria-label="Lienzo UML 2.5 de actividades">
        <div
          class="diagram-surface"
          [style.width.px]="store.canvasSize().width"
          [style.height.px]="store.canvasSize().height"
        >
          <div #graphHost class="maxgraph-host"></div>
        </div>
      </div>

      <aside class="ai-suggestion" *ngIf="store.aiSuggestion() as suggestion">
        <div>
          <span class="ai-kicker">Sugerencia local</span>
          <strong>{{ suggestion.title }}</strong>
          <small>{{ suggestion.confidence }}% de coincidencia con politicas previas</small>
        </div>
        <button
          type="button"
          class="tab-pill"
          title="Aplicar sugerencia"
          (click)="acceptSuggestion()"
        >
          Tab
        </button>
      </aside>

      <span
        class="connection-cue"
        title="Las flechas unen directamente origen y destino. Usa Join solo para sincronizar ramas paralelas."
      >
        <span class="material-symbols-outlined">account_tree</span>
      </span>
    </section>
  `,
  styles: [
    `
      .diagram-shell {
        position: relative;
        display: flex;
        min-width: 0;
        min-height: 560px;
        flex: 1 1 auto;
        overflow: hidden;
        background: #091523;
        outline: none;
      }

      .diagram-viewport {
        width: 100%;
        height: 100%;
        overflow: auto;
        scrollbar-color: rgba(var(--accent-rgb), 0.58) rgba(var(--primary-rgb), 0.28);
        scrollbar-width: thin;
      }

      .diagram-surface {
        position: relative;
        min-width: 100%;
        min-height: 100%;
        background-color: #0b1624;
        background-image:
          linear-gradient(to right, rgba(246, 241, 232, 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(246, 241, 232, 0.05) 1px, transparent 1px);
        background-size: 24px 24px;
      }

      .maxgraph-host {
        width: 100%;
        height: 100%;
        outline: none;
      }

      .diagram-toolbar {
        position: absolute;
        z-index: 20;
        top: 0.75rem;
        left: 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.35rem;
        border: 1px solid rgba(201, 163, 76, 0.36);
        border-radius: 8px;
        background: rgba(7, 16, 27, 0.94);
      }

      .toolbar-group {
        display: inline-flex;
        min-height: 30px;
        align-items: center;
        gap: 0.35rem;
        padding: 0 0.35rem;
        color: var(--text-secondary);
        font-size: 0.72rem;
        font-weight: 800;
      }

      .lane-count .material-symbols-outlined,
      .lane-count strong {
        color: var(--accent);
      }

      .toolbar-icon {
        width: 30px;
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid transparent;
        border-radius: 6px;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
      }

      .toolbar-icon:hover {
        border-color: rgba(var(--accent-rgb), 0.46);
        background: rgba(var(--accent-rgb), 0.12);
        color: var(--accent);
      }

      .toolbar-icon .material-symbols-outlined {
        font-size: 1.05rem;
      }

      .toolbar-divider {
        width: 1px;
        height: 22px;
        margin: 0 0.1rem;
        background: var(--border-color);
      }

      .ai-suggestion {
        position: absolute;
        z-index: 20;
        top: 0.75rem;
        right: 0.75rem;
        width: min(390px, calc(100% - 15rem));
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.7rem;
        padding: 0.62rem 0.72rem;
        border: 1px solid rgba(var(--accent-rgb), 0.28);
        border-radius: 8px;
        background: rgba(7, 16, 27, 0.94);
        box-shadow: 0 16px 34px -24px rgba(0, 0, 0, 0.82);
      }

      .ai-suggestion > div {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 0.1rem;
      }

      .ai-suggestion strong,
      .ai-suggestion small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ai-suggestion strong {
        font-size: 0.8rem;
      }

      .ai-suggestion small {
        color: var(--text-secondary);
        font-size: 0.66rem;
      }

      .ai-kicker {
        color: var(--accent);
        font-size: 0.6rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .tab-pill {
        width: 44px;
        height: 32px;
        flex: 0 0 auto;
        border: 1px solid rgba(var(--accent-rgb), 0.5);
        border-radius: 6px;
        background: var(--accent);
        color: #101827;
        cursor: pointer;
        font-size: 0.72rem;
        font-weight: 900;
      }

      .connection-cue {
        position: absolute;
        z-index: 20;
        right: 0.75rem;
        bottom: 0.75rem;
        width: 34px;
        height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(var(--accent-rgb), 0.38);
        border-radius: 50%;
        background: rgba(7, 16, 27, 0.94);
        color: var(--accent);
      }

      @media (max-width: 720px) {
        .diagram-shell {
          min-height: 520px;
        }

        .ai-suggestion {
          top: auto;
          right: 0.65rem;
          bottom: 0.65rem;
          width: min(310px, calc(100% - 4.8rem));
        }

        .connection-cue {
          right: 0.65rem;
          bottom: 0.65rem;
        }

        .lane-count span:last-child {
          display: none;
        }
      }
    `,
  ],
})
export class UmlCanvasComponent implements AfterViewInit, OnDestroy {
  readonly store = inject(UmlStoreService);

  @ViewChild('graphHost') private graphHost!: ElementRef<HTMLDivElement>;
  @ViewChild('viewport') private viewport!: ElementRef<HTMLDivElement>;

  private graph: Graph | null = null;
  private isRendering = false;

  private readonly graphSync = effect(() => {
    this.store.lanes();
    this.store.nodes();
    this.store.edges();
    this.store.selectedNode();
    this.renderGraph();
  });

  ngAfterViewInit(): void {
    const host = this.graphHost.nativeElement;
    InternalEvent.disableContextMenu(host);

    this.graph = new Graph(host);
    this.graph.getView().setAllowEval(false);
    this.graph.setConnectable(true);
    this.graph.setAllowDanglingEdges(false);
    this.graph.setCellsResizable(false);
    this.graph.setCellsBendable(true);
    this.graph.setGridEnabled(true);
    this.graph.setGridSize(12);
    this.graph.setPanning(false);
    this.configureGraphCapabilities();
    this.bindGraphEvents();

    host.addEventListener('dragover', this.handleNativeDragOver);
    host.addEventListener('drop', this.handleNativeDrop);
    this.renderGraph();
  }

  ngOnDestroy(): void {
    this.graphSync.destroy();
    this.graphHost?.nativeElement.removeEventListener('dragover', this.handleNativeDragOver);
    this.graphHost?.nativeElement.removeEventListener('drop', this.handleNativeDrop);
    this.graph?.destroy();
    this.graph = null;
  }

  zoomIn(): void {
    this.graph?.zoomIn();
  }

  zoomOut(): void {
    this.graph?.zoomOut();
  }

  zoomActual(): void {
    this.graph?.zoomActual();
  }

  acceptSuggestion(): void {
    this.store.acceptSuggestion();
  }

  beginSelectedConnection(): void {
    const selected = this.store.selectedNode();
    if (selected && !sourceRestrictedTypes.has(selected.type)) {
      this.store.beginConnection(selected.id);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Tab' && this.store.aiSuggestion()) {
      event.preventDefault();
      this.acceptSuggestion();
      return;
    }

    if (event.key === 'Escape') {
      this.store.cancelConnection();
      this.store.selectPaletteType(null);
      return;
    }

    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    const cell = this.graph?.getSelectionCell();
    if (!cell) return;

    if (this.isNodeCell(cell)) this.store.deleteNode(cell.getId() ?? '');
    else if (cell.isEdge()) this.store.deleteEdge(this.edgeIdFromCell(cell));
    else return;

    event.preventDefault();
  }

  private configureGraphCapabilities(): void {
    if (!this.graph) return;

    this.graph.isCellMovable = (cell: Cell): boolean => this.isNodeCell(cell);
    this.graph.isCellResizable = (): boolean => false;
    this.graph.isCellSelectable = (cell: Cell): boolean => this.isNodeCell(cell) || cell.isEdge();
    this.graph.isCellDeletable = (cell: Cell): boolean => this.isNodeCell(cell) || cell.isEdge();
    this.graph.isCellEditable = (cell: Cell): boolean => {
      const node = this.nodeFromCell(cell);
      return Boolean(node && !terminalTypes.has(node.type));
    };
    this.graph.isValidSource = (cell: Cell | null): boolean => {
      const node = this.nodeFromCell(cell);
      return Boolean(node && !sourceRestrictedTypes.has(node.type));
    };
    this.graph.isValidTarget = (cell: Cell | null): boolean => Boolean(this.nodeFromCell(cell));

    const connectionHandler = this.graph.getPlugin<ConnectionHandler>(ConnectionHandler.pluginId);
    if (connectionHandler) connectionHandler.createTarget = false;
  }

  private bindGraphEvents(): void {
    if (!this.graph) return;

    this.graph.addListener(InternalEvent.CLICK, (_sender: unknown, event: EventObject) => {
      if (this.isRendering) return;
      const cell = this.eventCell(event);
      if (cell && this.isNodeCell(cell)) {
        this.handleNodeSelection(cell.getId() ?? '');
        return;
      }

      const nativeEvent = event.getProperty('event') as MouseEvent | undefined;
      if (nativeEvent) this.createSelectedPaletteNode(nativeEvent);
      else this.store.selectNode(null);
    });

    this.graph.addListener(InternalEvent.CELLS_MOVED, (_sender: unknown, event: EventObject) => {
      if (this.isRendering) return;
      const cells = event.getProperty('cells') as Cell[] | undefined;
      cells?.forEach((cell) => {
        if (!this.isNodeCell(cell)) return;
        const geometry = cell.getGeometry();
        const id = cell.getId();
        if (geometry && id) this.store.updateNodePosition(id, geometry.x, geometry.y);
      });
    });

    this.graph.addListener(InternalEvent.LABEL_CHANGED, (_sender: unknown, event: EventObject) => {
      if (this.isRendering) return;
      const cell = this.eventCell(event);
      if (!cell) return;
      const value = String(cell.getValue() ?? '').trim();
      if (this.isNodeCell(cell) && value)
        this.store.updateNodeProperties(cell.getId() ?? '', { label: value });
      else if (cell.isEdge()) this.store.updateEdge(this.edgeIdFromCell(cell), { label: value });
    });

    const connectionHandler = this.graph.getPlugin<ConnectionHandler>(ConnectionHandler.pluginId);
    connectionHandler?.addListener(
      InternalEvent.CONNECT,
      (_sender: unknown, event: EventObject) => {
        if (this.isRendering || !this.graph) return;
        const edge = this.eventCell(event);
        if (!edge) return;
        const source = edge.getTerminal(true);
        const target = edge.getTerminal(false);
        const sourceId = source?.getId();
        const targetId = target?.getId();
        if (sourceId && targetId && this.isNodeCell(source) && this.isNodeCell(target)) {
          this.store.addEdge(sourceId, targetId);
        }
      },
    );
  }

  private readonly handleNativeDragOver = (event: DragEvent): void => {
    if (!event.dataTransfer?.types.includes('application/x-easydoc-uml')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  private readonly handleNativeDrop = (event: DragEvent): void => {
    const type = event.dataTransfer?.getData('application/x-easydoc-uml');
    if (!type || !this.isUmlNodeType(type) || !this.graph) return;
    event.preventDefault();
    const point = this.graph.getPointForEvent(event);
    this.store.addNodeFromPalette(type, point.x, point.y);
  };

  private createSelectedPaletteNode(event: MouseEvent): void {
    const selectedType = this.store.selectedPaletteType();
    if (!selectedType || !this.graph) {
      this.store.selectNode(null);
      return;
    }
    const point = this.graph.getPointForEvent(event);
    this.store.addNodeFromPalette(selectedType, point.x, point.y);
  }

  private handleNodeSelection(nodeId: string): void {
    const sourceId = this.store.connectionSourceId();
    if (sourceId && sourceId !== nodeId) {
      this.store.addEdge(sourceId, nodeId);
      this.store.cancelConnection();
    } else if (sourceId === nodeId) {
      this.store.cancelConnection();
    }
    this.store.selectNode(nodeId);
  }

  private renderGraph(): void {
    const graph = this.graph;
    if (!graph || this.isRendering) return;

    this.isRendering = true;
    try {
      const selectedId = this.store.selectedNode()?.id;
      const size = this.store.canvasSize();
      const cells = new Map<string, Cell>();

      graph.batchUpdate(() => {
        graph.getDataModel().clear();
        const parent = graph.getDefaultParent();

        this.store.lanes().forEach((lane) => {
          const laneCell = graph.insertVertex({
            parent,
            id: `${lanePrefix}${lane.id}`,
            value: lane.name,
            position: [0, this.store.getLaneTop(lane.id)],
            size: [size.width, 184],
            style: this.laneStyle(lane),
          });
          laneCell.setConnectable(false);
        });

        this.store.nodes().forEach((node) => {
          const dimensions = this.store.getNodeSize(node.type);
          const cell = graph.insertVertex({
            parent,
            id: node.id,
            value:
              terminalTypes.has(node.type) || node.type === 'fork' || node.type === 'join'
                ? ''
                : node.label,
            position: [node.x, node.y],
            size: [dimensions.width, dimensions.height],
            style: this.nodeStyle(node),
          });
          cells.set(node.id, cell);
          this.addConnectionPort(cell, node);
        });

        this.store.edges().forEach((edge) => {
          const source = cells.get(edge.from);
          const target = cells.get(edge.to);
          if (!source || !target) return;
          graph.insertEdge({
            parent,
            id: `${edgePrefix}${edge.id}`,
            value: edge.label,
            source,
            target,
            style: this.edgeStyle(edge),
          });
        });
      });

      const selected = selectedId ? cells.get(selectedId) : undefined;
      if (selected) graph.setSelectionCell(selected);
    } finally {
      this.isRendering = false;
    }
  }

  private laneStyle(lane: UmlLane): CellStyle {
    return {
      shape: 'swimlane',
      horizontal: false,
      startSize: 180,
      fillColor: '#0b1624',
      swimlaneFillColor: '#102236',
      strokeColor: lane.color || '#caa34c',
      strokeWidth: 2,
      fontColor: '#f6f1e8',
      fontSize: 13,
      fontStyle: 1,
      align: 'left',
      verticalAlign: 'middle',
      spacingLeft: 14,
      spacingRight: 12,
      whiteSpace: 'wrap',
    };
  }

  private nodeStyle(node: UmlNode): CellStyle {
    const base: CellStyle = {
      align: 'center',
      verticalAlign: 'middle',
      fontColor: '#f8fafc',
      fontSize: 12,
      fontStyle: 1,
      spacing: 5,
      whiteSpace: 'wrap',
      overflow: 'fill',
      strokeWidth: 2,
    };

    switch (node.type) {
      case 'start':
        return { ...base, shape: 'ellipse', fillColor: '#05080d', strokeColor: '#05080d' };
      case 'end':
        return { ...base, shape: 'doubleEllipse', fillColor: '#05080d', strokeColor: '#f6f1e8' };
      case 'flowFinal':
        return {
          ...base,
          shape: 'ellipse',
          fillColor: '#0b1624',
          strokeColor: '#d26f6f',
          fontColor: '#ef9d9d',
          fontSize: 22,
        };
      case 'activity':
        return {
          ...base,
          shape: 'rectangle',
          rounded: true,
          arcSize: 14,
          fillColor: '#17334a',
          strokeColor: '#caa34c',
        };
      case 'callAction':
        return {
          ...base,
          shape: 'rectangle',
          rounded: true,
          arcSize: 14,
          fillColor: '#17334a',
          strokeColor: '#caa34c',
          strokeWidth: 4,
        };
      case 'acceptEvent':
        return {
          ...base,
          shape: 'rectangle',
          rounded: true,
          arcSize: 14,
          fillColor: '#15323b',
          strokeColor: '#58a6aa',
        };
      case 'sendSignal':
        return {
          ...base,
          shape: 'rectangle',
          rounded: true,
          arcSize: 14,
          fillColor: '#302c43',
          strokeColor: '#b399da',
        };
      case 'decision':
        return { ...base, shape: 'rhombus', fillColor: '#143246', strokeColor: '#d8ae3d' };
      case 'merge':
        return { ...base, shape: 'rhombus', fillColor: '#203142', strokeColor: '#79aeb2' };
      case 'fork':
      case 'join':
        return {
          ...base,
          shape: 'rectangle',
          fillColor: '#05080d',
          strokeColor: '#05080d',
          fontColor: '#05080d',
          fontSize: 1,
          spacing: 0,
        };
      case 'object':
        return { ...base, shape: 'rectangle', fillColor: '#202b40', strokeColor: '#8ca3c0' };
      case 'dataStore':
        return { ...base, shape: 'cylinder', fillColor: '#1c4050', strokeColor: '#87b7bd' };
    }
  }

  private edgeStyle(edge: UmlEdge): CellStyle {
    const objectFlow = edge.kind === 'object';
    return {
      edgeStyle: 'orthogonalEdgeStyle',
      rounded: true,
      strokeColor: objectFlow ? '#8ec7c9' : '#d5ab3d',
      strokeWidth: objectFlow ? 2 : 2.5,
      dashed: objectFlow,
      dashPattern: objectFlow ? '7 5' : undefined,
      endArrow: objectFlow ? 'open' : 'block',
      endFill: !objectFlow,
      fontColor: '#f6f1e8',
      fontSize: 11,
      labelBackgroundColor: '#0b1624',
    };
  }

  private addConnectionPort(cell: Cell, node: UmlNode): void {
    if (!this.graph || sourceRestrictedTypes.has(node.type)) return;

    const port = new CellOverlay(
      new ImageBox(connectionPortImage, 28, 28),
      `Crear flujo desde ${node.label}`,
      'right',
      'middle',
      undefined,
      'crosshair',
    );
    port.addListener(InternalEvent.CLICK, (_sender: unknown, event: EventObject) => {
      if (this.isRendering) return;
      const source = this.eventCell(event);
      const sourceId = source?.getId();
      if (sourceId) this.store.beginConnection(sourceId);
    });
    this.graph.addCellOverlay(cell, port);
  }

  private eventCell(event: EventObject): Cell | null {
    const cell = event.getProperty('cell');
    return cell instanceof Cell ? cell : null;
  }

  private nodeFromCell(cell: Cell | null | undefined): UmlNode | undefined {
    const id = cell?.getId();
    return id ? this.store.nodes().find((node) => node.id === id) : undefined;
  }

  private isNodeCell(cell: Cell | null | undefined): boolean {
    return Boolean(this.nodeFromCell(cell));
  }

  private edgeIdFromCell(cell: Cell): string {
    const id = cell.getId() ?? '';
    return id.startsWith(edgePrefix) ? id.slice(edgePrefix.length) : id;
  }

  private isUmlNodeType(value: string): value is UmlNodeType {
    return umlNodeTypes.includes(value as UmlNodeType);
  }
}
