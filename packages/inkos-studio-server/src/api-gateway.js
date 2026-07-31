/**
 * API Gateway — 权限分类与路由注册
 *
 * READ_ONLY:     只读 Runtime 产出物，禁止副作用
 * RUNTIME_CTRL:  调用 Runtime 公开命令，禁止直写业务数据
 *
 * FORBIDDEN:     Studio 不得实现的端点（文档化，网关拦截）
 */

export const Permission = {
  READ_ONLY: 'read_only',
  CANON_EDIT: 'canon_edit',
  RUNTIME_CONTROL: 'runtime_control',
  FORBIDDEN: 'forbidden',
};

/** @type {Map<string, { method: string, permission: string, handler: string, description: string }>} */
export const ROUTE_REGISTRY = new Map();

function reg(method, path, permission, handler, description) {
  ROUTE_REGISTRY.set(`${method} ${path}`, { method, path, permission, handler, description });
}

// ── Read Only ──
reg('GET', '/api/books', Permission.READ_ONLY, 'listBooks', '书籍列表');
reg('GET', '/api/books/:id/stats', Permission.READ_ONLY, 'getBookStats', '书籍统计');
reg('POST', '/api/ai/generate', Permission.CANON_EDIT, 'aiGenerateGlobal', 'Wizard AI 生成');
reg('POST', '/api/ai/generate/world', Permission.CANON_EDIT, 'aiGenerateWorld', 'AI 生成世界');
reg('POST', '/api/ai/generate/writing', Permission.CANON_EDIT, 'aiGenerateWriting', 'AI 生成写作规则');
reg('POST', '/api/ai/generate/character', Permission.CANON_EDIT, 'aiGenerateCharacter', 'AI 生成人物');
reg('POST', '/api/ai/generate/faction', Permission.CANON_EDIT, 'aiGenerateFaction', 'AI 生成势力');
reg('POST', '/api/ai/generate/volume', Permission.CANON_EDIT, 'aiGenerateVolume', 'AI 生成卷纲');
reg('GET', '/api/books/:id/volume-plan', Permission.READ_ONLY, 'getVolumePlan', '读取卷纲+staleness');
reg('GET', '/api/books/:id/volume-plan/:vol', Permission.READ_ONLY, 'getVolumePlanVol', '读取指定卷纲');
reg('PUT', '/api/books/:id/volume-plan', Permission.CANON_EDIT, 'putVolumePlan', '保存卷纲编辑');
reg('PUT', '/api/books/:id/volume-plan/:vol', Permission.CANON_EDIT, 'putVolumePlanVol', '保存指定卷纲');
reg('GET', '/api/runtime/events/:id', Permission.READ_ONLY, 'runtimeEventStream', 'Runtime SSE 事件流');
reg('GET', '/api/writing/dimensions', Permission.READ_ONLY, 'getWritingDimensions', '文风维度');
reg('POST', '/api/ai/cocreate', Permission.CANON_EDIT, 'cocreate', 'AI 共创');
reg('POST', '/api/ai/incremental', Permission.CANON_EDIT, 'incrementalGlobal', '增量 AI');
reg('POST', '/api/ai/writing/optimize', Permission.CANON_EDIT, 'optimizeWriting', '文风优化');
reg('POST', '/api/ai/story-director', Permission.CANON_EDIT, 'storyDirector', 'AI 故事导演');
reg('POST', '/api/ai/world-simulate', Permission.CANON_EDIT, 'worldSimulate', '世界模拟');
reg('POST', '/api/ai/character-brain', Permission.CANON_EDIT, 'characterBrain', '人物大脑');
reg('POST', '/api/ai/editor', Permission.CANON_EDIT, 'aiEditor', 'AI 编辑室');
reg('POST', '/api/ai/style-dna', Permission.CANON_EDIT, 'styleDna', '文风 DNA');
reg('POST', '/api/ai/chapter-director', Permission.CANON_EDIT, 'chapterDirector', '章节导演');
reg('POST', '/api/ai/prompt-quality', Permission.READ_ONLY, 'promptQuality', 'Prompt 质量评分');
reg('POST', '/api/ai/conversation', Permission.CANON_EDIT, 'conversationCreate', '对话式共创');
reg('POST', '/api/ai/wizard/world-boundary', Permission.CANON_EDIT, 'checkWorldBoundary', '世界边界检查');
reg('POST', '/api/ai/wizard/trial-opening', Permission.CANON_EDIT, 'trialWriteOpening', '试写开篇预览');
reg('GET', '/api/books/:id/creative-dashboard', Permission.READ_ONLY, 'creativeDashboard', '创作任务中心');
reg('GET', '/api/books/:id/story-dna', Permission.READ_ONLY, 'getStoryDna', 'Story DNA');
reg('PUT', '/api/books/:id/story-dna', Permission.CANON_EDIT, 'putStoryDna', '保存 Story DNA');
reg('GET', '/api/books/:id/conflict-calibration', Permission.READ_ONLY, 'getConflictCalibration', '冲突校准');
reg('PUT', '/api/books/:id/conflict-calibration', Permission.CANON_EDIT, 'putConflictCalibration', '保存冲突校准');
reg('GET', '/api/books/:id/system/:name', Permission.READ_ONLY, 'getSystemFile', '系统 YAML');
reg('PUT', '/api/books/:id/system/:name', Permission.CANON_EDIT, 'putSystemFile', '写入系统 YAML');
reg('POST', '/api/books/:id/world-simulate', Permission.CANON_EDIT, 'bookWorldSimulate', '书籍世界模拟');
reg('POST', '/api/books/:id/chapter-director', Permission.CANON_EDIT, 'bookChapterDirector', '书籍章节导演');
reg('POST', '/api/books/:id/ai-editor', Permission.CANON_EDIT, 'bookAiEditor', '书籍 AI 编辑');
reg('GET', '/api/books/:id/characters/:name/brain', Permission.READ_ONLY, 'getCharacterBrain', '人物大脑状态');
reg('PUT', '/api/books/:id/characters/:name/brain', Permission.CANON_EDIT, 'putCharacterBrain', '保存人物大脑');
reg('POST', '/api/books/:id/characters/:name/brain', Permission.CANON_EDIT, 'analyzeCharacterBrain', 'AI 分析人物大脑');
reg('GET', '/api/books/:id/story-context', Permission.READ_ONLY, 'getStoryContext', 'Novel Intelligence Context');
reg('GET', '/api/books/:id/living-status', Permission.READ_ONLY, 'getLivingStatus', 'Living Novel 生命状态');
reg('GET', '/api/books/:id/chapter-plans/:chapter', Permission.READ_ONLY, 'getChapterPlan', '章节计划');
reg('PUT', '/api/books/:id/chapter-plans/:chapter', Permission.CANON_EDIT, 'putChapterPlan', '保存章节计划');
reg('GET', '/api/books/:id/world-state', Permission.READ_ONLY, 'getWorldState', '世界状态');
reg('PUT', '/api/books/:id/world-state', Permission.CANON_EDIT, 'putWorldState', '更新世界状态');
reg('GET', '/api/books/:id/editor-feedback/:chapter', Permission.READ_ONLY, 'getEditorFeedback', '编辑反馈');
reg('POST', '/api/books/:id/characters/:name/evolve', Permission.CANON_EDIT, 'evolveCharacter', '人物演化');
reg('POST', '/api/books/:id/living/evolve', Permission.CANON_EDIT, 'livingEvolve', '章节后演化闭环');
reg('POST', '/api/books/:id/living/prepare', Permission.CANON_EDIT, 'livingPrepare', '章节前上下文注入');
reg('POST', '/api/books/:id/runtime/run-living', Permission.RUNTIME_CONTROL, 'runtimeRunLiving', 'Living 模式异步生成（202 + taskId）');
reg('GET', '/api/tasks/:id', Permission.READ_ONLY, 'getTask', '异步任务状态');
reg('GET', '/api/tasks/:id/stream', Permission.READ_ONLY, 'taskEventStream', '异步任务 SSE');
reg('GET', '/api/styles', Permission.READ_ONLY, 'listStyles', '文风库');
reg('POST', '/api/styles', Permission.CANON_EDIT, 'saveStyle', '保存文风');
reg('POST', '/api/books/:id/creator/incremental', Permission.CANON_EDIT, 'creatorIncremental', 'Creator Loop 增量');
reg('GET', '/api/books/:id/modules/:key/versions', Permission.READ_ONLY, 'listVersions', '版本历史');
reg('GET', '/api/books/:id/creation-insights', Permission.READ_ONLY, 'getCreationInsights', '创作中心洞察');
reg('GET', '/api/books/:id', Permission.READ_ONLY, 'getBookMeta', '书籍元数据');
reg('GET', '/api/books/:id/dashboard', Permission.READ_ONLY, 'getDashboard', 'Dashboard 聚合');
reg('GET', '/api/books/:id/runtime/status', Permission.READ_ONLY, 'getRuntimeStatus', 'Runtime 状态');
reg('GET', '/api/books/:id/runtime/events', Permission.READ_ONLY, 'getEvents', '事件日志');
reg('GET', '/api/books/:id/health', Permission.READ_ONLY, 'getHealth', 'Story Health');
reg('GET', '/api/books/:id/chapters/:n/scenes', Permission.READ_ONLY, 'getScenes', 'Scene 列表');
reg('GET', '/api/books/:id/chapters/:n/plan', Permission.READ_ONLY, 'getPlanner', 'Planner 产出');
reg('GET', '/api/books/:id/chapters/:n/run', Permission.READ_ONLY, 'getRun', 'Chapter Run');
reg('GET', '/api/books/:id/state', Permission.READ_ONLY, 'getState', 'Current State');
reg('GET', '/api/books/:id/world', Permission.READ_ONLY, 'getWorld', 'State Board');
reg('GET', '/api/books/:id/memory/snapshots', Permission.READ_ONLY, 'listSnapshots', 'Memory Snapshots');
reg('GET', '/api/books/:id/memory/diff', Permission.READ_ONLY, 'memoryDiff', 'Memory Diff');
reg('GET', '/api/version', Permission.READ_ONLY, 'getVersion', 'API + Runtime 版本');
reg('GET', '/api/books/:id/stream', Permission.READ_ONLY, 'eventStream', 'SSE Event Stream');

