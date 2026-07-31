/**
 * Dispatcher — 事件分发到 Pipeline 处理器
 */
export class Dispatcher {
  constructor(bus, handlers) {
    this.bus = bus;
    this.handlers = handlers;
    this.wired = false;
  }

  wire() {
    if (this.wired) return;

    const bindings = [
      ['sceneFinished', 'onSceneFinished', 20],
      ['sceneReviewFailed', 'onSceneReviewFailed', 15],
      ['sceneRejected', 'onSceneRejected', 15],
      ['chapterFinished', 'onChapterFinished', 20],
      ['chapterReviewFailed', 'onChapterReviewFailed', 15],
      ['memoryUpdated', 'onMemoryUpdated', 5],
      ['reviewFailed', 'onReviewFailed', 10],
      ['decisionRejected', 'onDecisionRejected', 10],
      ['metricsLow', 'onMetricsLow', 10],
      ['criticRejected', 'onCriticRejected', 10],
      ['validationRejected', 'onValidationRejected', 10],
      ['pipelineCompleted', 'onPipelineCompleted', 25],
      ['pipelineFailed', 'onPipelineFailed', 25],
      ['nextChapterPlanned', 'onNextChapterPlanned', 15],
    ];

    for (const [event, handlerKey, priority] of bindings) {
      const fn = this.handlers[handlerKey];
      if (fn) this.bus.on(event, fn.bind(this.handlers), { priority });
    }

    this.wired = true;
  }
}
