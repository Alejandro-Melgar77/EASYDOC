import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

interface OnlyOfficeConfig {
  document: { title: string };
  editorConfig: { mode?: 'edit' | 'view' };
}

interface OnlyOfficeEditor {
  destroyEditor?: () => void;
}

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (elementId: string, config: OnlyOfficeConfig) => OnlyOfficeEditor;
    };
  }
}

@Component({
  selector: 'app-policy-document-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="policy-document-editor">
      <header class="editor-header glass-panel">
        <button type="button" class="icon-button" (click)="goBack()" title="Volver a politicas">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <span class="ed-page-kicker">Documento controlado</span>
          <h1>{{ title() || 'Abriendo documento maestro' }}</h1>
        </div>
        <span class="editor-mode" [class.editor-mode-view]="mode() === 'view'">
          <span class="material-symbols-outlined">{{
            mode() === 'edit' ? 'edit' : 'visibility'
          }}</span>
          {{ mode() === 'edit' ? 'Edicion colaborativa' : 'Solo lectura' }}
        </span>
      </header>

      <div *ngIf="loading()" class="editor-state glass-panel">
        <span class="material-symbols-outlined loading-icon">sync</span>
        Preparando sesion colaborativa...
      </div>
      <div *ngIf="error() as errorMessage" class="editor-state editor-error glass-panel">
        <span class="material-symbols-outlined">error</span>
        {{ errorMessage }}
      </div>
      <div
        id="onlyoffice-policy-editor"
        class="onlyoffice-host"
        [class.is-hidden]="loading() || !!error()"
      ></div>
    </section>
  `,
  styles: [
    `
      .policy-document-editor {
        display: grid;
        gap: 1rem;
        min-height: calc(100vh - 110px);
      }
      .editor-header {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        padding: 0.85rem 1rem;
      }
      .editor-header h1 {
        margin: 0.1rem 0 0;
        font-size: 1.15rem;
      }
      .editor-header > div {
        min-width: 0;
        flex: 1;
      }
      .icon-button {
        width: 38px;
        height: 38px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-sm);
        background: transparent;
        color: var(--text-primary);
        cursor: pointer;
      }
      .editor-mode {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.35rem 0.55rem;
        border: 1px solid rgba(79, 163, 107, 0.35);
        border-radius: var(--border-radius-md);
        color: var(--success);
        font-size: 0.76rem;
        font-weight: 760;
      }
      .editor-mode-view {
        border-color: rgba(var(--accent-rgb), 0.35);
        color: var(--accent);
      }
      .editor-state {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.65rem;
        min-height: 180px;
        color: var(--text-secondary);
        font-weight: 650;
      }
      .editor-error {
        color: #e69a9a;
        border-color: rgba(210, 93, 93, 0.4);
      }
      .loading-icon {
        animation: spin 1s linear infinite;
      }
      .onlyoffice-host {
        min-height: clamp(560px, calc(100vh - 210px), 980px);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        overflow: hidden;
        background: #fff;
      }
      .is-hidden {
        display: none;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      @media (max-width: 620px) {
        .editor-header {
          align-items: flex-start;
        }
        .editor-mode {
          margin-top: 0.2rem;
        }
        .onlyoffice-host {
          min-height: calc(100vh - 190px);
        }
      }
    `,
  ],
})
export class PolicyDocumentEditorComponent implements AfterViewInit, OnDestroy {
  readonly documentId = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly title = signal('');
  readonly mode = signal<'edit' | 'view'>('view');
  private editor: OnlyOfficeEditor | null = null;

  async ngAfterViewInit(): Promise<void> {
    try {
      const config = await firstValueFrom(
        this.api.post<OnlyOfficeConfig>('/collaboration/sessions', {
          document_id: this.documentId(),
        }),
      );
      this.title.set(config.document.title);
      this.mode.set(config.editorConfig.mode === 'edit' ? 'edit' : 'view');
      await this.loadOnlyOfficeApi();
      if (!window.DocsAPI) {
        throw new Error(
          'No fue posible cargar ONLYOFFICE. Verifica que el servicio este iniciado.',
        );
      }
      this.editor = new window.DocsAPI.DocEditor('onlyoffice-policy-editor', config);
    } catch (error: unknown) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.editor?.destroyEditor?.();
  }

  goBack(): void {
    this.router.navigate(['/policies']);
  }

  private loadOnlyOfficeApi(): Promise<void> {
    if (window.DocsAPI) return Promise.resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[data-easydoc-onlyoffice]');
    if (existing)
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener(
          'error',
          () => reject(new Error('ONLYOFFICE no esta disponible.')),
          { once: true },
        );
      });
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'http://localhost:8080/web-apps/apps/api/documents/api.js';
      script.dataset['easydocOnlyoffice'] = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('ONLYOFFICE no esta disponible.'));
      document.head.append(script);
    });
  }

  private errorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const payload = (error as { error?: { error?: { message?: unknown } } }).error;
      const message = payload?.error?.message;
      if (typeof message === 'string') return message;
    }
    return error instanceof Error ? error.message : 'No fue posible abrir el documento.';
  }
}