// ── IDE Canon / Module ──
reg('GET', '/api/books/:id/modules', Permission.READ_ONLY, 'listModules', '模块列表');
reg('GET', '/api/books/:id/modules/:key', Permission.READ_ONLY, 'getModule', '读取模块');
reg('GET', '/api/books/:id/modules/:key/:file', Permission.READ_ONLY, 'getModuleFile', '读取模块文件');
reg('PUT', '/api/books/:id/modules/:key', Permission.CANON_EDIT, 'putModule', '写入 Canon 模块');
reg('PUT', '/api/books/:id/modules/:key/:file', Permission.CANON_EDIT, 'putModuleFile', '写入角色/势力文件');
reg('DELETE', '/api/books/:id/modules/:key/:file', Permission.CANON_EDIT, 'deleteModuleFile', '删除 Canon 文件');
reg('GET', '/api/books/:id/prompt-analytics', Permission.READ_ONLY, 'getPromptAnalytics', 'Prompt 分析');
reg('GET', '/api/books/:id/hash-dependency-tree', Permission.READ_ONLY, 'getHashDependencyTree', 'Hash 依赖树');
reg('POST', '/api/books/:id/copilot', Permission.RUNTIME_CONTROL, 'copilot', 'Novel Copilot');
reg('POST', '/api/books', Permission.CANON_EDIT, 'createBook', '新建小说 Wizard');
reg('POST', '/api/books/:id/ai/generate', Permission.CANON_EDIT, 'aiGenerate', 'AI 生成 Canon');
reg('GET', '/api/presets', Permission.READ_ONLY, 'listPresets', '文风预设列表');
reg('GET', '/api/books/:id/chapters', Permission.READ_ONLY, 'listChapters', '章节列表');
reg('GET', '/api/books/:id/chapters/:n/text', Permission.READ_ONLY, 'getChapterText', '章节正文');
reg('PUT', '/api/books/:id/chapters/:n/text', Permission.CANON_EDIT, 'putChapterText', '保存章节正文');
reg('GET', '/api/books/:id/chapters/:n/diagnosis', Permission.READ_ONLY, 'getChapterDiagnosis', '章节诊断聚合');
reg('POST', '/api/books/:id/chapters/:n/accept', Permission.RUNTIME_CONTROL, 'acceptChapter', '接受本章并解锁下一章');
reg('DELETE', '/api/books/:id/chapters/:n/draft', Permission.RUNTIME_CONTROL, 'deleteChapterDraft', '删除本章草稿重跑');
reg('POST', '/api/books/:id/chapters/:n/optimize', Permission.CANON_EDIT, 'optimizeChapter', '一键优化本章');
reg('GET', '/api/books/:id/chapters/audit', Permission.READ_ONLY, 'listChapterAudit', '章节审计状态');
reg('GET', '/api/books/:id/wizard/chapter-tones', Permission.READ_ONLY, 'getWizardChapterTones', '前三章基调');
reg('PUT', '/api/books/:id/wizard/chapter-tones', Permission.CANON_EDIT, 'putWizardChapterTones', '保存前三章基调');
reg('GET', '/api/books/:id/chapters/health', Permission.READ_ONLY, 'listChapterHealth', '章节健康度列表');
reg('GET', '/api/books/:id/config', Permission.READ_ONLY, 'getBookConfig', '单书配置');
reg('PUT', '/api/books/:id/config', Permission.CANON_EDIT, 'putBookConfig', '更新单书配置（温度/模型）');

