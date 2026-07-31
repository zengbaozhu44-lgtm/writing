import { useCallback, useEffect, useRef, useState } from 'react';
import { api, PipelineStage } from '../api/client';

const INITIAL_STAGES: PipelineStage[] = [
  { id: 'planner', label: 'Planner', message: '分析当前状态', status: 'waiting' },
  { id: 'decision', label: 'Decision', message: '检查人物目标', status: 'waiting' },
  { id: 'conflict', label: 'Conflict', message: '生成冲突', status: 'waiting' },
  { id: 'scene', label: 'Scene Planner', message: '规划场景', status: 'waiting' },
  { id: 'writer', label: 'Writer', message: '正在生成正文', status: 'waiting' },
  { id: 'review', label: 'Review', message: '检查一致性', status: 'waiting' },
  { id: 'memory', label: 'Memory', message: '更新记忆', status: 'waiting' },
];

const STAGE_ORDER = ['planner', 'decision', 'conflict', 'scene', 'writer', 'review', 'memory'];

function resolveEventName(ev: Record<string, unknown>): string {
  if (typeof ev.event === 'string') return ev.event;
  if (typeof ev.type === 'string' && ev.type !== 'connected') return ev.type;
  const stream = ev.stream as { type?: string } | undefined;
  if (stream?.type) return stream.type;
  return '';
}

function applyPipelineStage(stages: PipelineStage[], payload: { stage?: string; status?: string; detail?: string; message?: string }) {
  const next = stages.map((s) => ({ ...s }));
  const stageId = payload.stage;
  const status = payload.status || 'running';
  const idx = STAGE_ORDER.indexOf(stageId || '');
  if (idx < 0) return next;
  for (let i = 0; i < idx; i++) {
    const s = next.find((x) => x.id === STAGE_ORDER[i]);
    if (s) s.status = 'done';
  }
  const cur = next.find((x) => x.id === stageId);
  if (cur) {
    cur.status = status as PipelineStage['status'];
    const detail = payload.detail || payload.message;
    if (detail) cur.detail = detail;
  }
  return next;
}

