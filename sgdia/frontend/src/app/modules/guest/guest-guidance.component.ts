import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

interface GuidanceRequirement {
  id: string;
  label: string;
  required: boolean;
}

interface GuidanceResponse {
  outcome: 'recommended' | 'clarify';
  message: string;
  confidence: number;
  policy_id?: string;
  policy_title?: string;
  rationale: string[];
  requirements: GuidanceRequirement[];
  suggested_questions: string[];
}

interface PublicQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'select' | 'number' | 'email' | 'tel';
  required: boolean;
  options: string | string[];
}

interface PublicService {
  id: string;
  title: string;
  description?: string;
  form_definition: { questions: PublicQuestion[]; attachments: GuidanceRequirement[] };
}

interface Receipt {
  tracking_code: string;
  receipt_pin: string;
}

interface TrackingStage {
  id: string;
  label: string | null;
  department: string | null;
}

interface TrackingEntry {
  at: string;
  status: string;
  detail: string;
}

interface RequestTracking {
  tracking_code: string;
  service_title: string;
  status: string;
  current_stage: string | null;
  current_department: string | null;
  active_stages: TrackingStage[];
  is_fully_completed: boolean;
  final_response: string | null;
  final_response_pending_approval: boolean;
  timeline: TrackingEntry[];
}