// ── Runtime Control（唯一允许 POST）──
reg('POST', '/api/books/:id/runtime/run', Permission.RUNTIME_CONTROL, 'runtimeRun', '启动 Pipeline');
reg('POST', '/api/books/:id/runtime/pause', Permission.RUNTIME_CONTROL, 'runtimePause', '暂停 Daemon');
reg('POST', '/api/books/:id/runtime/resume', Permission.RUNTIME_CONTROL, 'runtimeResume', '断点续写');
reg('POST', '/api/books/:id/runtime/retry', Permission.RUNTIME_CONTROL, 'runtimeRetry', '重试 Scene');
reg('POST', '/api/books/:id/runtime/replan', Permission.RUNTIME_CONTROL, 'runtimeReplan', '重新规划章');
reg('POST', '/api/books/:id/runtime/rollback', Permission.RUNTIME_CONTROL, 'runtimeRollback', '回滚 Snapshot');
reg('POST', '/api/books/:id/runtime/next', Permission.RUNTIME_CONTROL, 'runtimeNext', '下一章');
reg('POST', '/api/books/:id/runtime/daemon/start', Permission.RUNTIME_CONTROL, 'daemonStart', '启动 Daemon');
reg('POST', '/api/books/:id/runtime/daemon/stop', Permission.RUNTIME_CONTROL, 'daemonStop', '停止 Daemon');

