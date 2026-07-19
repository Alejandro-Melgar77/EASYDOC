import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () => import('./modules/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'guest/guide',
    loadComponent: () =>
      import('./modules/guest/guest-guidance.component').then((m) => m.GuestGuidanceComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./shared/layouts/main-layout.component').then((m) => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./modules/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'repository',
        loadComponent: () =>
          import('./modules/repository/repository.component').then((m) => m.RepositoryComponent),
      },
      {
        path: 'policies',
        loadComponent: () =>
          import('./modules/policies/policy-library.component').then(
            (m) => m.PolicyLibraryComponent,
          ),
      },
      {
        path: 'policies/:policyId',
        loadComponent: () =>
          import('./modules/policies/policy-library.component').then(
            (m) => m.PolicyLibraryComponent,
          ),
      },
      {
        path: 'editor',
        loadComponent: () =>
          import('./modules/editor/editor.component').then((m) => m.EditorComponent),
      },
      {
        path: 'uml-designer',
        loadComponent: () =>
          import('./modules/uml-designer/uml-designer.component').then(
            (m) => m.UmlDesignerComponent,
          ),
      },
      {
        path: 'uml-designer/:policyId',
        loadComponent: () =>
          import('./modules/uml-designer/uml-designer.component').then(
            (m) => m.UmlDesignerComponent,
          ),
      },
      {
        path: 'agent',
        loadComponent: () =>
          import('./modules/agent/agent.component').then((m) => m.AgentComponent),
      },
      {
        path: 'predictions',
        loadComponent: () =>
          import('./modules/predictions/predictions.component').then((m) => m.PredictionsComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./modules/reports/reports.component').then((m) => m.ReportsComponent),
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./modules/audit/audit.component').then((m) => m.AuditComponent),
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./modules/admin/admin.component').then((m) => m.AdminComponent),
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
