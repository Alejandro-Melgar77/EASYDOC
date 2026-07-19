import { computed, effect, Injectable, inject, signal, untracked } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { BusinessPolicy } from '../../core/models/business-policy.model';
import {
  PolicyCollaborationOperation,
  PolicyCollaborationService,
} from '../../core/services/policy-collaboration.service';
import { PolicyApiService } from '../../core/services/policy-api.service';
import { PolicyLibraryService } from '../../core/services/policy-library.service';
import { ApiService } from '../../core/services/api.service';

export type UmlNodeType =
  | 'start'
  | 'end'
  | 'flowFinal'
  | 'activity'
  | 'callAction'
  | 'acceptEvent'
  | 'sendSignal'
  | 'decision'
  | 'merge'
  | 'fork'
  | 'join'
  | 'object'
  | 'dataStore';

export type UmlEdgeKind = 'control' | 'object';

export interface UmlLane {
  id: string;
  name: string;
  color?: string;
}

export interface UmlNode {
  id: string;
  type: UmlNodeType;
  x: number;
  y: number;
  label: string;
  department: string;
  assignee: string;
  description: string;
  laneId: string;
  color?: string;
  selected?: boolean;
}

export interface UmlEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  kind: UmlEdgeKind;
}

export interface FormQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'select';
  required: boolean;
  options: string;
}

export interface AttachmentRequirement {
  id: string;
  label: string;
  acceptedFormats: string;
  required: boolean;
}

export interface PolicyFormDraft {
  questions: FormQuestion[];
  attachments: AttachmentRequirement[];
}

export interface PolicyRecord {
  id: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  createdAt: string;
  updatedAt: string;
  nodes: UmlNode[];
  edges: UmlEdge[];
  lanes: UmlLane[];
  form: PolicyFormDraft;
  description?: string;
}

export interface PolicySuggestion {
  title: string;
  confidence: number;
  nodes: Array<Omit<UmlNode, 'id' | 'selected'>>;
  edges: Array<Omit<UmlEdge, 'id'>>;
  form: PolicyFormDraft;
}

export interface SaveState {
  status: 'idle' | 'success' | 'error';
  message: string;
}

interface RemoteDiagramSuggestion {
  title: string;
  confidence: number;
  rationale: string;
  source_policy_id?: string | null;
  source_is_synthetic: boolean;
  diagram_data: {
    nodes: Array<Partial<UmlNode> & { id: string; type: UmlNodeType; x: number; y: number }>;
    edges: Array<{ from: string; to: string; label?: string; kind?: UmlEdgeKind }>;
    lanes?: Array<{ id: string; name: string }>;
  };
  form_definition: PolicyFormDraft;
}

const policyStorageKey = 'easydoc_policies';
const laneTopOffset = 82;
const laneHeight = 184;
const nodeLeftInset = 196;

const defaultLanes = (): UmlLane[] => [
  { id: 'lane-reception', name: 'Recepcion y ventanilla', color: '#caa34c' },
  { id: 'lane-secretary', name: 'Secretaria academica', color: '#2f8f92' },
  { id: 'lane-coordination', name: 'Coordinacion academica', color: '#5b8cc0' },
  { id: 'lane-direction', name: 'Direccion de carrera', color: '#9a7956' },
];

const emptyFormDraft = (): PolicyFormDraft => ({ questions: [], attachments: [] });

@Injectable({ providedIn: 'root' })
export class UmlStoreService {
  private policyLibrary = inject(PolicyLibraryService);
  private collaboration = inject(PolicyCollaborationService);
  private policyApi = inject(PolicyApiService);
  private api = inject(ApiService);
  private suggestionTimer: ReturnType<typeof setTimeout> | undefined;
  private policyIdSignal = signal<string | null>(null);
  private processNameSignal = signal('');
  private lanesSignal = signal<UmlLane[]>(defaultLanes());
  private nodesSignal = signal<UmlNode[]>([]);
  private edgesSignal = signal<UmlEdge[]>([]);
  private selectedNodeIdSignal = signal<string | null>(null);
  private selectedPaletteTypeSignal = signal<UmlNodeType | null>(null);
  private connectionSourceIdSignal = signal<string | null>(null);
  private stageSignal = signal<'diagram' | 'form'>('diagram');
  private formDraftSignal = signal<PolicyFormDraft>(emptyFormDraft());
  private saveStateSignal = signal<SaveState>({ status: 'idle', message: '' });
  private aiSuggestionSignal = signal<PolicySuggestion>(this.fallbackSuggestion());