// ── Forbidden（文档化，网关返回 403）──
const FORBIDDEN_ROUTES = [
  'PUT  /api/books/:id/chapters/:n/scenes',      // sceneText — Runtime Writer only
  'POST /api/books/:id/facts',
  'POST /api/books/:id/timeline',
  'POST /api/books/:id/relationship',
  'POST /api/books/:id/knowledge',
  'POST /api/books/:id/resource',
  'POST /api/books/:id/state',
  'POST /api/books/:id/memory/snapshot',         // Pipeline auto-creates
  'POST /api/books/:id/memory/branch',           // Runtime only
  'POST /api/books/:id/memory/rollback',         // use /runtime/rollback
];

for (const route of FORBIDDEN_ROUTES) {
  const [method, ...pathParts] = route.split(' ');
  reg(method, pathParts.join(' '), Permission.FORBIDDEN, null, 'FORBIDDEN — Runtime Pipeline only');
}

export function matchRoute(method, pathname) {
  for (const [key, route] of ROUTE_REGISTRY) {
    if (route.permission === Permission.FORBIDDEN) continue;
    const pattern = route.path
      .replace(/:id/g, '[^/]+')
      .replace(/:n/g, '\\d+');
    const re = new RegExp(`^${pattern}$`);
    if (route.method === method && re.test(pathname)) return route;
  }
  // Check forbidden
  for (const [key, route] of ROUTE_REGISTRY) {
    if (route.permission !== Permission.FORBIDDEN) continue;
    const pattern = route.path
      .replace(/:id/g, '[^/]+')
      .replace(/:n/g, '\\d+');
    const re = new RegExp(`^${pattern}$`);
    if (route.method === method && re.test(pathname)) return route;
  }
  return null;
}

export function isForbidden(route) {
  return route?.permission === Permission.FORBIDDEN;
}