function resolveSceneIndex(ev: Record<string, unknown>): number | null {
  const payload = (ev.payload || {}) as Record<string, unknown>;
  const fromPayload = (payload.scene as { index?: number })?.index ?? payload.scene;
  const fromTop = ev.scene;
  const n = Number(fromTop ?? fromPayload);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function shouldAcceptClientEvent(
  ev: Record<string, unknown>,
  ctx: { taskId: string | null; maxSceneByChapter: Map<number, number> },
): boolean {
  const taskId = (ev.taskId as string) || ((ev.payload as Record<string, unknown>)?.taskId as string) || null;
  if (ctx.taskId && taskId && taskId !== ctx.taskId) return false;

  const chapter = Number(ev.chapter ?? (ev.payload as Record<string, unknown>)?.chapter);
  const scene = resolveSceneIndex(ev);
  if (!Number.isFinite(chapter) || scene == null) return true;

  const prev = ctx.maxSceneByChapter.get(chapter) ?? 0;
  const name = resolveEventName(ev);
  if (scene < prev && !['pipelineFailed', 'sceneRejected'].includes(name)) return false;
  if (scene >= prev) ctx.maxSceneByChapter.set(chapter, scene);
  return true;
}

function applyEvent(stages: PipelineStage[], ev: Record<string, unknown>): PipelineStage[] {
  const next = stages.map((s) => ({ ...s }));
  const name = resolveEventName(ev);
  const payload = (ev.payload || {}) as Record<string, unknown>;
  const sceneIdx = (payload.scene as { index?: number })?.index ?? payload.scene;

  const markDoneUpTo = (id: string) => {
    const idx = next.findIndex((x) => x.id === id);
    for (let i = 0; i <= idx; i++) next[i] = { ...next[i], status: 'done' };
  };

  const setRunning = (id: string, detail?: string) => {
    const s = next.find((x) => x.id === id);
    if (s) Object.assign(s, { status: 'running', detail });
  };

  if (name === 'connected') {
    next[0] = { ...next[0], status: 'running' };
  } else if (name === 'pipelineStage') {
    return applyPipelineStage(next, payload as { stage?: string; status?: string; detail?: string });
  } else if (name === 'pipelineHeartbeat') {
    return applyPipelineStage(next, {
      stage: String(payload.stage || 'writer'),
      status: 'running',
      detail: String(payload.message || payload.detail || '仍在生成…'),
    });
  } else if (name === 'nextChapterPlanned') {
    markDoneUpTo('planner');
    setRunning('decision');
  } else if (name === 'decisionRejected') {
    const s = next.find((x) => x.id === 'decision');
    if (s) s.status = 'failed';
  } else if (name === 'sceneFinished') {
    markDoneUpTo('conflict');
    const detail = sceneIdx ? `Scene ${sceneIdx}` : '';
    next.forEach((s) => {
      if (s.id === 'scene' || s.id === 'writer') Object.assign(s, { status: 'done', detail });
    });
    setRunning('review');
  } else if (name === 'chapterFinished') {
    markDoneUpTo('writer');
    setRunning('review');
  } else if (['criticRejected', 'chapterReviewFailed', 'validationRejected', 'sceneReviewFailed'].includes(name)) {
    const s = next.find((x) => x.id === 'review');
    if (s) s.status = 'failed';
  } else if (name === 'memoryUpdated') {
    const rev = next.find((x) => x.id === 'review');
    if (rev) rev.status = 'done';
    setRunning('memory');
  } else if (name === 'pipelineCompleted') {
    return next.map((s) => ({ ...s, status: 'done' as const }));
  } else if (name === 'sceneRejected') {
    const errText = String(
      (payload.error as string)
      || (ev.stream as { error?: string; message?: string })?.message
      || 'Scene 被拒绝，Pipeline 已停止（不会自动重试）',
    );
    const run = next.find((s) => s.status === 'running') || next.find((x) => x.id === 'writer');
    if (run) {
      run.status = 'failed';
      run.detail = errText;
    }
  } else if (name === 'pipelineFailed') {
    const errText = String(
      (payload.error as string)
      || (ev.error as string)
      || (ev.stream as { error?: string; message?: string })?.error
      || (ev.stream as { message?: string })?.message
      || 'Pipeline 失败',
    );
    const run = next.find((s) => s.status === 'running') || next.find((s) => s.id === 'writer');
    if (run) {
      run.status = 'failed';
      run.detail = errText;
    }
  }

  return next;
}

function extractMessage(ev: Record<string, unknown>): string {
  const stream = ev.stream as { message?: string; error?: string } | undefined;
  const payload = ev.payload as { error?: string; detail?: string; message?: string } | undefined;
  const topError = ev.error as string | undefined;
  return payload?.error
    || topError
    || stream?.error
    || stream?.message
    || payload?.message
    || payload?.detail
    || String(ev.message || '');
}

export function useRuntimeStream(bookId: string) {
  const [stages, setStages] = useState<PipelineStage[]>(INITIAL_STAGES);
  const [active, setActive] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const unsubRef = useRef<(() => void) | null>(null);
  const pollOffsetRef = useRef(0);
  const guardCtxRef = useRef<{ taskId: string | null; maxSceneByChapter: Map<number, number> }>({
    taskId: null,
    maxSceneByChapter: new Map(),
  });

  const reset = useCallback(() => {
    setStages(INITIAL_STAGES.map((s) => ({ ...s })));
    setLastMessage('');
    setActive(false);
    pollOffsetRef.current = 0;
    guardCtxRef.current = { taskId: null, maxSceneByChapter: new Map() };
  }, []);

  const ingestEvent = useCallback((data: Record<string, unknown>) => {
    if (!shouldAcceptClientEvent(data, guardCtxRef.current)) return;
    const msg = extractMessage(data);
    if (msg) setLastMessage(msg);
    setStages((prev) => applyEvent(prev, data));
    const ev = resolveEventName(data);
    if (ev === 'pipelineCompleted' || ev === 'pipelineFailed') setActive(false);
  }, []);

  const syncRuntimeState = useCallback(() => {
    if (!bookId) return;
    api.getRuntimeState(bookId).then((state) => {
      const taskId = (state.taskId as string) || null;
      const chapter = Number(state.chapter);
      const scene = Number(state.currentScene);
      if (taskId) guardCtxRef.current.taskId = taskId;
      if (Number.isFinite(chapter) && Number.isFinite(scene) && scene > 0) {
        const prev = guardCtxRef.current.maxSceneByChapter.get(chapter) ?? 0;
        if (scene >= prev) guardCtxRef.current.maxSceneByChapter.set(chapter, scene);
      }
      if (state.phase === 'writing' && Number.isFinite(scene)) {
        setStages((prev) => applyPipelineStage(prev, {
          stage: 'writer',
          status: 'running',
          detail: `Scene ${scene} LLM 撰写中…`,
        }));
      }
    }).catch(() => {});
  }, [bookId]);

  const pollEvents = useCallback(() => {
    if (!bookId) return;
    api.getRuntimeEvents(bookId, pollOffsetRef.current).then(({ events, nextSince }) => {
      if (!events.length) return;
      pollOffsetRef.current = nextSince;
      for (const ev of events) ingestEvent(ev as Record<string, unknown>);
    }).catch(() => {});
  }, [bookId, ingestEvent]);

  const start = useCallback(() => {
    setActive(true);
    pollOffsetRef.current = 0;
    guardCtxRef.current = { taskId: null, maxSceneByChapter: new Map() };
    setStages(INITIAL_STAGES.map((s, i) => ({ ...s, status: i === 0 ? 'running' : 'waiting' })));
    setLastMessage('Novel Runtime 启动…');
    syncRuntimeState();
    setTimeout(pollEvents, 300);
    setTimeout(pollEvents, 1000);
  }, [pollEvents, syncRuntimeState]);

  const finish = useCallback((success: boolean, message?: string) => {
    setActive(false);
    pollEvents();
    if (success) {
      setStages((prev) => prev.map((s) => ({ ...s, status: 'done' as const })));
    }
    if (message) setLastMessage(message);
  }, [pollEvents]);

  const stop = useCallback(() => {
    setActive(false);
  }, []);

  useEffect(() => {
    if (!bookId) return;
    unsubRef.current?.();
    unsubRef.current = api.subscribeRuntimeEvents(bookId, (data) => {
      ingestEvent(data as Record<string, unknown>);
    });
    return () => { unsubRef.current?.(); };
  }, [bookId, ingestEvent]);

  useEffect(() => {
    if (!active || !bookId) return;
    pollEvents();
    syncRuntimeState();
    const timer = setInterval(() => {
      pollEvents();
      syncRuntimeState();
    }, 1000);
    return () => clearInterval(timer);
  }, [active, bookId, pollEvents, syncRuntimeState]);

  return { stages, active, lastMessage, start, stop, finish, reset, pollEvents };
}