  readonly policyId = computed(() => this.policyIdSignal());
  readonly processName = computed(() => this.processNameSignal());
  readonly lanes = computed(() => this.lanesSignal());
  readonly nodes = computed(() => this.nodesSignal());
  readonly edges = computed(() => this.edgesSignal());
  readonly selectedPaletteType = computed(() => this.selectedPaletteTypeSignal());
  readonly connectionSourceId = computed(() => this.connectionSourceIdSignal());
  readonly stage = computed(() => this.stageSignal());
  readonly formDraft = computed(() => this.formDraftSignal());
  readonly saveState = computed(() => this.saveStateSignal());
  readonly selectedNode = computed(() => {
    const id = this.selectedNodeIdSignal();
    return id ? (this.nodesSignal().find((node) => node.id === id) ?? null) : null;
  });
  readonly canvasSize = computed(() => {
    const nodes = this.nodesSignal();
    const width = nodes.reduce((max, node) => {
      const size = this.getNodeSize(node.type);
      return Math.max(max, node.x + size.width + 240);
    }, 1560);
    const laneBottom = laneTopOffset + this.lanesSignal().length * laneHeight + 72;
    const nodeBottom = nodes.reduce((max, node) => {
      const size = this.getNodeSize(node.type);
      return Math.max(max, node.y + size.height + 80);
    }, 900);
    return { width, height: Math.max(900, laneBottom, nodeBottom) };
  });
  readonly canRegisterPolicy = computed(
    () =>
      this.processNameSignal().trim().length >= 3 &&
      this.hasConnectedStartAndEnd(this.nodesSignal(), this.edgesSignal()),
  );
  readonly aiSuggestion = computed(() => this.aiSuggestionSignal());

  constructor() {
    effect(() => {
      const operation = this.collaboration.lastOperation();
      if (operation) untracked(() => this.applyRemoteOperation(operation));
    });
  }

  setProcessName(name: string): void {
    this.processNameSignal.set(name);
    this.clearSaveState();
    this.scheduleAiSuggestion();
  }

  selectPaletteType(type: UmlNodeType | null): void {
    this.selectedPaletteTypeSignal.set(type);
    this.connectionSourceIdSignal.set(null);
  }

  addLane(name?: string): UmlLane {
    const lane: UmlLane = {
      id: crypto.randomUUID(),
      name: name?.trim() || `Departamento ${this.lanesSignal().length + 1}`,
      color: this.nextLaneColor(this.lanesSignal().length),
    };
    this.lanesSignal.update((lanes) => [...lanes, lane]);
    this.clearSaveState();
    this.collaboration.send('lane.create', { lane });
    return lane;
  }

  updateLane(id: string, updates: Partial<Pick<UmlLane, 'name' | 'color'>>): void {
    const existing = this.lanesSignal().find((lane) => lane.id === id);
    if (!existing) return;
    const next: UmlLane = {
      ...existing,
      ...updates,
      name: updates.name?.trim() || existing.name,
    };
    this.lanesSignal.update((lanes) => lanes.map((lane) => (lane.id === id ? next : lane)));
    if (next.name !== existing.name) {
      this.nodesSignal.update((nodes) =>
        nodes.map((node) => (node.laneId === id ? { ...node, department: next.name } : node)),
      );
    }
    this.clearSaveState();
    this.collaboration.send('lane.update', { lane: next });
    this.scheduleAiSuggestion();
  }

  deleteLane(id: string): void {
    const lanes = this.lanesSignal();
    if (lanes.length <= 1) {
      this.saveStateSignal.set({
        status: 'error',
        message: 'El diagrama debe conservar al menos un carril de responsabilidad.',
      });
      return;
    }
    const fallback = lanes.find((lane) => lane.id !== id);
    if (!fallback) return;
    this.lanesSignal.set(lanes.filter((lane) => lane.id !== id));
    this.nodesSignal.update((nodes) =>
      nodes.map((node) =>
        node.laneId === id
          ? this.normalizeNode({ ...node, laneId: fallback.id, department: fallback.name })
          : node,
      ),
    );
    this.clearSaveState();
    this.collaboration.send('lane.delete', { id });
    this.scheduleAiSuggestion();
  }

  getLaneTop(laneId: string): number {
    const index = Math.max(
      0,
      this.lanesSignal().findIndex((lane) => lane.id === laneId),
    );
    return laneTopOffset + index * laneHeight;
  }

  getLaneNodeCount(laneId: string): number {
    return this.nodesSignal().filter((node) => node.laneId === laneId).length;
  }

  addNode(
    node: Partial<Omit<UmlNode, 'id' | 'selected'>> & Pick<UmlNode, 'type' | 'x' | 'y'>,
  ): UmlNode {
    const lane = this.resolveLane(node.laneId, node.department, node.y);
    const newNode = this.normalizeNode({
      id: crypto.randomUUID(),
      type: node.type,
      x: node.x,
      y: node.y,
      label: node.label ?? this.defaultLabel(node.type),
      department: node.department?.trim() || lane.name,
      assignee: node.assignee ?? '',
      description: node.description ?? '',
      laneId: lane.id,
      color: node.color,
    });
    this.nodesSignal.update((nodes) => [...nodes, newNode]);
    this.selectNode(newNode.id);
    this.clearSaveState();
    this.collaboration.send('node.create', { node: newNode });
    this.scheduleAiSuggestion();
    return newNode;
  }