@Component({
  selector: 'app-guest-guidance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="guest-workspace">
      <header class="guest-masthead">
        <a class="guest-brand" routerLink="/guest/guide" aria-label="EASYDOC">
          <span class="material-symbols-outlined">verified</span>
          <span>EASYDOC</span>
        </a>
        <a class="staff-entry" routerLink="/auth/login">
          Ingreso de funcionarios <span class="material-symbols-outlined">login</span>
        </a>
      </header>

      <section class="guest-grid">
        <aside class="orientation-rail">
          <span class="rail-kicker">Direccion de carrera</span>
          <h1>Tu tramite, con ruta clara.</h1>
          <p>
            Describe tu situacion academica. El asesor local relaciona tu caso con las politicas
            publicadas y te conduce al formulario correcto.
          </p>
          <ol class="rail-steps">
            <li><span>01</span> Describe el caso</li>
            <li><span>02</span> Revisa los requisitos</li>
            <li><span>03</span> Registra y sigue el expediente</li>
          </ol>
          <div class="local-note">
            <span class="material-symbols-outlined">shield</span>
            Orientacion con corpus local de politicas academicas.
          </div>
        </aside>

        <section class="guidance-desk" aria-label="Orientacion academica">
          <div class="desk-heading">
            <div>
              <span class="desk-kicker">Asistente EASY</span>
              <h2>Cuéntame qué necesitas resolver</h2>
            </div>
            <span class="desk-seal">Sin cuenta</span>
          </div>

          <label class="query-label" for="case-query">Situacion academica o administrativa</label>
          <textarea
            id="case-query"
            [(ngModel)]="query"
            placeholder="Ejemplo: Estoy retrasado en algunas materias y necesito cursar una que tiene un prerrequisito pendiente."
            rows="5"
          ></textarea>
          <div class="query-actions">
            <span>La recomendacion se basa en politicas publicadas.</span>
            <button class="btn btn-accent" type="button" [disabled]="guiding" (click)="guide()">
              <span class="material-symbols-outlined">auto_awesome</span>
              {{ guiding ? 'Analizando...' : 'Orientarme' }}
            </button>
          </div>

          <p class="error-note" *ngIf="error">{{ error }}</p>

          <section
            class="guidance-result"
            *ngIf="guidance as result"
            [class.clarify]="result.outcome === 'clarify'"
          >
            <span class="result-icon material-symbols-outlined">
              {{ result.outcome === 'recommended' ? 'route' : 'help' }}
            </span>
            <div>
              <span class="result-kicker">{{
                result.outcome === 'recommended' ? 'Ruta recomendada' : 'Necesitamos un dato mas'
              }}</span>
              <h3>{{ result.policy_title || 'Aclaremos tu solicitud' }}</h3>
              <p>{{ result.message }}</p>
              <div class="confidence" *ngIf="result.outcome === 'recommended'">
                <span [style.width.%]="result.confidence * 100"></span>
                Confianza local {{ result.confidence * 100 | number: '1.0-0' }}%
              </div>
            </div>
          </section>

          <section class="form-dossier" *ngIf="service as currentService">
            <div class="dossier-heading">
              <div>
                <span class="desk-kicker">Expediente nuevo</span>
                <h2>{{ currentService.title }}</h2>
              </div>
              <span class="dossier-code">POLITICA PUBLICADA</span>
            </div>

            <form (ngSubmit)="submitRequest()" #guestForm="ngForm">
              <div class="form-section">
                <h3>Datos del solicitante</h3>
                <div class="two-columns">
                  <label
                    >Nombre completo<input name="fullName" [(ngModel)]="fullName" required
                  /></label>
                  <label
                    >Correo institucional<input name="email" type="email" [(ngModel)]="email"
                  /></label>
                  <label
                    >Registro universitario<input name="universityId" [(ngModel)]="universityId"
                  /></label>
                </div>
              </div>

              <div class="form-section" *ngIf="currentService.form_definition.questions.length">
                <h3>Formulario de la politica</h3>
                <div class="two-columns">
                  <label
                    *ngFor="let question of currentService.form_definition.questions"
                    [class.full]="question.type === 'textarea'"
                  >
                    {{ question.label }}
                    <textarea
                      *ngIf="question.type === 'textarea'"
                      [name]="question.id"
                      [(ngModel)]="answers[question.id]"
                      [required]="question.required"
                      rows="4"
                    ></textarea>
                    <select
                      *ngIf="question.type === 'select'"
                      [name]="question.id"
                      [(ngModel)]="answers[question.id]"
                      [required]="question.required"
                    >
                      <option value="">Selecciona una opcion</option>
                      <option *ngFor="let option of optionsFor(question)" [value]="option">
                        {{ option }}
                      </option>
                    </select>
                    <input
                      *ngIf="question.type !== 'textarea' && question.type !== 'select'"
                      [name]="question.id"
                      [type]="inputType(question.type)"
                      [(ngModel)]="answers[question.id]"
                      [required]="question.required"
                    />
                  </label>
                </div>
              </div>

              <div class="form-section" *ngIf="currentService.form_definition.attachments.length">
                <h3>Requisitos documentales</h3>
                <div class="requirements">
                  <label
                    class="requirement"
                    *ngFor="let requirement of currentService.form_definition.attachments"
                  >
                    <input
                      type="file"
                      [required]="requirement.required"
                      (change)="setFile(requirement.id, $event)"
                    />
                    <span class="material-symbols-outlined">upload_file</span>
                    <span
                      ><strong>{{ requirement.label }}</strong
                      ><small>{{
                        files[requirement.id]?.name || 'Seleccionar archivo'
                      }}</small></span
                    >
                    <span class="required-mark" *ngIf="requirement.required">Obligatorio</span>
                  </label>
                </div>
              </div>

              <button
                class="btn btn-primary submit-request"
                type="submit"
                [disabled]="submitting || !guestForm.valid"
              >
                <span class="material-symbols-outlined">send</span>
                {{ submitting ? 'Registrando expediente...' : 'Registrar solicitud' }}
              </button>
            </form>
          </section>

          <section class="receipt" *ngIf="receipt as savedReceipt">
            <span class="material-symbols-outlined">verified</span>
            <div>
              <span>Solicitud registrada</span><strong>{{ savedReceipt.tracking_code }}</strong>
            </div>
            <div class="receipt-pin">
              <span>PIN de recibo</span><strong>{{ savedReceipt.receipt_pin }}</strong>
            </div>
          </section>

          <section class="tracking-desk" aria-label="Seguimiento de solicitud">
            <div class="tracking-heading">
              <div>
                <span class="desk-kicker">Consulta segura</span>
                <h2>Ubica tu expediente</h2>
              </div>
              <span class="material-symbols-outlined">travel_explore</span>
            </div>
            <div class="tracking-query">
              <label>
                Codigo de solicitud
                <input
                  [(ngModel)]="trackingCode"
                  name="trackingCode"
                  placeholder="ED-2026-XXXXXXXX"
                />
              </label>
              <label>
                PIN de recibo
                <input
                  [(ngModel)]="trackingPin"
                  name="trackingPin"
                  inputmode="numeric"
                  placeholder="8 digitos"
                />
              </label>
              <button
                class="btn btn-secondary"
                type="button"
                [disabled]="trackingLoading"
                (click)="loadTracking()"
              >
                <span class="material-symbols-outlined">manage_search</span>
                {{ trackingLoading ? 'Consultando...' : 'Ver estado' }}
              </button>
            </div>
            <p class="error-note" *ngIf="trackingError">{{ trackingError }}</p>

            <div class="tracking-result" *ngIf="tracking as currentTracking">
              <div
                class="tracking-result-top"
                [class.completed]="currentTracking.is_fully_completed"
              >
                <span class="material-symbols-outlined">{{
                  currentTracking.is_fully_completed ? 'task_alt' : 'sync'
                }}</span>
                <div>
                  <span class="result-kicker">{{
                    currentTracking.is_fully_completed
                      ? 'Solicitud totalmente culminada'
                      : 'Expediente en seguimiento'
                  }}</span>
                  <h3>{{ currentTracking.service_title }}</h3>
                  <p>{{ statusLabel(currentTracking.status) }}</p>
                </div>
              </div>

              <div class="stage-grid" *ngIf="!currentTracking.is_fully_completed">
                <div>
                  <span>Etapa actual</span>
                  <strong>{{ currentTracking.current_stage || 'En preparacion' }}</strong>
                </div>
                <div>
                  <span>Departamento responsable</span>
                  <strong>{{
                    currentTracking.current_department || 'Recepcion y ventanilla'
                  }}</strong>
                </div>
              </div>

              <div class="parallel-stages" *ngIf="currentTracking.active_stages.length > 1">
                <span>Actividades en paralelo</span>
                <strong *ngFor="let stage of currentTracking.active_stages"
                  >{{ stage.label }} · {{ stage.department }}</strong
                >
              </div>

              <div class="final-answer" *ngIf="currentTracking.final_response">
                <span class="material-symbols-outlined">mark_email_read</span>
                <div>
                  <span>{{
                    currentTracking.final_response_pending_approval
                      ? 'Respuesta en revision jerarquica'
                      : 'Respuesta institucional'
                  }}</span>
                  <p>{{ currentTracking.final_response }}</p>
                </div>
              </div>

              <ol class="tracking-timeline">
                <li *ngFor="let entry of currentTracking.timeline">
                  <span class="timeline-marker"></span>
                  <div>
                    <strong>{{ statusLabel(entry.status) }}</strong>
                    <p>{{ entry.detail }}</p>
                    <small>{{ entry.at | date: 'dd/MM/yyyy, HH:mm' }}</small>
                  </div>
                </li>
              </ol>
            </div>
          </section>
        </section>
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: var(--bg-primary);
      }
      .guest-workspace {
        max-width: 1320px;
        min-height: 100vh;
        margin: 0 auto;
        padding: 0 1.25rem 3rem;
      }
      .guest-masthead {
        height: 76px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid var(--border-color);
      }
      .guest-brand,
      .staff-entry {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        text-decoration: none;
        font-weight: 850;
        color: var(--text-primary);
      }
      .guest-brand {
        letter-spacing: 1px;
        color: var(--accent);
      }
      .staff-entry {
        color: var(--text-secondary);
        font-size: 0.82rem;
      }
      .staff-entry .material-symbols-outlined {
        font-size: 1rem;
      }
      .guest-grid {
        display: grid;
        grid-template-columns: minmax(280px, 0.72fr) minmax(0, 1.5fr);
        gap: 2rem;
        padding-top: 2rem;
      }
      .orientation-rail {
        padding: 1.25rem 1.1rem 1.25rem 0;
        border-top: 4px solid var(--accent);
        align-self: start;
      }
      .rail-kicker,
      .desk-kicker,
      .result-kicker {
        display: block;
        color: var(--accent);
        text-transform: uppercase;
        font-size: 0.7rem;
        font-weight: 850;
        letter-spacing: 0.8px;
      }
      .orientation-rail h1 {
        margin: 0.7rem 0;
        max-width: 10ch;
        color: var(--text-primary);
        font-size: clamp(2rem, 4vw, 3.5rem);
        line-height: 1.04;
      }
      .orientation-rail p {
        color: var(--text-secondary);
        line-height: 1.65;
        max-width: 30ch;
      }
      .rail-steps {
        padding: 1rem 0 0;
        list-style: none;
        counter-reset: none;
        display: grid;
        gap: 0.8rem;
        color: var(--text-primary);
        font-weight: 700;
        font-size: 0.86rem;
      }
      .rail-steps li {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .rail-steps span {
        color: var(--accent);
        font-family:
          Roboto Mono,
          monospace;
        font-size: 0.75rem;
      }
      .local-note {
        margin-top: 2rem;
        display: flex;
        gap: 0.6rem;
        color: var(--text-muted);
        font-size: 0.78rem;
        line-height: 1.5;
      }
      .local-note .material-symbols-outlined {
        color: var(--secondary);
        font-size: 1.1rem;
      }
      .guidance-desk {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        padding: clamp(1rem, 3vw, 2rem);
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.12);
      }
      .desk-heading,
      .dossier-heading {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
        margin-bottom: 1.3rem;
      }
      .desk-heading h2,
      .dossier-heading h2 {
        margin: 0.3rem 0 0;
        color: var(--text-primary);
        font-size: 1.45rem;
      }
      .desk-seal,
      .dossier-code,
      .required-mark {
        border: 1px solid rgba(var(--accent-rgb), 0.35);
        padding: 0.3rem 0.45rem;
        color: var(--accent);
        font-size: 0.64rem;
        font-weight: 850;
        text-transform: uppercase;
        letter-spacing: 0.45px;
        white-space: nowrap;
      }
      .query-label {
        display: block;
        margin-bottom: 0.45rem;
        color: var(--text-secondary);
        font-size: 0.82rem;
        font-weight: 750;
      }
      textarea,
      input,
      select {
        width: 100%;
        box-sizing: border-box;
        color: var(--text-primary);
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 0.75rem;
        font: inherit;
      }
      textarea:focus,
      input:focus,
      select:focus {
        outline: 2px solid rgba(var(--secondary-rgb), 0.42);
        border-color: var(--secondary);
      }
      .query-actions {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
        margin-top: 0.8rem;
        color: var(--text-muted);
        font-size: 0.76rem;
      }
      .query-actions .btn {
        flex-shrink: 0;
      }
      .error-note {
        color: var(--danger);
        font-size: 0.84rem;
      }
      .guidance-result {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.9rem;
        margin-top: 1.5rem;
        padding: 1rem;
        border-left: 3px solid var(--secondary);
        background: rgba(var(--secondary-rgb), 0.08);
      }
      .guidance-result.clarify {
        border-left-color: var(--warning);
        background: rgba(214, 162, 61, 0.08);
      }
      .result-icon {
        color: var(--secondary);
      }
      .guidance-result.clarify .result-icon {
        color: var(--warning);
      }
      .guidance-result h3 {
        color: var(--text-primary);
        margin: 0.2rem 0;
      }
      .guidance-result p {
        color: var(--text-secondary);
        margin: 0.3rem 0;
        line-height: 1.45;
      }
      .confidence {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        color: var(--text-muted);
        font-size: 0.72rem;
      }
      .confidence span {
        display: block;
        width: 90px;
        height: 4px;
        background: var(--accent);
      }
      .form-dossier {
        margin-top: 1.8rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--border-color);
      }
      .form-section {
        margin-top: 1.4rem;
      }
      .form-section h3 {
        font-size: 0.9rem;
        color: var(--text-primary);
        margin: 0 0 0.8rem;
      }
      .two-columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.85rem;
      }
      .two-columns label {
        display: grid;
        gap: 0.35rem;
        color: var(--text-secondary);
        font-size: 0.78rem;
        font-weight: 750;
      }
      .two-columns .full {
        grid-column: 1 / -1;
      }
      .requirements {
        display: grid;
        gap: 0.6rem;
      }
      .requirement {
        display: grid;
        grid-template-columns: auto auto 1fr auto;
        gap: 0.65rem;
        align-items: center;
        padding: 0.75rem;
        border: 1px dashed var(--border-color);
        cursor: pointer;
      }
      .requirement input {
        position: absolute;
        opacity: 0;
        width: 1px;
        height: 1px;
      }
      .requirement .material-symbols-outlined {
        color: var(--accent);
      }
      .requirement strong,
      .requirement small {
        display: block;
      }
      .requirement strong {
        color: var(--text-primary);
        font-size: 0.82rem;
      }
      .requirement small {
        color: var(--text-muted);
        font-size: 0.7rem;
        margin-top: 0.15rem;
      }
      .submit-request {
        margin-top: 1.5rem;
        width: 100%;
        justify-content: center;
      }
      .receipt {
        margin-top: 1.5rem;
        display: flex;
        gap: 0.85rem;
        align-items: center;
        padding: 1rem;
        border-left: 3px solid var(--success);
        background: rgba(79, 163, 107, 0.1);
      }
      .receipt > .material-symbols-outlined {
        color: var(--success);
      }
      .receipt span,
      .receipt strong {
        display: block;
      }
      .receipt span {
        color: var(--text-secondary);
        font-size: 0.7rem;
        text-transform: uppercase;
      }
      .receipt strong {
        color: var(--text-primary);
        font-size: 1rem;
      }
      .receipt-pin {
        margin-left: auto;
      }
      .tracking-desk {
        margin-top: 1.5rem;
        padding-top: 1.35rem;
        border-top: 1px solid var(--border-color);
      }
      .tracking-heading,
      .tracking-result-top,
      .final-answer {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.85rem;
      }
      .tracking-heading h2 {
        margin: 0.3rem 0 0;
        color: var(--text-primary);
        font-size: 1.2rem;
      }
      .tracking-heading > .material-symbols-outlined {
        color: var(--accent);
        font-size: 1.6rem;
      }
      .tracking-query {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(120px, 0.52fr) auto;
        gap: 0.65rem;
        align-items: end;
        margin-top: 0.9rem;
      }
      .tracking-query label {
        display: grid;
        gap: 0.35rem;
        color: var(--text-secondary);
        font-size: 0.75rem;
        font-weight: 750;
      }
      .tracking-result {
        margin-top: 1rem;
        border: 1px solid var(--border-color);
        background: rgba(var(--secondary-rgb), 0.045);
      }
      .tracking-result-top {
        padding: 1rem;
        border-left: 3px solid var(--secondary);
      }
      .tracking-result-top.completed {
        border-left-color: var(--success);
        background: rgba(79, 163, 107, 0.08);
      }
      .tracking-result-top > .material-symbols-outlined {
        color: var(--secondary);
      }
      .tracking-result-top.completed > .material-symbols-outlined {
        color: var(--success);
      }
      .tracking-result h3 {
        margin: 0.2rem 0;
        color: var(--text-primary);
        font-size: 1rem;
      }
      .tracking-result-top p {
        margin: 0;
        color: var(--text-secondary);
        font-size: 0.82rem;
      }
      .stage-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        padding: 0.9rem 1rem;
        gap: 1rem;
        border-top: 1px solid var(--border-color);
      }
      .stage-grid span,
      .parallel-stages > span,
      .final-answer span:not(.material-symbols-outlined) {
        display: block;
        color: var(--text-muted);
        font-size: 0.67rem;
        font-weight: 800;
        letter-spacing: 0.45px;
        text-transform: uppercase;
      }
      .stage-grid strong,
      .parallel-stages strong {
        display: block;
        margin-top: 0.3rem;
        color: var(--text-primary);
        font-size: 0.82rem;
      }
      .parallel-stages {
        display: grid;
        gap: 0.28rem;
        margin: 0 1rem;
        padding: 0.85rem 0;
        border-top: 1px dashed var(--border-color);
      }
      .final-answer {
        justify-content: flex-start;
        margin: 0 1rem;
        padding: 0.9rem 0;
        border-top: 1px solid var(--border-color);
      }
      .final-answer .material-symbols-outlined {
        color: var(--success);
      }
      .final-answer p {
        margin: 0.3rem 0 0;
        color: var(--text-primary);
        line-height: 1.5;
      }
      .tracking-timeline {
        display: grid;
        gap: 0;
        margin: 0;
        padding: 0.3rem 1rem 1rem;
        list-style: none;
      }
      .tracking-timeline li {
        position: relative;
        display: grid;
        grid-template-columns: 14px 1fr;
        gap: 0.65rem;
        padding: 0.65rem 0 0.65rem 0;
      }
      .tracking-timeline li:not(:last-child)::after {
        content: '';
        position: absolute;
        top: 1.35rem;
        left: 5px;
        bottom: -0.15rem;
        width: 1px;
        background: var(--border-color);
      }
      .timeline-marker {
        z-index: 1;
        width: 10px;
        height: 10px;
        margin-top: 0.2rem;
        border: 2px solid var(--secondary);
        border-radius: 50%;
        background: var(--bg-secondary);
      }
      .tracking-timeline strong {
        color: var(--text-primary);
        font-size: 0.8rem;
      }
      .tracking-timeline p,
      .tracking-timeline small {
        display: block;
        margin: 0.2rem 0 0;
        color: var(--text-secondary);
        font-size: 0.76rem;
        line-height: 1.45;
      }
      .tracking-timeline small {
        color: var(--text-muted);
        font-size: 0.68rem;
      }
      @media (max-width: 820px) {
        .guest-grid {
          grid-template-columns: 1fr;
        }
        .orientation-rail {
          padding-right: 0;
        }
        .orientation-rail h1 {
          max-width: 14ch;
        }
        .two-columns {
          grid-template-columns: 1fr;
        }
        .query-actions {
          align-items: flex-start;
          flex-direction: column;
        }
        .receipt {
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .receipt-pin {
          margin-left: 0;
        }
        .tracking-query,
        .stage-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class GuestGuidanceComponent {
  query = '';
  fullName = '';
  email = '';
  universityId = '';
  answers: Record<string, string> = {};
  files: Record<string, File | undefined> = {};
  guidance: GuidanceResponse | null = null;
  service: PublicService | null = null;
  receipt: Receipt | null = null;
  trackingCode = '';
  trackingPin = '';
  tracking: RequestTracking | null = null;
  guiding = false;
  submitting = false;
  trackingLoading = false;
  error = '';
  trackingError = '';

  constructor(private readonly api: ApiService) {}

  async guide(): Promise<void> {
    if (this.query.trim().length < 8) {
      this.error = 'Describe un poco mas tu situacion para poder orientarte.';
      return;
    }
    this.guiding = true;
    this.error = '';
    this.receipt = null;
    try {
      const result = await firstValueFrom(
        this.api.post<GuidanceResponse>('/public/guide', { query: this.query.trim() }),
      );
      this.guidance = result;
      this.service = null;
      if (result.policy_id) {
        this.service = await firstValueFrom(
          this.api.get<PublicService>(`/public/services/${result.policy_id}`),
        );
        this.answers = Object.fromEntries(
          this.service.form_definition.questions.map((question) => [question.id, '']),
        );
        this.files = {};
      }
    } catch {
      this.error = 'No fue posible obtener una orientacion. Intenta nuevamente.';
    } finally {
      this.guiding = false;
    }
  }

  optionsFor(question: PublicQuestion): string[] {
    return Array.isArray(question.options)
      ? question.options
      : question.options
          .split(',')
          .map((option) => option.trim())
          .filter(Boolean);
  }

  inputType(type: PublicQuestion['type']): string {
    return type === 'textarea' || type === 'select' ? 'text' : type;
  }

  setFile(requirementId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.files[requirementId] = input.files?.item(0) ?? undefined;
  }

  async submitRequest(): Promise<void> {
    const service = this.service;
    if (!service || !this.fullName.trim()) return;
    if (service.form_definition.attachments.some((item) => item.required && !this.files[item.id])) {
      this.error = 'Adjunta todos los requisitos obligatorios antes de registrar la solicitud.';
      return;
    }
    this.submitting = true;
    this.error = '';
    try {
      const receipt = await firstValueFrom(
        this.api.post<Receipt>(`/public/services/${service.id}/requests`, {
          applicant: {
            full_name: this.fullName.trim(),
            ...(this.email.trim() ? { email: this.email.trim() } : {}),
            ...(this.universityId.trim() ? { university_id: this.universityId.trim() } : {}),
          },
          answers: this.answers,
        }),
      );
      for (const requirement of service.form_definition.attachments) {
        const file = this.files[requirement.id];
        if (!file) continue;
        const formData = new FormData();
        formData.set('receipt_pin', receipt.receipt_pin);
        formData.set('metadata', JSON.stringify({ requirement_id: requirement.id }));
        formData.set('file', file);
        await firstValueFrom(
          this.api.post(`/public/requests/${receipt.tracking_code}/attachments`, formData),
        );
      }
      this.receipt = receipt;
      this.trackingCode = receipt.tracking_code;
      this.trackingPin = receipt.receipt_pin;
      await this.loadTracking();
    } catch {
      this.error = 'No se pudo registrar el expediente. Revisa los datos y vuelve a intentarlo.';
    } finally {
      this.submitting = false;
    }
  }

  async loadTracking(): Promise<void> {
    if (!this.trackingCode.trim() || !this.trackingPin.trim()) {
      this.trackingError = 'Ingresa el codigo de solicitud y el PIN de recibo.';
      return;
    }
    this.trackingLoading = true;
    this.trackingError = '';
    try {
      this.tracking = await firstValueFrom(
        this.api.get<RequestTracking>(
          `/public/requests/${this.trackingCode.trim().toUpperCase()}`,
          new HttpParams().set('receipt_pin', this.trackingPin.trim()),
        ),
      );
    } catch {
      this.tracking = null;
      this.trackingError = 'No encontramos la solicitud o el PIN no coincide.';
    } finally {
      this.trackingLoading = false;
    }
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      received: 'Recibida',
      in_progress: 'En curso',
      observed: 'Con observaciones',
      awaiting_approval: 'Pendiente de aprobacion final',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      discarded: 'Desechada',
      completed: 'Totalmente culminada',
    };
    return labels[status] ?? status;
  }
}
