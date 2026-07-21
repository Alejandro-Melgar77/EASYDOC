import { Injectable, computed, inject, signal } from '@angular/core';
import { BusinessPolicy } from '../models/business-policy.model';
import { PolicyApiService } from './policy-api.service';

@Injectable({
  providedIn: 'root',
})
export class PolicyLibraryService {
  private policyApi = inject(PolicyApiService);
  private readonly storageKey = 'easydoc_policies';
  private readonly policiesSignal = signal<BusinessPolicy[]>(this.readFromStorage());
  private readonly remoteStateSignal = signal<
    'idle' | 'loading' | 'ready' | 'unauthorized' | 'offline'
  >('idle');
  private readonly remoteMessageSignal = signal<string | null>(null);

  readonly policies = this.policiesSignal.asReadonly();
  readonly totalPolicies = computed(() => this.policiesSignal().length);
  readonly remoteState = this.remoteStateSignal.asReadonly();
  readonly remoteMessage = this.remoteMessageSignal.asReadonly();

  getById(id: string): BusinessPolicy | undefined {
    return this.policiesSignal().find((policy) => policy.id === id);
  }

  upsert(policy: BusinessPolicy): void {
    const currentPolicies = this.policiesSignal();
    const existingIndex = currentPolicies.findIndex((item) => item.id === policy.id);
    const updatedPolicy: BusinessPolicy = {
      ...policy,
      createdAt: existingIndex >= 0 ? currentPolicies[existingIndex].createdAt : policy.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const updatedPolicies =
      existingIndex >= 0
        ? currentPolicies.map((item, index) => (index === existingIndex ? updatedPolicy : item))
        : [updatedPolicy, ...currentPolicies];

    this.setPolicies(updatedPolicies);
  }

  savePolicy(policy: BusinessPolicy): void {
    this.upsert(policy);
  }

  remove(id: string): void {
    this.setPolicies(this.policiesSignal().filter((policy) => policy.id !== id));
  }

  refreshFromServer(): void {
    if (!this.policyApi.canUseRemotePersistence()) {
      this.remoteStateSignal.set('unauthorized');
      this.remoteMessageSignal.set(
        'Inicia sesion con una cuenta institucional para consultar las politicas publicadas.',
      );
      return;
    }

    this.remoteStateSignal.set('loading');
    this.remoteMessageSignal.set(null);
    this.policyApi.list().subscribe({
      next: (policies) => {
        this.setPolicies(policies);
        this.remoteStateSignal.set('ready');
      },
      error: (error: unknown) => {
        const status = this.httpStatus(error);
        if (status === 401 || status === 403) {
          this.remoteStateSignal.set('unauthorized');
          this.remoteMessageSignal.set(
            'Tu sesion no tiene permiso para leer politicas. Ingresa con una cuenta autorizada.',
          );
          return;
        }

        this.remoteStateSignal.set('offline');
        this.remoteMessageSignal.set(
          'No se pudo sincronizar con el servidor. Se muestran solo politicas guardadas en este navegador.',
        );
      },
    });
  }

  clearLocalCache(): void {
    this.setPolicies([]);
  }

  private setPolicies(policies: BusinessPolicy[]): void {
    this.policiesSignal.set(policies);

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(policies));
    } catch {
      // The UI remains available when browser storage is unavailable.
    }
  }

  private readFromStorage(): BusinessPolicy[] {
    try {
      const storedPolicies = localStorage.getItem(this.storageKey);
      if (!storedPolicies) {
        return [];
      }

      const parsedPolicies: unknown = JSON.parse(storedPolicies);
      return Array.isArray(parsedPolicies)
        ? parsedPolicies.filter((policy): policy is BusinessPolicy => this.isBusinessPolicy(policy))
        : [];
    } catch {
      return [];
    }
  }

  private httpStatus(error: unknown): number | null {
    if (!error || typeof error !== 'object' || !('status' in error)) {
      return null;
    }

    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : null;
  }

  private isBusinessPolicy(value: unknown): value is BusinessPolicy {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const policy = value as Partial<BusinessPolicy>;
    return (
      typeof policy.id === 'string' &&
      typeof policy.name === 'string' &&
      typeof policy.createdAt === 'string' &&
      typeof policy.updatedAt === 'string' &&
      typeof policy.version === 'number' &&
      (policy.status === 'draft' ||
        policy.status === 'published' ||
        policy.status === 'archived') &&
      Array.isArray(policy.nodes) &&
      Array.isArray(policy.edges) &&
      !!policy.form &&
      Array.isArray(policy.form.questions) &&
      Array.isArray(policy.form.attachments)
    );
  }
}
