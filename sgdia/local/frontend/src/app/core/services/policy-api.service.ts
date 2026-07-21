import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BusinessPolicy, PolicyArtifact } from '../models/business-policy.model';
import { ApiService } from './api.service';

interface PolicyApiResponse {
  id: string;
  title: string;
  description?: string | null;
  diagram_data: { nodes: unknown[]; edges: unknown[]; lanes?: unknown[] };
  form_definition: { questions: unknown[]; attachments: unknown[] };
  artifacts?: PolicyArtifact[];
  status: 'draft' | 'in_review' | 'published' | 'archived';
  version: number;
  created_at: string;
  updated_at: string;
}

interface PolicyListApiResponse {
  policies: PolicyApiResponse[];
}

@Injectable({
  providedIn: 'root',
})
export class PolicyApiService {
  private api = inject(ApiService);

  save(policy: BusinessPolicy): Observable<BusinessPolicy> {
    const payload = {
      title: policy.name,
      description: policy.description,
      diagram_data: { nodes: policy.nodes, edges: policy.edges, lanes: policy.lanes ?? [] },
      form_definition: policy.form,
    };

    if (this.isRemoteId(policy.id)) {
      return this.api
        .put<PolicyApiResponse>(`/policies/${policy.id}`, {
          ...payload,
          expected_version: policy.version,
          change_summary: 'Edicion desde el diagramador EASYDOC',
        })
        .pipe(map((response) => this.toBusinessPolicy(response)));
    }

    return this.api
      .post<PolicyApiResponse>('/policies/', payload)
      .pipe(map((response) => this.toBusinessPolicy(response)));
  }

  get(policyId: string): Observable<BusinessPolicy> {
    return this.api
      .get<PolicyApiResponse>(`/policies/${policyId}`)
      .pipe(map((response) => this.toBusinessPolicy(response)));
  }

  list(): Observable<BusinessPolicy[]> {
    return this.api
      .get<PolicyListApiResponse>('/policies/')
      .pipe(map((response) => response.policies.map((policy) => this.toBusinessPolicy(policy))));
  }

  canUseRemotePersistence(): boolean {
    const token = localStorage.getItem('access_token');
    return Boolean(token && !token.startsWith('mock_'));
  }

  isRemoteId(policyId: string): boolean {
    return /^[a-f\d]{24}$/i.test(policyId);
  }

  private toBusinessPolicy(response: PolicyApiResponse): BusinessPolicy {
    return {
      id: response.id,
      name: response.title,
      description: response.description ?? undefined,
      status: response.status === 'in_review' ? 'draft' : response.status,
      version: response.version,
      createdAt: response.created_at,
      updatedAt: response.updated_at,
      nodes: response.diagram_data.nodes,
      edges: response.diagram_data.edges,
      lanes: response.diagram_data.lanes ?? [],
      form: response.form_definition,
      artifacts: response.artifacts ?? [],
    };
  }
}
