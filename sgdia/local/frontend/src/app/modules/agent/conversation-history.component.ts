import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from './chat.service';

@Component({
  selector: 'app-conversation-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="history-sidebar glass-panel">
      <div class="sidebar-header">
        <button class="btn btn-primary w-100" (click)="chatService.createNewConversation()">
          <span class="material-symbols-outlined">add</span> Nuevo Chat
        </button>
      </div>

      <div class="history-list">
        <div class="history-group">
          <h4 class="group-title">Recientes</h4>
          <ul class="chat-items">
            <li
              class="chat-item"
              *ngFor="let chat of chatService.conversations()"
              [class.active]="chatService.activeConversation()?.id === chat.id"
              (click)="chatService.selectConversation(chat.id)"
            >
              <span class="material-symbols-outlined chat-icon">chat_bubble</span>
              <div class="chat-info">
                <span class="chat-title">{{ chat.title }}</span>
                <span class="chat-date">{{ chat.date | date: 'shortTime' }}</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  `,
  styles: [
    `
      .history-sidebar {
        width: 260px;
        height: 100%;
        display: flex;
        flex-direction: column;
        border-radius: 0;
        border-right: var(--glass-border);
        background: var(--bg-secondary);
        flex-shrink: 0;
      }

      .sidebar-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--border-color);

        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .w-100 {
          width: 100%;
        }
      }

      .history-list {
        flex: 1;
        overflow-y: auto;
        padding: 1rem 0;
      }

      .group-title {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
        margin: 0 0 0.5rem 0;
        padding: 0 1.5rem;
      }

      .chat-items {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .chat-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 1.5rem;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: var(--bg-tertiary);
        }

        &.active {
          background: var(--primary-glow);
          border-right: 3px solid var(--primary);

          .chat-icon,
          .chat-title {
            color: var(--primary);
          }
        }
      }

      .chat-icon {
        font-size: 1.1rem;
        color: var(--text-secondary);
      }

      .chat-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .chat-title {
        font-size: 0.85rem;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
      }

      .chat-date {
        font-size: 0.7rem;
        color: var(--text-muted);
      }
    `,
  ],
})
export class ConversationHistoryComponent {
  chatService = inject(ChatService);
}
