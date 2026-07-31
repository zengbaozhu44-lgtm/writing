/**
 * Task SSE — 订阅 /api/tasks/:id/stream，补充或替代轮询
 */
import { useEffect, useRef, useState } from 'react';

export interface TaskStreamEvent {
  type?: string;
  event?: string;
  status?: string;
  taskId?: string;
  error?: string | null;
  result?: unknown;
  message?: string;
  [key: string]: unknown;
}

export function useTaskStream(
  taskId: string | null,
  opts?: {
    enabled?: boolean;
    onEvent?: (ev: TaskStreamEvent) => void;
    onTerminal?: (ev: TaskStreamEvent) => void;
  },
) {
  const [lastEvent, setLastEvent] = useState<TaskStreamEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const onEventRef = useRef(opts?.onEvent);
  const onTerminalRef = useRef(opts?.onTerminal);
  onEventRef.current = opts?.onEvent;
  onTerminalRef.current = opts?.onTerminal;

  useEffect(() => {
    if (!taskId || opts?.enabled === false) return undefined;
    const es = new EventSource(`/api/tasks/${encodeURIComponent(taskId)}/stream`);
    setConnected(true);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as TaskStreamEvent;
        setLastEvent(data);
        onEventRef.current?.(data);
        const status = data.status;
        const name = data.event || data.type;
        const terminal = status === 'completed' || status === 'failed'
          || status === 'interrupted' || status === 'cancelled'
          || name === 'taskCompleted' || name === 'taskFailed';
        if (terminal) {
          onTerminalRef.current?.(data);
          es.close();
          setConnected(false);
        }
      } catch { /* skip */ }
    };

    es.onerror = () => {
      // 交给轮询兜底；关闭以避免无限重连风暴
      setConnected(false);
      es.close();
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [taskId, opts?.enabled]);

  return { lastEvent, connected };
}
