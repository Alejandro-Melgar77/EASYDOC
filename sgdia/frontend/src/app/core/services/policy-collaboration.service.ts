import { Injectable, computed, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export type PolicyOperationName =
  | 'node.create'
  | 'node.update'
  | 'node.delete'
  | 'edge.create'
  | 'edge.update'
  | 'edge.delete'
  | 'lane.create'
  | 'lane.update'
  | 'lane.delete'
  | 'form.update';

export interface PolicyCollaborationOperation {
  operation: PolicyOperationName;
  payload: Record<string, unknown>;
  actorId: string;
}

type CollaborationStatus = 'idle' | 'connecting' | 'connected' | 'unavailable';

@Injectable({
  providedIn: 'root',
})
export class PolicyCollaborationService {
  private socket: WebSocket | null = null;
  private policyId: string | null = null;
  private statusSignal = signal<CollaborationStatus>('idle');
  private connectedUsersSignal = signal<string[]>([]);
  private lastOperationSignal = signal<PolicyCollaborationOperation | null>(null);
  private lastPersistedAtSignal = signal<string | null>(null);
  private persistenceErrorSignal = signal<string | null>(null);
  private heartbeatId: ReturnType<typeof setInterval> | null = null;
  private reconnectId: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private pendingOperations: Array<Record<string, unknown>> = [];

  readonly status = this.statusSignal.asReadonly();
  readonly connectedUsers = this.connectedUsersSignal.asReadonly();
  readonly lastOperation = this.lastOperationSignal.asReadonly();
  readonly lastPersistedAt = this.lastPersistedAtSignal.asReadonly();
  readonly persistenceError = this.persistenceErrorSignal.asReadonly();
  readonly isConnected = computed(() => this.statusSignal() === 'connected');
  /** Personas adicionales en la sala; el editor actual no se cuenta a si mismo. */
  readonly remoteCollaboratorCount = computed(() =>
    this.isConnected() ? Math.max(0, this.connectedUsersSignal().length - 1) : 0,
  );

  connect(policyId: string): void {
    if (
      this.policyId === policyId &&
      (this.socket?.readyState === WebSocket.OPEN ||
        this.socket?.readyState === WebSocket.CONNECTING)
    )
      return;
    this.disconnect();

    const token = localStorage.getItem('access_token');
    if (!token || token.startsWith('mock_')) {
      this.statusSignal.set('unavailable');
      return;
    }

    this.policyId = policyId;
    this.shouldReconnect = true;
    this.lastPersistedAtSignal.set(null);
    this.persistenceErrorSignal.set(null);
    this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.policyId = null;
    this.connectedUsersSignal.set([]);
    this.clearReconnect();
    this.stopHeartbeat();
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.pendingOperations = [];
    this.statusSignal.set('idle');
  }

  send(operation: PolicyOperationName, payload: Record<string, unknown>): void {
    if (!this.policyId) return;
    const message: Record<string, unknown> = {
      type: 'operation',
      operation,
      payload,
      client_operation_id: crypto.randomUUID(),
    };
    this.persistenceErrorSignal.set(null);

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      return;
    }

    // The editor stays responsive while a real network reconnection completes.
    this.pendingOperations = [...this.pendingOperations.slice(-99), message];
  }

  private openSocket(): void {
    const policyId = this.policyId;
    const token = localStorage.getItem('access_token');
    if (!policyId || !token || token.startsWith('mock_')) {
      this.statusSignal.set('unavailable');
      return;
    }

    this.statusSignal.set('connecting');
    const url = `${this.websocketBaseUrl()}/ws/policy-collaboration/${encodeURIComponent(policyId)}?token=${encodeURIComponent(token)}`;

    try {
      const socket = new WebSocket(url);
      this.socket = socket;
      socket.addEventListener('open', () => {
        if (this.socket !== socket) return;
        this.statusSignal.set('connected');
        this.flushPendingOperations(socket);
        this.heartbeatId = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' }));
        }, 25_000);
      });
      socket.addEventListener('close', () => {
        if (this.socket !== socket) return;
        this.stopHeartbeat();
        this.socket = null;
        this.connectedUsersSignal.set([]);
        if (this.shouldReconnect && this.policyId === policyId) {
          this.statusSignal.set('unavailable');
          this.scheduleReconnect();
        } else this.statusSignal.set('idle');
      });
      socket.addEventListener('error', () => this.statusSignal.set('unavailable'));
      socket.addEventListener('message', (event) => this.handleMessage(event.data));
    } catch {
      this.statusSignal.set('unavailable');
      this.scheduleReconnect();
    }
  }

  private flushPendingOperations(socket: WebSocket): void {
    const queued = this.pendingOperations;
    this.pendingOperations = [];
    queued.forEach((message) => socket.send(JSON.stringify(message)));
  }

  private handleMessage(rawMessage: unknown): void {
    if (typeof rawMessage !== 'string') return;

    try {
      const message = JSON.parse(rawMessage) as {
        type?: string;
        users?: unknown;
        operation?: PolicyOperationName;
        payload?: Record<string, unknown>;
        actor_id?: string;
        updated_at?: string;
        detail?: string;
      };
      if (message.type === 'presence' && Array.isArray(message.users)) {
        this.connectedUsersSignal.set(
          message.users.filter((item): item is string => typeof item === 'string'),
        );
      }
      if (
        message.type === 'operation' &&
        message.operation &&
        message.payload &&
        typeof message.actor_id === 'string'
      ) {
        this.lastOperationSignal.set({
          operation: message.operation,
          payload: message.payload,
          actorId: message.actor_id,
        });
      }
      if (message.type === 'persistence' && typeof message.updated_at === 'string') {
        this.lastPersistedAtSignal.set(message.updated_at);
        this.persistenceErrorSignal.set(null);
      }
      if (message.type === 'error' && typeof message.detail === 'string')
        this.persistenceErrorSignal.set(message.detail);
    } catch {
      // A malformed real-time message is ignored without interrupting the editor.
    }
  }

  private websocketBaseUrl(): string {
    const configuredUrl = environment.wsUrl ?? environment.apiUrl.replace(/\/api$/, '');
    return configuredUrl.replace(/^http/, 'ws').replace(/\/$/, '');
  }

  private stopHeartbeat(): void {
    if (this.heartbeatId !== null) {
      clearInterval(this.heartbeatId);
      this.heartbeatId = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectId !== null) return;
    this.reconnectId = setTimeout(() => {
      this.reconnectId = null;
      this.openSocket();
    }, 2_000);
  }

  private clearReconnect(): void {
    if (this.reconnectId !== null) {
      clearTimeout(this.reconnectId);
      this.reconnectId = null;
    }
  }
}
