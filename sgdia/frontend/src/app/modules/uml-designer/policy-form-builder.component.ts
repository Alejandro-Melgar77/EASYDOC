import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FormQuestion, UmlStoreService } from './uml-store.service';

@Component({
  selector: 'app-policy-form-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="form-builder">
      <header class="form-toolbar glass-panel">
        <div>
          <span class="ed-page-kicker">Formulario de protocolo</span>
          <h2>{{ store.processName() }}</h2>
          <p>Define preguntas y requisitos documentales independientes para el estudiante.</p>
        </div>
        <div class="toolbar-actions">
          <button type="button" class="btn btn-secondary" (click)="store.backToDiagram()">
            <span class="material-symbols-outlined">account_tree</span>
            Volver al diagrama
          </button>
          <button type="button" class="btn btn-primary" (click)="savePolicy()">
            <span class="material-symbols-outlined">save</span>
            Guardar politica
          </button>
        </div>
      </header>

      <div
        class="save-alert"
        *ngIf="store.saveState().message"
        [ngClass]="store.saveState().status"
        role="status"
        aria-live="polite"
      >
        <span class="material-symbols-outlined">
          {{ store.saveState().status === 'success' ? 'check_circle' : 'error' }}
        </span>
        {{ store.saveState().message }}
      </div>

      <main class="form-workspace">
        <section class="builder-panel glass-panel">
          <div class="section-title">
            <div>
              <h3>Preguntas</h3>
              <p>Campos que el usuario final debe completar antes de enviar la solicitud.</p>
            </div>
            <button type="button" class="btn btn-secondary" (click)="store.addQuestion()">
              <span class="material-symbols-outlined">add</span>
              Pregunta
            </button>
          </div>

          <div class="empty-block" *ngIf="store.formDraft().questions.length === 0">
            Sin preguntas todavia.
          </div>

          <article
            class="builder-item"
            *ngFor="
              let question of store.formDraft().questions;
              let i = index;
              trackBy: trackByQuestion
            "
          >
            <div class="item-index">{{ i + 1 }}</div>
            <div class="item-fields">
              <label>
                Enunciado
                <input
                  class="form-control"
                  [ngModel]="question.label"
                  [name]="'question-label-' + question.id"
                  (ngModelChange)="store.updateQuestion(question.id, { label: $event })"
                />
              </label>

              <div class="field-grid">
                <label>
                  Tipo
                  <select
                    class="form-control"
                    [ngModel]="question.type"
                    [name]="'question-type-' + question.id"
                    (ngModelChange)="updateQuestionType(question.id, $event)"
                  >
                    <option value="text">Texto corto</option>
                    <option value="textarea">Texto largo</option>
                    <option value="date">Fecha</option>
                    <option value="select">Lista</option>
                  </select>
                </label>

                <label class="switch-row">
                  <input
                    type="checkbox"
                    [ngModel]="question.required"
                    [name]="'question-required-' + question.id"
                    (ngModelChange)="store.updateQuestion(question.id, { required: $event })"
                  />
                  Obligatoria
                </label>
              </div>

              <label *ngIf="question.type === 'select'">
                Opciones separadas por coma
                <input
                  class="form-control"
                  placeholder="Opcion A, Opcion B"
                  [ngModel]="question.options"
                  [name]="'question-options-' + question.id"
                  (ngModelChange)="store.updateQuestion(question.id, { options: $event })"
                />
              </label>
            </div>
            <button
              type="button"
              class="icon-danger"
              title="Eliminar pregunta"
              (click)="store.deleteQuestion(question.id)"
            >
              <span class="material-symbols-outlined">delete</span>
            </button>
          </article>
        </section>

        <section class="builder-panel glass-panel">
          <div class="section-title">
            <div>
              <h3>Archivos solicitados</h3>
              <p>Cada requisito es un espacio de carga propio: carnet, licencia, registro, etc.</p>
            </div>
            <button type="button" class="btn btn-secondary" (click)="store.addAttachment()">
              <span class="material-symbols-outlined">upload_file</span>
              Archivo
            </button>
          </div>

          <div class="empty-block" *ngIf="store.formDraft().attachments.length === 0">
            Sin archivos solicitados todavia.
          </div>

          <article
            class="builder-item"
            *ngFor="
              let attachment of store.formDraft().attachments;
              let i = index;
              trackBy: trackByAttachment
            "
          >
            <div class="item-index">{{ i + 1 }}</div>
            <div class="item-fields">
              <label>
                Nombre del requisito
                <input
                  class="form-control"
                  [ngModel]="attachment.label"
                  [name]="'attachment-label-' + attachment.id"
                  (ngModelChange)="store.updateAttachment(attachment.id, { label: $event })"
                />
              </label>

              <div class="field-grid">
                <label>
                  Formatos aceptados
                  <input
                    class="form-control"
                    [ngModel]="attachment.acceptedFormats"
                    [name]="'attachment-format-' + attachment.id"
                    (ngModelChange)="
                      store.updateAttachment(attachment.id, { acceptedFormats: $event })
                    "
                  />
                </label>

                <label class="switch-row">
                  <input
                    type="checkbox"
                    [ngModel]="attachment.required"
                    [name]="'attachment-required-' + attachment.id"
                    (ngModelChange)="store.updateAttachment(attachment.id, { required: $event })"
                  />
                  Obligatorio
                </label>
              </div>
            </div>
            <button
              type="button"
              class="icon-danger"
              title="Eliminar requisito"
              (click)="store.deleteAttachment(attachment.id)"
            >
              <span class="material-symbols-outlined">delete</span>
            </button>
          </article>
        </section>
      </main>
    </section>
  `,
  styles: [
    `
      .form-builder {
        min-height: 100%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        overflow: auto;
        background: var(--bg-primary);
      }

      .form-toolbar {
        min-height: 92px;
        padding: 1rem 1.25rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        border-radius: 8px;

        h2 {
          font-size: 1.25rem;
          margin: 0.2rem 0;
        }

        p {
          color: var(--text-secondary);
          font-size: 0.88rem;
        }
      }

      .toolbar-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .save-alert {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.85rem 1rem;
        border-radius: 8px;
        border: 1px solid var(--border-color);
        color: var(--text-primary);

        &.success {
          border-color: rgba(79, 163, 107, 0.34);
          background: rgba(79, 163, 107, 0.13);
          color: var(--success);
        }

        &.error {
          border-color: rgba(196, 87, 87, 0.34);
          background: rgba(196, 87, 87, 0.12);
          color: var(--danger);
        }
      }

      .form-workspace {
        min-height: 0;
        flex: 1;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 1rem;
        overflow: hidden;
      }

      .builder-panel {
        border-radius: 8px;
        padding: 1rem;
        overflow-y: auto;
        background: rgba(var(--primary-rgb), 0.12);
      }

      .section-title {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
        padding-bottom: 0.9rem;
        border-bottom: 1px solid var(--border-color);

        h3 {
          margin: 0 0 0.25rem;
          font-size: 1rem;
        }

        p {
          color: var(--text-secondary);
          font-size: 0.82rem;
          line-height: 1.4;
        }
      }

      .empty-block {
        padding: 1rem;
        border: 1px dashed var(--border-color);
        border-radius: 8px;
        color: var(--text-muted);
        text-align: center;
      }

      .builder-item {
        display: grid;
        grid-template-columns: 34px minmax(0, 1fr) 38px;
        gap: 0.8rem;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        padding: 0.9rem;
        border: 1px solid rgba(246, 241, 232, 0.09);
        border-radius: 8px;
        background: rgba(7, 16, 27, 0.42);

        &:focus-within {
          border-color: rgba(var(--accent-rgb), 0.48);
          box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.1);
        }
      }

      .item-index {
        width: 30px;
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: rgba(var(--accent-rgb), 0.13);
        color: var(--accent);
        font-weight: 900;
      }

      .item-fields {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      label {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        color: var(--text-secondary);
        font-size: 0.78rem;
        font-weight: 800;
      }

      .field-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 140px;
        gap: 0.75rem;
        align-items: end;
      }

      .switch-row {
        min-height: 42px;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: rgba(var(--primary-rgb), 0.15);

        input {
          accent-color: var(--accent);
        }
      }

      .icon-danger {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: 1px solid rgba(196, 87, 87, 0.3);
        background: rgba(196, 87, 87, 0.08);
        color: var(--danger);
        cursor: pointer;

        &:hover {
          background: rgba(196, 87, 87, 0.17);
        }
      }

      @media (max-width: 1100px) {
        .form-toolbar,
        .section-title {
          flex-direction: column;
          align-items: stretch;
        }

        .form-workspace {
          grid-template-columns: 1fr;
          overflow-y: auto;
        }

        .builder-panel {
          overflow: visible;
        }
      }

      @media (max-width: 640px) {
        .form-builder {
          padding: 0.65rem;
        }

        .toolbar-actions {
          display: grid;
          grid-template-columns: 1fr;
        }

        .toolbar-actions .btn {
          width: 100%;
          justify-content: center;
        }

        .builder-item {
          grid-template-columns: 30px minmax(0, 1fr) 34px;
          gap: 0.55rem;
          padding: 0.7rem;
        }

        .field-grid {
          grid-template-columns: 1fr;
        }

        .switch-row {
          justify-content: flex-start;
          padding: 0 0.75rem;
        }
      }
    `,
  ],
})
export class PolicyFormBuilderComponent {
  store = inject(UmlStoreService);
  private router = inject(Router);

  updateQuestionType(id: string, type: FormQuestion['type']): void {
    this.store.updateQuestion(id, { type });
  }

  savePolicy(): void {
    this.store.savePolicy().subscribe((policy) => {
      if (!policy) return;
      window.setTimeout(() => {
        void this.router.navigate(['/policies'], { queryParams: { created: policy.id } });
      }, 900);
    });
  }

  trackByQuestion(_index: number, question: FormQuestion): string {
    return question.id;
  }

  trackByAttachment(_index: number, attachment: { id: string }): string {
    return attachment.id;
  }
}
