import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { LiveEvent, LiveEventStatus } from '../types';

type EventListener = (event: LiveEvent) => void;

interface LiveEventsContextType {
  status: LiveEventStatus;
  events: LiveEvent[];
  lastEvent: LiveEvent | null;
  paused: boolean;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
  clearEvents: () => void;
  reconnect: () => void;
  subscribe: (listener: EventListener) => () => void;
}

const LiveEventsContext = createContext<LiveEventsContextType | undefined>(undefined);

const MAX_EVENTS = 100;

function resolveWsUrl(): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (apiBase && apiBase.startsWith('http')) {
    const url = new URL(apiBase);
    const proto = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${url.host}/ws-direct`;
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws-direct`;
}

function buildStompFrame(command: string, headers: Record<string, string>, body = ''): string {
  const headerLines = Object.entries(headers).map(([k, v]) => `${k}:${v}`);
  return `${command}\n${headerLines.join('\n')}\n\n${body}\0`;
}

export const LiveEventsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [status, setStatus] = useState<LiveEventStatus>('DISCONNECTED');
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<LiveEvent | null>(null);
  const [paused, setPaused] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const pausedRef = useRef(paused);
  const listenersRef = useRef<Set<EventListener>>(new Set());
  const bufferRef = useRef('');
  const unmountedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const closeSocket = useCallback(() => {
    clearTimers();
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(buildStompFrame('DISCONNECT', {}));
        }
        wsRef.current.close();
      } catch {
        // Ignore close errors
      }
      wsRef.current = null;
    }
  }, [clearTimers]);

  const connect = useCallback(() => {
    if (!isAuthenticated || unmountedRef.current) {
      setStatus('DISCONNECTED');
      return;
    }

    closeSocket();
    bufferRef.current = '';
    setStatus(retryCountRef.current > 0 ? 'RECONNECTING' : 'CONNECTING');

    let ws: WebSocket;
    try {
      ws = new WebSocket(resolveWsUrl());
    } catch {
      setStatus('DISCONNECTED');
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current || wsRef.current !== ws) return;
      ws.send(
        buildStompFrame('CONNECT', {
          'accept-version': '1.2',
          'heart-beat': '0,0',
        })
      );
    };

    ws.onmessage = (msg) => {
      if (unmountedRef.current || wsRef.current !== ws) return;
      const chunk = typeof msg.data === 'string' ? msg.data : '';
      bufferRef.current += chunk;

      const frames = bufferRef.current.split('\0');
      bufferRef.current = frames.pop() ?? '';

      for (const raw of frames) {
        const trimmed = raw.replace(/^\n+/, '');
        if (!trimmed) continue;

        const splitIdx = trimmed.indexOf('\n\n');
        const headerPart = splitIdx >= 0 ? trimmed.slice(0, splitIdx) : trimmed;
        const bodyPart = splitIdx >= 0 ? trimmed.slice(splitIdx + 2) : '';
        const command = headerPart.split('\n')[0]?.trim();

        if (command === 'CONNECTED') {
          retryCountRef.current = 0;
          setStatus('CONNECTED');
          ws.send(
            buildStompFrame('SUBSCRIBE', {
              id: 'sub-events',
              destination: '/topic/events',
              ack: 'auto',
            })
          );
        } else if (command === 'MESSAGE' && bodyPart) {
          try {
            const parsed = JSON.parse(bodyPart);
            const liveEvent: LiveEvent = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              type: parsed.type || 'SYSTEM_EVENT',
              timestamp: parsed.timestamp || new Date().toISOString(),
              payload: parsed.payload ?? null,
            };
            setLastEvent(liveEvent);
            if (!pausedRef.current) {
              setEvents((prev) => [liveEvent, ...prev].slice(0, MAX_EVENTS));
            }
            listenersRef.current.forEach((listener) => {
              try {
                listener(liveEvent);
              } catch {
                // Isolate listener errors
              }
            });
          } catch {
            // Ignore malformed JSON frames
          }
        }
      }
    };

    ws.onerror = () => {
      // Handled by onclose reconnect
    };

    ws.onclose = () => {
      if (unmountedRef.current || wsRef.current !== ws) return;
      wsRef.current = null;
      if (!isAuthenticated) {
        setStatus('DISCONNECTED');
        return;
      }
      const delayMs = Math.min(15000, 2000 * Math.pow(2, retryCountRef.current));
      retryCountRef.current += 1;
      setStatus('RECONNECTING');
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, delayMs);
    };
  }, [isAuthenticated, closeSocket]);

  useEffect(() => {
    unmountedRef.current = false;
    if (isAuthenticated) {
      connect();
    } else {
      retryCountRef.current = 0;
      closeSocket();
      setStatus('DISCONNECTED');
      setEvents([]);
      setLastEvent(null);
    }
    return () => {
      unmountedRef.current = true;
      closeSocket();
    };
  }, [isAuthenticated, connect, closeSocket]);

  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    connect();
  }, [connect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const subscribe = useCallback((listener: EventListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  return (
    <LiveEventsContext.Provider
      value={{
        status,
        events,
        lastEvent,
        paused,
        setPaused,
        clearEvents,
        reconnect,
        subscribe,
      }}
    >
      {children}
    </LiveEventsContext.Provider>
  );
};

export const useLiveEvents = () => {
  const ctx = useContext(LiveEventsContext);
  if (!ctx) {
    throw new Error('useLiveEvents must be used within a LiveEventsProvider');
  }
  return ctx;
};
