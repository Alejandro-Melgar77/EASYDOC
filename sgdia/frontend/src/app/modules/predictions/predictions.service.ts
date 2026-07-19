import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface BottleneckAlert {
  id: string;
  stage: string;
  riskLevel: 'high' | 'medium' | 'low';
  avgDelay: string;
  trend: 'up' | 'down' | 'stable';
}

export interface ResourceSuggestion {
  user: string;
  currentLoad: number;
  optimalLoad: number;
  suggestion: string;
}

export interface ModelStatus {
  modelName: string;
  modelType: string;
  trainedAt: string;
  sampleCount: number;
  isSynthetic: boolean;
  routeMatchRate: number;
  durationMaeDays: number;
  policiesEvaluated: number;
  resourceLoad: Record<string, number>;
}

export interface TrainingReadiness {
  decision: 'blocked' | 'ready_for_human_review';
  automationEnabled: boolean;
  realCompletedWorkflows: number;
  syntheticWorkflows: number;
  minimumRealCompletedWorkflows: number;
  requirements: string[];
}

interface AnomalyResponse {
  anomalies: Array<{
    score: number;
    detected_at: string;
  }>;
}

interface ModelStatusResponse {
  model_name: string;
  model_type: string;
  trained_at: string;
  sample_count: number;
  is_synthetic: boolean;
  route_match_rate: number;
  duration_mae_days: number;
  policies_evaluated: number;
  resource_load: Record<string, number>;
}

interface TrainingReadinessResponse {
  decision: 'blocked' | 'ready_for_human_review';
  automation_enabled: boolean;
  real_completed_workflows: number;
  synthetic_workflows: number;
  minimum_real_completed_workflows: number;
  requirements: string[];
}

@Injectable({
  providedIn: 'root',
})
export class PredictionsService {
  private readonly api = inject(ApiService);

  getBottlenecks(): Observable<BottleneckAlert[]> {
    return this.api
      .get<{
        bottlenecks: Array<{
          node_id: string;
          node_name: string;
          avg_wait_days: number;
          severity: string;
        }>;
      }>('/predictions/bottlenecks')
      .pipe(
        map((response) =>
          response.bottlenecks.map((item) => ({
            id: item.node_id,
            stage: item.node_name,
            riskLevel: this.toRiskLevel(item.severity),
            avgDelay: `${item.avg_wait_days.toFixed(1)} dias`,
            trend: 'stable' as const,
          })),
        ),
        catchError(() => of([])),
      );
  }

  getModelStatus(): Observable<ModelStatus | null> {
    return this.api.get<ModelStatusResponse>('/predictions/model-status').pipe(
      map((response) => ({
        modelName: response.model_name,
        modelType: response.model_type,
        trainedAt: response.trained_at,
        sampleCount: response.sample_count,
        isSynthetic: response.is_synthetic,
        routeMatchRate: response.route_match_rate,
        durationMaeDays: response.duration_mae_days,
        policiesEvaluated: response.policies_evaluated,
        resourceLoad: response.resource_load,
      })),
      catchError(() => of(null)),
    );
  }

  getTrainingReadiness(): Observable<TrainingReadiness | null> {
    return this.api.get<TrainingReadinessResponse>('/predictions/training-readiness').pipe(
      map((response) => ({
        decision: response.decision,
        automationEnabled: response.automation_enabled,
        realCompletedWorkflows: response.real_completed_workflows,
        syntheticWorkflows: response.synthetic_workflows,
        minimumRealCompletedWorkflows: response.minimum_real_completed_workflows,
        requirements: response.requirements,
      })),
      catchError(() => of(null)),
    );
  }

  getResourceOptimizations(): Observable<ResourceSuggestion[]> {
    return this.getModelStatus().pipe(
      map((status) =>
        Object.entries(status?.resourceLoad ?? {})
          .map(([user, currentLoad]) => ({
            user,
            currentLoad: Number(currentLoad.toFixed(1)),
            optimalLoad: 80,
            suggestion: this.resourceSuggestion(currentLoad),
          }))
          .sort((first, second) => second.currentLoad - first.currentLoad),
      ),
    );
  }

  getAnomalyData(): Observable<Array<{ x: number; y: number; r: number }>> {
    return this.api.get<AnomalyResponse>('/predictions/anomalies?period_days=30').pipe(
      map((response) =>
        response.anomalies.map((item) => {
          const detectedAt = new Date(item.detected_at);
          return {
            x: detectedAt.getDate(),
            y: detectedAt.getHours(),
            r: Math.max(5, Math.round(item.score * 15)),
          };
        }),
      ),
      catchError(() => of([])),
    );
  }

  private toRiskLevel(value: string): BottleneckAlert['riskLevel'] {
    if (value === 'critical' || value === 'high') return 'high';
    if (value === 'medium') return 'medium';
    return 'low';
  }

  private resourceSuggestion(currentLoad: number): string {
    if (currentLoad >= 95) return 'Priorizar redistribucion de nuevos expedientes.';
    if (currentLoad >= 80) return 'Supervisar antes de asignar trabajo adicional.';
    return 'Capacidad disponible para nuevas asignaciones.';
  }
}
