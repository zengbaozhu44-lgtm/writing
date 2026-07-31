/**
 * Runtime Event → Studio UI 阶段映射（只读，不修改 Runtime）
 */

export const PIPELINE_STAGES = [
  { id: 'planner', label: 'Planner', message: '分析当前状态' },
  { id: 'decision', label: 'Decision', message: '检查人物目标' },
  { id: 'conflict', label: 'Conflict', message: '生成冲突' },
  { id: 'scene', label: 'Scene Planner', message: '规划场景' },
  { id: 'writer', label: 'Writer', message: '正在生成正文' },
  { id: 'review', label: 'Review', message: '检查一致性' },
  { id: 'memory', label: 'Memory', message: '更新记忆' },
];

const EVENT_MESSAGES = {
  nextChapterPlanned: '剧情规划完成',
  sceneFinished: 'Scene 生成完成',
  sceneReviewFailed: 'Scene 检查未通过',
  sceneRejected: 'Scene 被拒绝',
  chapterFinished: '章节正文完成',
  chapterReviewFailed: '章节检查未通过',
  memoryUpdated: '记忆已更新',
  pipelineCompleted: 'Pipeline 完成',
  pipelineFailed: 'Pipeline 失败',
  criticRejected: 'Critic 未通过',
  decisionRejected: '决策未通过',
  validationRejected: '验证未通过',
  reviewFailed: 'Review 失败',
  metricsLow: '指标偏低',
  pipelineStage: '阶段推进',
  pipelineHeartbeat: '生成进行中',
};

/** 根据 Runtime 事件推进 UI 阶段 */
export function applyRuntimeEvent(stages, runtimeEvent) {
  const next = stages.map((s) => ({ ...s }));
  const ev = runtimeEvent.event;
  const sceneIdx = runtimeEvent.payload?.scene?.index;

  const setStatus = (id, status, extra = {}) => {
    const s = next.find((x) => x.id === id);
    if (s) Object.assign(s, { status, ...extra });
  };

  const markDoneUpTo = (id) => {
    const idx = next.findIndex((x) => x.id === id);
    for (let i = 0; i <= idx; i++) next[i].status = 'done';
  };

  if (ev === 'nextChapterPlanned') {
    markDoneUpTo('planner');
    setStatus('decision', 'running');
  } else if (ev === 'decisionRejected') {
    setStatus('decision', 'failed');
  } else if (ev === 'sceneFinished') {
    markDoneUpTo('conflict');
    setStatus('scene', 'done', { detail: sceneIdx ? `Scene ${sceneIdx}` : '' });
    setStatus('writer', 'done', { detail: sceneIdx ? `Scene ${sceneIdx}` : '' });
    setStatus('review', 'running');
  } else if (ev === 'sceneReviewFailed' || ev === 'sceneRejected') {
    setStatus('review', 'failed');
  } else if (ev === 'chapterFinished') {
    markDoneUpTo('writer');
    setStatus('review', 'running');
  } else if (ev === 'criticRejected' || ev === 'chapterReviewFailed' || ev === 'validationRejected') {
    setStatus('review', 'failed');
  } else if (ev === 'memoryUpdated') {
    setStatus('review', 'done');
    setStatus('memory', 'running');
  } else if (ev === 'pipelineStage') {
    const stageId = runtimeEvent.payload?.stage;
    const status = runtimeEvent.payload?.status || 'running';
    const detail = runtimeEvent.payload?.detail;
    const order = ['planner', 'decision', 'conflict', 'scene', 'writer', 'review', 'memory'];
    const idx = order.indexOf(stageId);
    if (idx >= 0) {
      for (let i = 0; i < idx; i++) setStatus(order[i], 'done');
      setStatus(stageId, status, detail ? { detail } : {});
    }
  } else if (ev === 'pipelineHeartbeat') {
    const stageId = runtimeEvent.payload?.stage || 'writer';
    const detail = runtimeEvent.payload?.message || runtimeEvent.payload?.detail;
    setStatus(stageId, 'running', detail ? { detail } : {});
  } else if (ev === 'pipelineCompleted') {
    for (const s of next) s.status = 'done';
  } else if (ev === 'pipelineFailed') {
    const running = next.find((s) => s.status === 'running');
    if (running) running.status = 'failed';
  }

  return next;
}

export function initialPipelineStages(running = false) {
  return PIPELINE_STAGES.map((s, i) => ({
    ...s,
    status: running && i === 0 ? 'running' : 'waiting',
    detail: '',
  }));
}

export function formatStreamPayload(runtimeEvent) {
  const scene = runtimeEvent.payload?.scene?.index ?? runtimeEvent.payload?.scene;
  const heartbeatMsg = runtimeEvent.event === 'pipelineHeartbeat'
    ? runtimeEvent.payload?.message
    : null;
  const stageDetail = runtimeEvent.event === 'pipelineStage'
    ? runtimeEvent.payload?.detail
    : null;
  return {
    type: runtimeEvent.event,
    chapter: runtimeEvent.payload?.chapter,
    scene: typeof scene === 'object' ? scene?.index : scene,
    message: runtimeEvent.event === 'pipelineFailed'
      ? (runtimeEvent.error || runtimeEvent.payload?.error || runtimeEvent.payload?.message || EVENT_MESSAGES.pipelineFailed)
      : (heartbeatMsg || stageDetail || EVENT_MESSAGES[runtimeEvent.event] || runtimeEvent.label || runtimeEvent.event),
    error: runtimeEvent.error || runtimeEvent.payload?.error,
    at: runtimeEvent.at,
    uiEvent: runtimeEvent.uiEvent,
  };
}
