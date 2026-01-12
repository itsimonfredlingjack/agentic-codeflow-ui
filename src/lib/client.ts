import { AgentIntent, RuntimeEvent, MessageHeader } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState } from 'react';

type ConnectionStatus = 'connecting' | 'open' | 'error' | 'closed';

type EventHandler = (event: RuntimeEvent) => void;
type StatusHandler = (status: ConnectionStatus) => void;

class AgencyClient {
  private eventSource: EventSource | null = null;
  private listeners: EventHandler[] = [];
  private runId: string | null = null;
  private status: ConnectionStatus = 'closed';
  private statusListeners: StatusHandler[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  private setStatus(status: ConnectionStatus) {
    if (this.status === status) return;
    this.status = status;
    this.statusListeners.forEach(handler => handler(status));
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect() {
    if (!this.runId) return;
    if (this.reconnectTimer) return;

    const baseDelay = 600;
    const maxDelay = 8000;
    const delay = Math.min(maxDelay, baseDelay * Math.pow(2, this.reconnectAttempts));
    const jitter = Math.floor(Math.random() * 200);
    this.reconnectAttempts = Math.min(this.reconnectAttempts + 1, 10);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.runId) return;
      this.connect(this.runId, { force: true });
    }, delay + jitter);
  }

  public connect(runId: string, options?: { force?: boolean }) {
    if (this.eventSource && this.runId === runId && this.eventSource.readyState !== EventSource.CLOSED && !options?.force) return; // Already connected
    if (this.eventSource) this.eventSource.close();

    if (this.runId !== runId) {
      this.reconnectAttempts = 0;
    }
    this.runId = runId;
    this.clearReconnectTimer();
    this.setStatus('connecting');
    this.eventSource = new EventSource(`/api/stream?runId=${runId}`);

    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('open');
    };

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
      this.setStatus('error');
      if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
        this.eventSource.close();
      }
      this.scheduleReconnect();
    };
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.clearReconnectTimer();
    this.runId = null;
    this.setStatus('closed');
  }

  public subscribe(handler: EventHandler) {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter(h => h !== handler);
    };
  }

  public subscribeStatus(handler: StatusHandler) {
    this.statusListeners.push(handler);
    handler(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter(h => h !== handler);
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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('closed');

  useEffect(() => {
    if (!runId) {
      setConnectionStatus('closed');
      return;
    }
    
    agencyClient.connect(runId);
    
    const unsubscribe = agencyClient.subscribe((event) => {
      setLastEvent(event);
    });

    const unsubscribeStatus = agencyClient.subscribeStatus((status) => {
      setConnectionStatus(status);
    });

    return () => {
      unsubscribe();
      unsubscribeStatus();
      // We generally don't disconnect on unmount if it's a singleton meant to persist,
      // but for this effect scope, we just stop listening.
    };
  }, [runId]);

  return { client: agencyClient, lastEvent, connectionStatus };
}
