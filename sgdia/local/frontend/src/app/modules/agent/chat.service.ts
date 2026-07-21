import { Injectable, signal, computed } from '@angular/core';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  confidenceScore?: number;
  sources?: { title: string; url: string }[];
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  date: Date;
  messages: ChatMessage[];
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private conversationsSignal = signal<Conversation[]>([
    {
      id: 'c1',
      title: 'Orientacion sobre Casos Especiales',
      date: new Date(),
      messages: [
        {
          id: 'm1',
          role: 'user',
          content: 'Estoy retrasado en materias con prerequisito. Que proceso corresponde?',
          timestamp: new Date(Date.now() - 60000),
        },
        {
          id: 'm2',
          role: 'agent',
          content:
            'Segun la **Politica de Casos Especiales**, debes iniciar una solicitud para levantamiento de prerequisitos. EASYDOC puede abrir el formulario dinamico y pedir registro universitario, carta de solicitud y documento de identidad.',
          timestamp: new Date(Date.now() - 50000),
          confidenceScore: 96,
          sources: [{ title: 'Politica Casos Especiales 2026', url: '/repository/doc1' }],
        },
      ],
    },
    {
      id: 'c2',
      title: 'Solicitud de homologacion',
      date: new Date(Date.now() - 86400000),
      messages: [],
    },
  ]);

  private activeConversationIdSignal = signal<string>('c1');

  conversations = computed(() => this.conversationsSignal());
  activeConversation = computed(() => {
    return (
      this.conversationsSignal().find((c) => c.id === this.activeConversationIdSignal()) || null
    );
  });

  selectConversation(id: string) {
    this.activeConversationIdSignal.set(id);
  }

  createNewConversation() {
    const newId = crypto.randomUUID();
    const newConv: Conversation = {
      id: newId,
      title: 'Nueva conversacion',
      date: new Date(),
      messages: [],
    };
    this.conversationsSignal.update((list) => [newConv, ...list]);
    this.activeConversationIdSignal.set(newId);
  }

  sendMessage(content: string, attachments?: File[]) {
    const activeId = this.activeConversationIdSignal();
    if (!activeId) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    this.conversationsSignal.update((list) =>
      list.map((c) => {
        if (c.id === activeId) {
          return {
            ...c,
            messages: [...c.messages, userMsg],
            title: c.messages.length === 0 ? content.substring(0, 30) + '...' : c.title,
          };
        }
        return c;
      }),
    );

    this.simulateAgentResponse(attachments?.length ?? 0);
  }

  private simulateAgentResponse(attachmentCount: number) {
    const activeId = this.activeConversationIdSignal();
    const agentMsgId = crypto.randomUUID();

    const agentMsg: ChatMessage = {
      id: agentMsgId,
      role: 'agent',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    this.conversationsSignal.update((list) =>
      list.map((c) => (c.id === activeId ? { ...c, messages: [...c.messages, agentMsg] } : c)),
    );

    const attachmentText =
      attachmentCount > 0
        ? ` Recibi ${attachmentCount} archivo(s) y los preparare para extraccion local de datos.`
        : '';
    const responseText = `Entendido. Para ese caso EASYDOC revisa la politica academica, sugiere el formulario correcto y envia el expediente al primer responsable del flujo.${attachmentText}`;
    let currentText = '';
    let i = 0;

    const interval = setInterval(() => {
      if (i < responseText.length) {
        currentText += responseText.charAt(i);
        this.updateAgentMessage(activeId, agentMsgId, currentText, true);
        i++;
      } else {
        clearInterval(interval);
        this.updateAgentMessage(activeId, agentMsgId, currentText, false, 95, [
          { title: 'Politicas academicas EASYDOC', url: '/repository/doc2' },
        ]);
      }
    }, 30);
  }

  private updateAgentMessage(
    convId: string,
    msgId: string,
    content: string,
    isStreaming: boolean,
    confidenceScore?: number,
    sources?: { title: string; url: string }[],
  ) {
    this.conversationsSignal.update((list) =>
      list.map((c) => {
        if (c.id === convId) {
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === msgId ? { ...m, content, isStreaming, confidenceScore, sources } : m,
            ),
          };
        }
        return c;
      }),
    );
  }
}
