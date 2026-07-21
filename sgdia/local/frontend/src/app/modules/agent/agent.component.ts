import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationHistoryComponent } from './conversation-history.component';
import { ChatInterfaceComponent } from './chat-interface.component';
import { EscalationPanelComponent } from './escalation-panel.component';

@Component({
  selector: 'app-agent',
  standalone: true,
  imports: [
    CommonModule,
    ConversationHistoryComponent,
    ChatInterfaceComponent,
    EscalationPanelComponent,
  ],
  template: `
    <div class="agent-layout">
      <header class="agent-header glass-panel">
        <div class="header-left">
          <div class="ai-avatar">
            <span class="material-symbols-outlined">support_agent</span>
          </div>
          <div class="agent-info">
            <h2>Asistente EASY</h2>
            <span class="status online">Local/offline - guia de politicas academicas</span>
          </div>
        </div>

        <div class="header-right">
          <button class="btn btn-secondary escalation-btn" (click)="showEscalation = true">
            <span class="material-symbols-outlined">record_voice_over</span>
            Escalar a secretaria
          </button>
        </div>
      </header>

      <div class="agent-body">
        <app-conversation-history></app-conversation-history>
        <app-chat-interface></app-chat-interface>
      </div>

      <app-escalation-panel
        *ngIf="showEscalation"
        (close)="showEscalation = false"
      ></app-escalation-panel>
    </div>
  `,
  styles: [
    `
      .agent-layout {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        overflow: hidden;
      }

      .agent-header {
        min-height: 70px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 1.5rem;
        border-radius: 0;
        border-bottom: var(--glass-border);
        background: var(--bg-secondary);
        flex-shrink: 0;
        z-index: 10;
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .ai-avatar {
        width: 42px;
        height: 42px;
        border-radius: var(--border-radius-md);
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        border: 1px solid rgba(var(--accent-rgb), 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--paper);

        span {
          font-size: 1.55rem;
        }
      }

      .agent-info {
        h2 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 750;
        }

        .status {
          font-size: 0.8rem;
          color: var(--text-secondary);

          &.online {
            color: var(--success);
          }
        }
      }

      .escalation-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .agent-body {
        flex: 1;
        display: flex;
        overflow: hidden;
      }
    `,
  ],
})
export class AgentComponent {
  showEscalation = false;
}
