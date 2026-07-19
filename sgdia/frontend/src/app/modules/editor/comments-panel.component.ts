import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface CommentReply {
  id: string;
  author: string;
  avatar: string;
  text: string;
  date: string;
}

export interface CommentThread {
  id: string;
  author: string;
  avatar: string;
  text: string;
  date: string;
  resolved: boolean;
  replies: CommentReply[];
}

@Component({
  selector: 'app-comments-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="comments-panel-container">
      <div class="panel-header">
        <span class="material-symbols-outlined header-icon">comment</span>
        <h3>Comentarios del Documento</h3>
      </div>

      <!-- Add New Comment Thread -->
      <div class="new-comment-box">
        <textarea
          placeholder="Escribe un comentario sobre el texto seleccionado..."
          [(ngModel)]="newCommentText"
          class="form-control"
          rows="2"
        ></textarea>
        <button
          class="btn btn-primary btn-sm send-btn"
          (click)="postComment()"
          [disabled]="!newCommentText.trim()"
        >
          <span class="material-symbols-outlined">send</span>
          <span>Comentar</span>
        </button>
      </div>

      <!-- List of Comment Threads -->
      <div class="comments-list">
        <div
          class="comment-thread glass-panel"
          *ngFor="let thread of threads(); let idx = index"
          [class.resolved]="thread.resolved"
        >
          <div class="thread-main">
            <img [src]="thread.avatar" alt="Avatar" class="avatar" />
            <div class="thread-content">
              <div class="thread-meta">
                <span class="author">{{ thread.author }}</span>
                <span class="date">{{ thread.date }}</span>
              </div>
              <p class="text">{{ thread.text }}</p>
            </div>

            <!-- Resolve button -->
            <button
              *ngIf="!thread.resolved"
              class="resolve-btn"
              (click)="resolve(thread.id)"
              title="Resolver comentario"
            >
              <span class="material-symbols-outlined">check_circle</span>
            </button>
            <span class="resolved-badge" *ngIf="thread.resolved">Resuelto</span>
          </div>

          <!-- Replies list -->
          <div class="replies-list" *ngIf="thread.replies.length > 0">
            <div class="reply-item" *ngFor="let reply of thread.replies">
              <img [src]="reply.avatar" alt="Avatar" class="avatar-sm" />
              <div class="reply-content">
                <div class="reply-meta">
                  <span class="author">{{ reply.author }}</span>
                  <span class="date">{{ reply.date }}</span>
                </div>
                <p class="text">{{ reply.text }}</p>
              </div>
            </div>
          </div>

          <!-- Add reply form -->
          <div class="add-reply-box" *ngIf="!thread.resolved">
            <input
              type="text"
              placeholder="Responder..."
              [(ngModel)]="replyTexts[thread.id]"
              (keydown.enter)="postReply(thread.id)"
              class="form-control reply-input"
            />
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="threads().length === 0">
          <span class="material-symbols-outlined empty-icon">forum</span>
          <p>No hay comentarios en este documento</p>
          <span>Selecciona un fragmento del texto y haz clic en "Comentar"</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .comments-panel-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        height: 100%;
      }

      .panel-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.5rem;
        h3 {
          font-size: 0.9rem;
          margin: 0;
        }
        .header-icon {
          color: var(--primary);
          font-size: 1.25rem;
        }
      }

      .new-comment-box {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        .form-control {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-md);
          padding: 0.5rem;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.8rem;
          resize: none;
          outline: none;
          &:focus {
            border-color: var(--primary);
          }
        }

        .send-btn {
          align-self: flex-end;
          padding: 0.35rem 0.75rem;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
      }

      .comments-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        overflow-y: auto;
        flex: 1;
        padding-right: 0.25rem;
      }

      .comment-thread {
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        border: var(--glass-border);
        transition: opacity 0.3s ease;

        &.resolved {
          opacity: 0.6;
          background: rgba(255, 255, 255, 0.005);
        }
      }

      .thread-main {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
        position: relative;
      }

      .avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .thread-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .thread-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .author {
          font-size: 0.75rem;
          font-weight: 600;
        }
        .date {
          font-size: 0.65rem;
          color: var(--text-muted);
        }
      }

      .text {
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin: 0;
        line-height: 1.35;
      }

      .resolve-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        display: flex;
        padding: 0.15rem;
        border-radius: 50%;
        &:hover {
          color: var(--success);
          background: rgba(16, 185, 129, 0.1);
        }
      }

      .resolved-badge {
        font-size: 0.65rem;
        font-weight: 700;
        color: var(--success);
        background: rgba(16, 185, 129, 0.1);
        padding: 0.1rem 0.3rem;
        border-radius: 4px;
      }

      /* Replies */
      .replies-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding-left: 1.5rem;
        border-left: 1px dashed var(--border-color);
        margin-top: 0.25rem;
      }

      .reply-item {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
      }

      .avatar-sm {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .reply-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
      }

      .reply-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        .author {
          font-size: 0.7rem;
          font-weight: 600;
        }
        .date {
          font-size: 0.6rem;
          color: var(--text-muted);
        }
      }

      .add-reply-box {
        padding-left: 1.5rem;

        .reply-input {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-sm);
          padding: 0.3rem 0.5rem;
          font-size: 0.7rem;
          color: var(--text-primary);
          width: 100%;
          outline: none;
          &:focus {
            border-color: var(--primary);
          }
        }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1rem;
        color: var(--text-muted);
        text-align: center;
        gap: 0.5rem;

        .empty-icon {
          font-size: 2.5rem;
        }
        p {
          font-size: 0.8rem;
          margin: 0;
          font-weight: 600;
          color: var(--text-secondary);
        }
        span {
          font-size: 0.7rem;
        }
      }
    `,
  ],
})
export class CommentsPanelComponent {
  newCommentText = '';
  replyTexts: { [threadId: string]: string } = {};

  threads = signal<CommentThread[]>([]);

  ngOnInit(): void {
    this.loadMockComments();
  }

  loadMockComments(): void {
    this.threads.set([
      {
        id: 'c1',
        author: 'Ana Gómez',
        avatar: 'https://ui-avatars.com/api/?name=Ana+Gomez&background=F59E0B&color=fff&bold=true',
        text: '¿Debemos especificar la vigencia de estas políticas a partir del Q3?',
        date: '08 Jun 10:24',
        resolved: false,
        replies: [
          {
            id: 'r1',
            author: 'Carlos Pérez',
            avatar:
              'https://ui-avatars.com/api/?name=Carlos+Perez&background=6366F1&color=fff&bold=true',
            text: 'Sí, ya lo modifiqué en el segundo párrafo de la sección 3.',
            date: '08 Jun 11:15',
          },
        ],
      },
      {
        id: 'c2',
        author: 'Marcos Ruiz',
        avatar:
          'https://ui-avatars.com/api/?name=Marcos+Ruiz&background=10B981&color=fff&bold=true',
        text: 'Falta revisar los costos de licenciamiento en la planilla adjunta.',
        date: '07 Jun 15:40',
        resolved: true,
        replies: [],
      },
    ]);
  }

  postComment(): void {
    const text = this.newCommentText.trim();
    if (!text) return;

    const newThread: CommentThread = {
      id: 'c_' + Math.random().toString(36).substr(2, 9),
      author: 'Administrador Sistema', // Mock logged in user
      avatar:
        'https://ui-avatars.com/api/?name=Administrador+Sistema&background=6366F1&color=fff&bold=true',
      text: text,
      date: 'Hoy ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      resolved: false,
      replies: [],
    };

    this.threads.set([newThread, ...this.threads()]);
    this.newCommentText = '';
  }

  postReply(threadId: string): void {
    const text = this.replyTexts[threadId]?.trim();
    if (!text) return;

    const newReply = {
      id: 'r_' + Math.random().toString(36).substr(2, 9),
      author: 'Administrador Sistema',
      avatar:
        'https://ui-avatars.com/api/?name=Administrador+Sistema&background=6366F1&color=fff&bold=true',
      text: text,
      date: 'Hoy ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = this.threads().map((t) => {
      if (t.id === threadId) {
        return {
          ...t,
          replies: [...t.replies, newReply],
        };
      }
      return t;
    });

    this.threads.set(updated);
    this.replyTexts[threadId] = '';
  }

  resolve(threadId: string): void {
    const updated = this.threads().map((t) => {
      if (t.id === threadId) {
        return { ...t, resolved: true };
      }
      return t;
    });
    this.threads.set(updated);
  }
}
