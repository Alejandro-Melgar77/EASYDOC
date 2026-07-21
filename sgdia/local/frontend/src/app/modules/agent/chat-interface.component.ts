import { Component, inject, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage } from './chat.service';
import { FeedbackWidgetComponent } from './feedback-widget.component';
import { AudioRecorderComponent } from './audio-recorder.component';
import { FileAttachComponent } from './file-attach.component';
import { marked } from 'marked';

@Component({
  selector: 'app-chat-interface',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FeedbackWidgetComponent,
    AudioRecorderComponent,
    FileAttachComponent,
  ],
  template: `
    <div class="chat-interface">
      <!-- Chat Messages Area -->
      <div class="chat-messages" #scrollContainer>
        <div class="empty-state" *ngIf="!chatService.activeConversation()?.messages?.length">
          <div class="ai-avatar-large">
            <span class="material-symbols-outlined">robot_2</span>
          </div>
          <h2>Que tramite necesitas resolver?</h2>
          <p>
            Soy el Asistente EASY de EASYDOC. Puedo orientar a estudiantes invitados, sugerir la
            politica correcta y preparar formularios dinamicos segun el caso.
          </p>

          <div class="suggestion-chips">
            <button class="chip" (click)="sendSuggested('Estoy retrasado en algunas materias')">
              Estoy retrasado en algunas materias
            </button>
            <button class="chip" (click)="sendSuggested('Necesito homologar materias aprobadas')">
              Necesito homologar materias aprobadas
            </button>
            <button class="chip" (click)="sendSuggested('Quiero pedir certificado de notas')">
              Quiero pedir certificado de notas
            </button>
          </div>
        </div>

        <div
          class="message-wrapper"
          *ngFor="let msg of chatService.activeConversation()?.messages"
          [ngClass]="msg.role"
        >
          <div class="message-avatar" *ngIf="msg.role === 'agent'">
            <span class="material-symbols-outlined">robot_2</span>
          </div>

          <div class="message-content">
            <!-- Metadata for Agent Messages -->
            <div class="message-meta" *ngIf="msg.role === 'agent' && !msg.isStreaming">
              <span class="confidence-badge" *ngIf="msg.confidenceScore">
                <span class="material-symbols-outlined">verified</span> {{ msg.confidenceScore }}%
                Confianza
              </span>
            </div>

            <!-- Markdown Content -->
            <div class="bubble glass-card" [innerHTML]="parseMarkdown(msg.content)"></div>

            <!-- Streaming Indicator -->
            <div class="streaming-indicator" *ngIf="msg.isStreaming">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </div>

            <!-- Sources -->
            <div class="sources-list" *ngIf="msg.sources?.length">
              <span class="source-label">Fuentes:</span>
              <a href="javascript:void(0)" class="source-pill" *ngFor="let source of msg.sources">
                <span class="material-symbols-outlined">description</span>
                {{ source.title }}
              </a>
            </div>

            <!-- Feedback -->
            <app-feedback-widget
              *ngIf="msg.role === 'agent' && !msg.isStreaming"
            ></app-feedback-widget>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="chat-input-area glass-panel">
        <div class="attachments-preview" *ngIf="attachments.length > 0">
          <div class="attachment-pill" *ngFor="let file of attachments; let i = index">
            <span class="material-symbols-outlined">description</span>
            <span class="filename">{{ file.name }}</span>
            <button class="icon-btn remove-btn" (click)="removeAttachment(i)">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div class="input-wrapper">
          <app-file-attach (filesAttached)="onFilesAttached($event)"></app-file-attach>

          <textarea
            class="chat-input"
            placeholder="Describe tu situacion o adjunta tus documentos..."
            [(ngModel)]="currentInput"
            (keydown.enter)="onEnter($event)"
            rows="1"
            #inputField
          ></textarea>

          <div class="input-actions">
            <app-audio-recorder
              *ngIf="!currentInput.trim()"
              (audioRecorded)="onAudioRecorded($event)"
            ></app-audio-recorder>
            <button class="icon-btn send-btn" *ngIf="currentInput.trim()" (click)="sendMessage()">
              <span class="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>
        <div class="input-footer">
          EASY puede cometer errores. Verifica requisitos importantes con Secretaria Academica.
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .chat-interface {
        flex: 1;
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--bg-primary);
        position: relative;
      }

      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 2rem;
        display: flex;
        flex-direction: column;
        gap: 2rem;
        scroll-behavior: smooth;
      }

      .empty-state {
        margin: auto;
        text-align: center;
        max-width: 600px;

        .ai-avatar-large {
          width: 80px;
          height: 80px;
          background: linear-gradient(
            135deg,
            rgba(var(--primary-rgb), 0.24),
            rgba(var(--accent-rgb), 0.18)
          );
          border-radius: var(--border-radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          border: 2px solid rgba(var(--accent-rgb), 0.32);

          span {
            font-size: 3rem;
            color: var(--primary);
          }
        }

        h2 {
          color: var(--text-primary);
          margin-bottom: 1rem;
        }
        p {
          color: var(--text-secondary);
          margin-bottom: 2rem;
        }
      }

      .suggestion-chips {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.75rem;

        .chip {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          padding: 0.75rem 1.25rem;
          border-radius: var(--border-radius-md);
          color: var(--text-primary);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            background: rgba(var(--accent-rgb), 0.1);
            border-color: var(--accent);
            color: var(--accent);
            transform: translateY(-2px);
          }
        }
      }

      .message-wrapper {
        display: flex;
        gap: 1.5rem;
        max-width: 85%;

        &.user {
          margin-left: auto;
          flex-direction: row-reverse;

          .bubble {
            background: var(--primary);
            color: white;
            border: none;
            border-bottom-right-radius: 4px;
          }
        }

        &.agent {
          margin-right: auto;

          .bubble {
            border-bottom-left-radius: 4px;
          }
        }
      }

      .message-avatar {
        width: 40px;
        height: 40px;
        border-radius: var(--border-radius-md);
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        span {
          color: var(--primary);
          font-size: 1.5rem;
        }
      }

      .message-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .message-meta {
        display: flex;
        gap: 1rem;
      }

      .confidence-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        color: var(--success);
        background: rgba(34, 197, 94, 0.1);
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 600;

        span {
          font-size: 0.9rem;
        }
      }

      .bubble {
        padding: 1.25rem;
        border-radius: var(--border-radius-md);
        line-height: 1.6;
        font-size: 0.95rem;

        ::ng-deep p {
          margin-top: 0;
        }
        ::ng-deep p:last-child {
          margin-bottom: 0;
        }
        ::ng-deep code {
          background: rgba(0, 0, 0, 0.2);
          padding: 2px 4px;
          border-radius: 4px;
        }
        ::ng-deep pre code {
          display: block;
          padding: 1rem;
          overflow-x: auto;
        }
      }

      .streaming-indicator {
        display: flex;
        gap: 4px;
        padding: 0.5rem;

        .dot {
          width: 8px;
          height: 8px;
          background: var(--primary);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;

          &:nth-child(1) {
            animation-delay: -0.32s;
          }
          &:nth-child(2) {
            animation-delay: -0.16s;
          }
        }
      }

      .sources-list {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;

        .source-label {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .source-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: var(--primary);
          background: var(--primary-glow);
          padding: 4px 10px;
          border-radius: var(--border-radius-md);
          text-decoration: none;
          border: 1px solid rgba(99, 102, 241, 0.2);
          transition: all 0.2s;

          &:hover {
            background: rgba(99, 102, 241, 0.2);
          }
          span {
            font-size: 1rem;
          }
        }
      }

      /* Input Area */
      .chat-input-area {
        padding: 1.5rem 2rem;
        border-top: var(--glass-border);
        border-radius: 0;
        background: var(--bg-secondary);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .attachments-preview {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }

      .attachment-pill {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        padding: 4px 4px 4px 12px;
        border-radius: var(--border-radius-md);
        font-size: 0.8rem;

        .filename {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .remove-btn {
          width: 20px;
          height: 20px;
          padding: 0;
          span {
            font-size: 1rem;
          }
        }
      }

      .input-wrapper {
        display: flex;
        align-items: center;
        gap: 1rem;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        padding: 0.5rem 1rem;
        transition: border-color 0.3s;

        &:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }
      }

      .chat-input {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--text-primary);
        font-family: inherit;
        font-size: 1rem;
        resize: none;
        outline: none;
        padding: 0.5rem 0;
        max-height: 150px;

        &::placeholder {
          color: var(--text-muted);
        }
      }

      .input-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .send-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--primary);
        color: white;

        &:hover {
          background: var(--secondary);
          transform: scale(1.05);
        }
        span {
          font-size: 1.25rem;
          margin-left: 2px;
        }
      }

      .input-footer {
        text-align: center;
        font-size: 0.75rem;
        color: var(--text-muted);
      }

      @keyframes bounce {
        0%,
        80%,
        100% {
          transform: scale(0);
        }
        40% {
          transform: scale(1);
        }
      }
    `,
  ],
})
export class ChatInterfaceComponent implements AfterViewChecked, OnInit {
  chatService = inject(ChatService);
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  currentInput: string = '';
  attachments: File[] = [];

  ngOnInit() {
    // Configure marked for synchronous parse
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop =
        this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  parseMarkdown(content: string): string {
    if (!content) return '';
    return marked.parse(content) as string;
  }

  sendSuggested(text: string) {
    this.currentInput = text;
    this.sendMessage();
  }

  onEnter(event: Event) {
    event.preventDefault();
    this.sendMessage();
  }

  onAudioRecorded(text: string) {
    this.currentInput = text;
    // Auto-send audio transcript
    setTimeout(() => this.sendMessage(), 500);
  }

  onFilesAttached(files: File[]) {
    this.attachments.push(...files);
  }

  removeAttachment(index: number) {
    this.attachments.splice(index, 1);
  }

  sendMessage() {
    if (!this.currentInput.trim() && this.attachments.length === 0) return;

    this.chatService.sendMessage(this.currentInput, this.attachments);
    this.currentInput = '';
    this.attachments = [];
  }
}
