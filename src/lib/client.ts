import { AgentIntent, RuntimeEvent, MessageHeader } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState } from 'react';

type EventHandler = (event: RuntimeEvent) => void;

class AgencyClient {
  private eventSource: EventSource | null = null;
  private listeners: EventHandler[] = [];
  private runId: string | null = null;

  public connect(runId: string) {
    if (this.eventSource && this.runId === runId) return; // Already connected
    if (this.eventSource) this.eventSource.close();

    this.runId = runId;
    this.eventSource = new EventSource(`/api/stream?runId=${runId}`);

    this.eventSource.onmessage = (msg) => {
      try {
        const event: RuntimeEvent = JSON.parse(msg.data);
        this.notify(event);
      } catch (e) {
        console.error('[AgencyClient] Failed to parse event', e);
      }
    };

    this.eventSource.onerror = (err) => {
      console.error('[AgencyClient] Stream error', err);
      // Optional: Auto-reconnect logic could go here
    };
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  public subscribe(handler: EventHandler) {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter(h => h !== handler);
    };
  }

  private notify(event: RuntimeEvent) {
    this.listeners.forEach(handler => handler(event));
  }

  public async send(intent: Omit<AgentIntent, 'header'> & { header?: Partial<MessageHeader> }) {
    if (!this.runId) throw new Error('Client not connected to a run.');

    const fullIntent: AgentIntent = {
      ...intent,
      header: {
        sessionId: this.runId,
        correlationId: uuidv4(),
        timestamp: Date.now(),
        ...intent.header
      }
    } as AgentIntent;

    const response = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: this.runId, intent: fullIntent })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text.substring(0, 500)}`);
    }
  }
}

export const agencyClient = new AgencyClient();

export function useAgencyClient(runId: string | null) {
  const [lastEvent, setLastEvent] = useState<RuntimeEvent | null>(null);

  useEffect(() => {
    if (!runId) return;
    
    agencyClient.connect(runId);
    
    const unsubscribe = agencyClient.subscribe((event) => {
      setLastEvent(event);
    });

    return () => {
      unsubscribe();
      // We generally don't disconnect on unmount if it's a singleton meant to persist,
      // but for this effect scope, we just stop listening.
    };
  }, [runId]);

  return { client: agencyClient, lastEvent };
}