  addNodeFromPalette(type: UmlNodeType, x: number, y: number): UmlNode {
    const node = this.addNode({ type, x, y });
    this.selectedPaletteTypeSignal.set(null);
    return node;
  }

  updateNodePosition(id: string, x: number, y: number): void {
    this.nodesSignal.update((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;
        const lane = this.resolveLane(undefined, undefined, y);
        return this.normalizeNode({ ...node, x, y, laneId: lane.id, department: lane.name });
      }),
    );
    this.clearSaveState();
    this.broadcastNode(id);
    this.scheduleAiSuggestion();
  }

  updateNodeProperties(id: string, updates: Partial<UmlNode>): void {
    this.nodesSignal.update((nodes) =>
      nodes.map((node) => {
        if (node.id !== id) return node;
        const lane = this.resolveLane(updates.laneId ?? node.laneId, updates.department, node.y);
        const laneChanged = lane.id !== node.laneId;
        return this.normalizeNode({
          ...node,
          ...updates,
          laneId: lane.id,
          department: updates.department?.trim() || (laneChanged ? lane.name : node.department),
          y: laneChanged ? this.getLaneTop(lane.id) + 58 : (updates.y ?? node.y),
        });
      }),
    );
    this.clearSaveState();
    this.broadcastNode(id);
  }

  moveNodeToLane(id: string, laneId: string): void {
    this.updateNodeProperties(id, { laneId });
  }

  deleteNode(id: string): void {
    this.nodesSignal.update((nodes) => nodes.filter((node) => node.id !== id));
    this.edgesSignal.update((edges) => edges.filter((edge) => edge.from !== id && edge.to !== id));
    if (this.selectedNodeIdSignal() === id) this.selectedNodeIdSignal.set(null);
    if (this.connectionSourceIdSignal() === id) this.connectionSourceIdSignal.set(null);
    this.clearSaveState();
    this.collaboration.send('node.delete', { id });
    this.scheduleAiSuggestion();
  }

  selectNode(id: string | null): void {
    this.selectedNodeIdSignal.set(id);
    this.nodesSignal.update((nodes) =>
      nodes.map((node) => ({ ...node, selected: node.id === id })),
    );
  }

  beginConnection(nodeId: string): void {
    this.connectionSourceIdSignal.set(nodeId);
    this.selectNode(nodeId);
  }

  cancelConnection(): void {
    this.connectionSourceIdSignal.set(null);
  }

  handleConnectionClick(nodeId: string): void {
    const sourceId = this.connectionSourceIdSignal();
    if (!sourceId) {
      this.beginConnection(nodeId);
      return;
    }
    if (sourceId === nodeId) {
      this.cancelConnection();
      return;
    }
    this.addEdge(sourceId, nodeId);
    this.cancelConnection();
    this.selectNode(nodeId);
  }

  addEdge(from: string, to: string, label = '', kind: UmlEdgeKind = 'control'): void {
    if (
      this.edgesSignal().some((edge) => edge.from === from && edge.to === to && edge.kind === kind)
    ) {
      return;
    }
    const edge: UmlEdge = { id: crypto.randomUUID(), from, to, label, kind };
    this.edgesSignal.update((edges) => [...edges, edge]);
    this.clearSaveState();
    this.collaboration.send('edge.create', { edge });
  }

  deleteEdge(id: string): void {
    this.edgesSignal.update((edges) => edges.filter((edge) => edge.id !== id));
    this.clearSaveState();
    this.collaboration.send('edge.delete', { id });
  }

  updateEdge(id: string, updates: Partial<Pick<UmlEdge, 'label' | 'kind'>>): void {
    this.edgesSignal.update((edges) =>
      edges.map((edge) => (edge.id === id ? { ...edge, ...updates } : edge)),
    );
    this.clearSaveState();
    const edge = this.edgesSignal().find((item) => item.id === id);
    if (edge) this.collaboration.send('edge.update', { edge });
  }

  resetDiagram(): void {
    this.policyIdSignal.set(null);
    this.processNameSignal.set('');
    this.lanesSignal.set(defaultLanes());
    this.nodesSignal.set([]);
    this.edgesSignal.set([]);
    this.selectedNodeIdSignal.set(null);
    this.connectionSourceIdSignal.set(null);
    this.selectedPaletteTypeSignal.set(null);
    this.stageSignal.set('diagram');
    this.formDraftSignal.set(emptyFormDraft());
    this.clearSaveState();
    this.collaboration.disconnect();
  }

  loadPolicy(policyId: string, initialStage: 'diagram' | 'form' = 'diagram'): void {
    const localPolicy = this.readPolicies().find((item) => item.id === policyId);
    if (this.policyApi.canUseRemotePersistence() && this.policyApi.isRemoteId(policyId)) {
      this.policyApi.get(policyId).subscribe({
        next: (policy) => {
          const storedPolicy = this.fromBusinessPolicy(policy);
          this.policyLibrary.savePolicy(policy);
          this.applyLoadedPolicy(storedPolicy, initialStage);
        },
        error: () =>
          localPolicy
            ? this.applyLoadedPolicy(localPolicy, initialStage)
            : this.showPolicyNotFound(),
      });
      return;
    }
    if (localPolicy) this.applyLoadedPolicy(localPolicy, initialStage);
    else this.showPolicyNotFound();
  }

  acceptSuggestion(): void {
    const suggestion = this.aiSuggestionSignal();
    const existingNodes = this.nodesSignal();
    const createdIds: string[] = [];
    if (!this.processNameSignal().trim()) this.processNameSignal.set(suggestion.title);
    if (existingNodes.length === 0) {
      suggestion.nodes.forEach((node) => createdIds.push(this.addNode(node).id));
      suggestion.edges.forEach((edge) => {
        const from = createdIds[Number(edge.from)];
        const to = createdIds[Number(edge.to)];
        if (from && to) this.addEdge(from, to, edge.label, edge.kind);
      });
    } else {
      const lastNode = existingNodes[existingNodes.length - 1];
      const template =
        suggestion.nodes[Math.min(existingNodes.length, suggestion.nodes.length - 1)];
      const newNode = this.addNode({ ...template, x: lastNode.x + 210, y: lastNode.y });
      this.addEdge(lastNode.id, newNode.id, '');
    }
    this.formDraftSignal.set(this.mergeForms(this.formDraftSignal(), suggestion.form));
    this.broadcastForm();
  }

  registerPolicy(): boolean {
    if (!this.canRegisterPolicy()) {
      this.saveStateSignal.set({
        status: 'error',
        message: 'El proceso necesita nombre y una ruta conectada desde Inicio hasta Fin.',
      });
      return false;
    }
    this.stageSignal.set('form');
    this.saveStateSignal.set({ status: 'idle', message: '' });
    return true;
  }

  backToDiagram(): void {
    this.stageSignal.set('diagram');
    this.clearSaveState();
  }

  addQuestion(): void {
    this.formDraftSignal.update((form) => ({
      ...form,
      questions: [
        ...form.questions,
        {
          id: crypto.randomUUID(),
          label: 'Nueva pregunta',
          type: 'text',
          required: true,
          options: '',
        },
      ],
    }));
    this.clearSaveState();
    this.broadcastForm();
  }

  updateQuestion(id: string, updates: Partial<FormQuestion>): void {
    this.formDraftSignal.update((form) => ({
      ...form,
      questions: form.questions.map((question) =>
        question.id === id ? { ...question, ...updates } : question,
      ),
    }));
    this.clearSaveState();
    this.broadcastForm();
  }

  deleteQuestion(id: string): void {
    this.formDraftSignal.update((form) => ({
      ...form,
      questions: form.questions.filter((question) => question.id !== id),
    }));
    this.clearSaveState();
    this.broadcastForm();
  }

  addAttachment(): void {
    this.formDraftSignal.update((form) => ({
      ...form,
      attachments: [
        ...form.attachments,
        {
          id: crypto.randomUUID(),
          label: 'Documento solicitado',
          acceptedFormats: 'PDF, JPG, PNG',
          required: true,
        },
      ],
    }));
    this.clearSaveState();
    this.broadcastForm();
  }

  updateAttachment(id: string, updates: Partial<AttachmentRequirement>): void {
    this.formDraftSignal.update((form) => ({
      ...form,
      attachments: form.attachments.map((attachment) =>
        attachment.id === id ? { ...attachment, ...updates } : attachment,
      ),
    }));
    this.clearSaveState();
    this.broadcastForm();
  }

  deleteAttachment(id: string): void {
    this.formDraftSignal.update((form) => ({
      ...form,
      attachments: form.attachments.filter((attachment) => attachment.id !== id),
    }));
    this.clearSaveState();
    this.broadcastForm();
  }

  savePolicy(): Observable<PolicyRecord | null> {
    if (!this.canRegisterPolicy()) {
      this.saveStateSignal.set({
        status: 'error',
        message:
          'No se pudo guardar: el diagrama debe tener una ruta valida desde Inicio hasta Fin.',
      });
      return of(null);
    }
    const policies = this.readPolicies();
    const existing = this.policyIdSignal()
      ? policies.find((policy) => policy.id === this.policyIdSignal())
      : undefined;
    const now = new Date().toISOString();
    const policy: PolicyRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      name: this.processNameSignal().trim(),
      status: 'published',
      version: (existing?.version ?? 0) + 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      nodes: this.nodesSignal().map(({ selected: _selected, ...node }) => ({ ...node })),
      edges: this.edgesSignal().map((edge) => ({ ...edge })),
      lanes: this.lanesSignal().map((lane) => ({ ...lane })),
      form: {
        questions: this.formDraftSignal().questions.map((question) => ({ ...question })),
        attachments: this.formDraftSignal().attachments.map((attachment) => ({ ...attachment })),
      },
    };
    const saveRequest = this.policyApi.canUseRemotePersistence()
      ? this.policyApi.save(policy)
      : of(policy as BusinessPolicy);
    return saveRequest.pipe(
      map((savedPolicy) => {
        const saved = this.fromBusinessPolicy(savedPolicy);
        const nextPolicies = existing
          ? policies.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...policies.filter((item) => item.id !== policy.id)];
        localStorage.setItem(policyStorageKey, JSON.stringify(nextPolicies));
        this.policyLibrary.savePolicy(saved);
        this.policyIdSignal.set(saved.id);
        this.collaboration.connect(saved.id);
        this.saveStateSignal.set({
          status: 'success',
          message: `Politica guardada correctamente. Se registraron ${this.nodesSignal().length} elementos UML, ${this.lanesSignal().length} carriles y ${this.formItemCount(saved.form)} elemento(s) de formulario.`,
        });
        return saved;
      }),
      catchError(() => {
        this.saveStateSignal.set({
          status: 'error',
          message:
            'No fue posible guardar la politica. Revisa la conexion o los datos del proceso.',
        });
        return of(null);
      }),
    );
  }

  getNodeCenter(nodeId: string): { x: number; y: number } | null {
    const node = this.nodesSignal().find((item) => item.id === nodeId);
    if (!node) return null;
    const size = this.getNodeSize(node.type);
    return { x: node.x + size.width / 2, y: node.y + size.height / 2 };
  }

  getNodeSize(type: UmlNodeType): { width: number; height: number } {
    if (type === 'start' || type === 'end' || type === 'flowFinal')
      return { width: 54, height: 54 };
    if (type === 'decision' || type === 'merge') return { width: 128, height: 128 };
    if (type === 'fork' || type === 'join') return { width: 148, height: 12 };
    if (type === 'object') return { width: 150, height: 68 };
    if (type === 'dataStore') return { width: 150, height: 66 };
    return { width: 178, height: 78 };
  }

  private applyLoadedPolicy(policy: PolicyRecord, initialStage: 'diagram' | 'form'): void {
    const lanes = this.normalizeLanes(policy.lanes);
    this.policyIdSignal.set(policy.id);
    this.processNameSignal.set(policy.name);
    this.lanesSignal.set(lanes);
    this.nodesSignal.set(policy.nodes.map((node) => this.normalizeNode(node)));
    this.edgesSignal.set(policy.edges.map((edge) => ({ ...edge, kind: edge.kind ?? 'control' })));
    this.formDraftSignal.set({
      questions: policy.form.questions.map((question) => ({ ...question })),
      attachments: policy.form.attachments.map((attachment) => ({ ...attachment })),
    });
    this.selectedNodeIdSignal.set(null);
    this.connectionSourceIdSignal.set(null);
    this.selectedPaletteTypeSignal.set(null);
    this.stageSignal.set(initialStage);
    this.clearSaveState();
    this.collaboration.connect(policy.id);
  }

  private showPolicyNotFound(): void {
    this.saveStateSignal.set({
      status: 'error',
      message: 'No fue posible abrir la politica solicitada.',
    });
  }

  private readPolicies(): PolicyRecord[] {
    try {
      const raw = localStorage.getItem(policyStorageKey);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as PolicyRecord[]) : [];
    } catch {
      return [];
    }
  }

  private fromBusinessPolicy(policy: BusinessPolicy): PolicyRecord {
    return {
      id: policy.id,
      name: policy.name,
      status: policy.status,
      version: policy.version,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
      nodes: policy.nodes as UmlNode[],
      edges: policy.edges as UmlEdge[],
      lanes: (policy.lanes ?? []) as UmlLane[],
      form: {
        questions: policy.form.questions as FormQuestion[],
        attachments: policy.form.attachments as AttachmentRequirement[],
      },
      description: policy.description,
    };
  }

  private broadcastNode(id: string): void {
    const node = this.nodesSignal().find((item) => item.id === id);
    if (node) this.collaboration.send('node.update', { node });
  }

  private broadcastForm(): void {
    const form = this.formDraftSignal();
    this.collaboration.send('form.update', {
      form: {
        questions: form.questions.map((question) => ({ ...question })),
        attachments: form.attachments.map((attachment) => ({ ...attachment })),
      },
    });
  }

  private applyRemoteOperation(operation: PolicyCollaborationOperation): void {
    switch (operation.operation) {
      case 'node.create': {
        const node = operation.payload['node'] as UmlNode | undefined;
        if (!node || this.nodesSignal().some((item) => item.id === node.id)) return;
        this.nodesSignal.update((nodes) => [
          ...nodes,
          this.normalizeNode({ ...node, selected: false }),
        ]);
        return;
      }
      case 'node.update': {
        const node = operation.payload['node'] as UmlNode | undefined;
        if (!node) return;
        this.nodesSignal.update((nodes) =>
          nodes.map((item) =>
            item.id === node.id ? this.normalizeNode({ ...node, selected: item.selected }) : item,
          ),
        );
        return;
      }
      case 'node.delete': {
        const id = operation.payload['id'];
        if (typeof id !== 'string') return;
        this.nodesSignal.update((nodes) => nodes.filter((node) => node.id !== id));
        this.edgesSignal.update((edges) =>
          edges.filter((edge) => edge.from !== id && edge.to !== id),
        );
        if (this.selectedNodeIdSignal() === id) this.selectedNodeIdSignal.set(null);
        return;
      }
      case 'edge.create': {
        const edge = operation.payload['edge'] as UmlEdge | undefined;
        if (!edge || this.edgesSignal().some((item) => item.id === edge.id)) return;
        this.edgesSignal.update((edges) => [...edges, { ...edge, kind: edge.kind ?? 'control' }]);
        return;
      }
      case 'edge.update': {
        const edge = operation.payload['edge'] as UmlEdge | undefined;
        if (!edge) return;
        this.edgesSignal.update((edges) =>
          edges.map((item) =>
            item.id === edge.id ? { ...edge, kind: edge.kind ?? 'control' } : item,
          ),
        );
        return;
      }
      case 'edge.delete': {
        const id = operation.payload['id'];
        if (typeof id === 'string')
          this.edgesSignal.update((edges) => edges.filter((edge) => edge.id !== id));
        return;
      }
      case 'lane.create': {
        const lane = operation.payload['lane'] as UmlLane | undefined;
        if (!lane || this.lanesSignal().some((item) => item.id === lane.id)) return;
        this.lanesSignal.update((lanes) => [...lanes, lane]);
        return;
      }
      case 'lane.update': {
        const lane = operation.payload['lane'] as UmlLane | undefined;
        if (!lane) return;
        this.lanesSignal.update((lanes) =>
          lanes.map((item) => (item.id === lane.id ? lane : item)),
        );
        this.nodesSignal.update((nodes) =>
          nodes.map((node) =>
            node.laneId === lane.id ? { ...node, department: lane.name } : node,
          ),
        );
        return;
      }
      case 'lane.delete': {
        const id = operation.payload['id'];
        if (typeof id !== 'string' || this.lanesSignal().length <= 1) return;
        const fallback = this.lanesSignal().find((lane) => lane.id !== id);
        if (!fallback) return;
        this.lanesSignal.update((lanes) => lanes.filter((lane) => lane.id !== id));
        this.nodesSignal.update((nodes) =>
          nodes.map((node) =>
            node.laneId === id
              ? this.normalizeNode({ ...node, laneId: fallback.id, department: fallback.name })
              : node,
          ),
        );
        return;
      }
      case 'form.update': {
        const form = operation.payload['form'] as PolicyFormDraft | undefined;
        if (!form || !Array.isArray(form.questions) || !Array.isArray(form.attachments)) return;
        this.formDraftSignal.set({
          questions: form.questions.map((question) => ({ ...question })),
          attachments: form.attachments.map((attachment) => ({ ...attachment })),
        });
      }
    }
  }

  private hasConnectedStartAndEnd(nodes: UmlNode[], edges: UmlEdge[]): boolean {
    const startIds = nodes.filter((node) => node.type === 'start').map((node) => node.id);
    const endIds = new Set(nodes.filter((node) => node.type === 'end').map((node) => node.id));
    if (startIds.length === 0 || endIds.size === 0) return false;
    const visited = new Set<string>(startIds);
    const pending = [...startIds];
    while (pending.length > 0) {
      const current = pending.shift();
      if (!current) continue;
      if (endIds.has(current)) return true;
      edges
        .filter((edge) => edge.from === current)
        .forEach((edge) => {
          if (!visited.has(edge.to)) {
            visited.add(edge.to);
            pending.push(edge.to);
          }
        });
    }
    return false;
  }

  private normalizeLanes(lanes: UmlLane[] | undefined): UmlLane[] {
    const valid = (lanes ?? []).filter((lane): lane is UmlLane =>
      Boolean(lane?.id && lane?.name?.trim()),
    );
    return valid.length > 0
      ? valid.map((lane) => ({ ...lane, name: lane.name.trim() }))
      : defaultLanes();
  }

  private normalizeNode(node: UmlNode): UmlNode {
    const lane = this.resolveLane(node.laneId, node.department, node.y);
    const size = this.getNodeSize(node.type);
    const minY = this.getLaneTop(lane.id) + 42;
    const maxY = this.getLaneTop(lane.id) + laneHeight - size.height - 14;
    return {
      ...node,
      laneId: lane.id,
      department: node.department?.trim() || lane.name,
      x: Math.max(nodeLeftInset, Number.isFinite(node.x) ? node.x : nodeLeftInset),
      y: Math.max(minY, Math.min(Math.max(minY, maxY), Number.isFinite(node.y) ? node.y : minY)),
    };
  }

  private resolveLane(laneId?: string, department?: string, y?: number): UmlLane {
    const lanes = this.lanesSignal();
    const byId = laneId ? lanes.find((lane) => lane.id === laneId) : undefined;
    if (byId) return byId;
    const search = department?.toLocaleLowerCase() ?? '';
    const byDepartment = lanes.find((lane) => {
      const laneName = lane.name.toLocaleLowerCase();
      return search && (laneName.includes(search) || search.includes(laneName.split(' ')[0]));
    });
    if (byDepartment) return byDepartment;
    if (typeof y === 'number') {
      const index = Math.min(
        lanes.length - 1,
        Math.max(0, Math.floor((y - laneTopOffset) / laneHeight)),
      );
      return lanes[index] ?? defaultLanes()[0];
    }
    return lanes[0] ?? defaultLanes()[0];
  }

  private defaultLabel(type: UmlNodeType): string {
    const labels: Record<UmlNodeType, string> = {
      start: 'Inicio',
      end: 'Fin de actividad',
      flowFinal: 'Fin de flujo',
      activity: 'Nueva actividad',
      callAction: 'Llamar subproceso',
      acceptEvent: 'Esperar evento',
      sendSignal: 'Enviar senal',
      decision: 'Decision',
      merge: 'Unir alternativa',
      fork: 'Bifurcacion paralela',
      join: 'Sincronizacion',
      object: 'Objeto o documento',
      dataStore: 'Almacen de datos',
    };
    return labels[type];
  }

  private nextLaneColor(index: number): string {
    return ['#caa34c', '#2f8f92', '#5b8cc0', '#9a7956', '#7a9a62'][index % 5];
  }

  private formItemCount(form: PolicyFormDraft): number {
    return form.questions.length + form.attachments.length;
  }

  private clearSaveState(): void {
    if (this.saveStateSignal().status !== 'idle')
      this.saveStateSignal.set({ status: 'idle', message: '' });
  }

  private scheduleAiSuggestion(): void {
    if (this.suggestionTimer) clearTimeout(this.suggestionTimer);
    this.suggestionTimer = setTimeout(() => this.requestAiSuggestion(), 260);
  }

  private requestAiSuggestion(): void {
    if (!this.policyApi.canUseRemotePersistence()) {
      this.aiSuggestionSignal.set(this.fallbackSuggestion());
      return;
    }
    this.api
      .post<RemoteDiagramSuggestion>('/policies/suggestions', {
        process_name: this.processNameSignal().trim(),
        existing_node_types: this.nodesSignal().map((node) => node.type),
        lane_names: this.lanesSignal().map((lane) => lane.name),
      })
      .pipe(catchError(() => of(null)))
      .subscribe((suggestion) => {
        if (suggestion) this.aiSuggestionSignal.set(this.fromRemoteSuggestion(suggestion));
      });
  }

  private fromRemoteSuggestion(suggestion: RemoteDiagramSuggestion): PolicySuggestion {
    const sourceNodes = suggestion.diagram_data.nodes;
    const sourceIndex = new Map(sourceNodes.map((node, index) => [node.id, index]));
    const localLanes = this.lanesSignal();
    const sourceLanes = new Map(
      (suggestion.diagram_data.lanes ?? []).map((lane) => [lane.id, lane]),
    );
    return {
      title: suggestion.title,
      confidence: suggestion.confidence,
      nodes: sourceNodes.map((node) => {
        const sourceLane = sourceLanes.get(node.laneId ?? '');
        const department = node.department?.trim() || sourceLane?.name || localLanes[0].name;
        const localLane = this.resolveLane(
          localLanes.find(
            (lane) => lane.name.toLocaleLowerCase() === department.toLocaleLowerCase(),
          )?.id,
          department,
          node.y,
        );
        return {
          type: node.type,
          x: Number(node.x),
          y: Number(node.y),
          label: node.label ?? this.defaultLabel(node.type),
          department: localLane.name,
          laneId: localLane.id,
          assignee: node.assignee ?? '',
          description: node.description ?? '',
          color: node.color,
        };
      }),
      edges: suggestion.diagram_data.edges
        .map((edge) => ({
          from: String(sourceIndex.get(edge.from) ?? -1),
          to: String(sourceIndex.get(edge.to) ?? -1),
          label: edge.label ?? '',
          kind: edge.kind ?? 'control',
        }))
        .filter((edge) => edge.from !== '-1' && edge.to !== '-1'),
      form: {
        questions: suggestion.form_definition.questions.map((question) => ({ ...question })),
        attachments: suggestion.form_definition.attachments.map((attachment) => ({
          ...attachment,
        })),
      },
    };
  }

  private fallbackSuggestion(): PolicySuggestion {
    const name = this.processNameSignal().toLocaleLowerCase();
    const isAcademicCase =
      name.includes('caso') || name.includes('materia') || name.includes('academ');
    const isCertificate = name.includes('certificado') || name.includes('constancia');
    const title = isAcademicCase
      ? 'Casos especiales academicos'
      : isCertificate
        ? 'Emision de certificado academico'
        : 'Tramite academico administrativo';
    const confidence = isAcademicCase ? 94 : isCertificate ? 89 : 82;
    const actionLabel = isAcademicCase
      ? 'Revisar prerrequisitos'
      : isCertificate
        ? 'Generar certificado'
        : 'Evaluacion tecnica';
    return {
      title,
      confidence,
      nodes: [
        this.templateNode('start', 'Solicitud recibida', 220, 126, 'Recepcion'),
        this.templateNode('activity', 'Validar datos y documentos', 430, 306, 'Secretaria'),
        this.templateNode('decision', 'Documentacion completa?', 670, 486, 'Coordinacion'),
        this.templateNode('activity', actionLabel, 900, 490, 'Coordinacion'),
        this.templateNode('activity', 'Emitir resolucion', 1130, 672, 'Direccion'),
        this.templateNode('end', 'Notificar resultado', 1390, 306, 'Secretaria'),
      ],
      edges: [
        { from: '0', to: '1', label: '', kind: 'control' },
        { from: '1', to: '2', label: '', kind: 'control' },
        { from: '2', to: '3', label: 'Si', kind: 'control' },
        { from: '3', to: '4', label: '', kind: 'control' },
        { from: '4', to: '5', label: '', kind: 'control' },
      ],
      form: {
        questions: [
          this.templateQuestion('Nombre completo del estudiante', 'text'),
          this.templateQuestion('Codigo universitario', 'text'),
          this.templateQuestion(
            isAcademicCase ? 'Materias solicitadas y justificacion' : 'Descripcion de la solicitud',
            'textarea',
          ),
        ],
        attachments: [
          this.templateAttachment('Carnet de identidad', 'PDF, JPG, PNG'),
          this.templateAttachment(
            isCertificate ? 'Comprobante de pago' : 'Respaldo de la solicitud',
            'PDF, DOCX, XLSX, JPG, PNG',
          ),
        ],
      },
    };
  }

  private templateNode(
    type: UmlNodeType,
    label: string,
    x: number,
    y: number,
    department: string,
  ): Omit<UmlNode, 'id' | 'selected'> {
    return {
      type,
      label,
      x,
      y,
      department,
      laneId: this.resolveLane(undefined, department).id,
      assignee: '',
      description: '',
    };
  }

  private templateQuestion(label: string, type: FormQuestion['type'], options = ''): FormQuestion {
    return { id: crypto.randomUUID(), label, type, required: true, options };
  }

  private templateAttachment(label: string, acceptedFormats: string): AttachmentRequirement {
    return { id: crypto.randomUUID(), label, acceptedFormats, required: true };
  }

  private mergeForms(current: PolicyFormDraft, suggestion: PolicyFormDraft): PolicyFormDraft {
    const questionLabels = new Set(current.questions.map((question) => question.label));
    const attachmentLabels = new Set(current.attachments.map((attachment) => attachment.label));
    return {
      questions: [
        ...current.questions,
        ...suggestion.questions
          .filter((question) => !questionLabels.has(question.label))
          .map((question) => ({ ...question, id: crypto.randomUUID() })),
      ],
      attachments: [
        ...current.attachments,
        ...suggestion.attachments
          .filter((attachment) => !attachmentLabels.has(attachment.label))
          .map((attachment) => ({ ...attachment, id: crypto.randomUUID() })),
      ],
    };
  }
}
