/**
 * Scheduler — 串行任务队列，保证 Pipeline 顺序执行
 */
export class Scheduler {
  constructor() {
    this.queue = [];
    this.running = false;
    this.results = [];
  }

  enqueue(task, meta = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, meta, resolve, reject });
      this._drain();
    });
  }

  async _drain() {
    if (this.running) return;
    this.running = true;
    while (this.queue.length) {
      const { task, meta, resolve, reject } = this.queue.shift();
      try {
        const result = await task();
        this.results.push({ meta, result, at: new Date().toISOString() });
        resolve(result);
      } catch (err) {
        this.results.push({ meta, error: err.message, at: new Date().toISOString() });
        reject(err);
      }
    }
    this.running = false;
  }

  clear() {
    this.queue = [];
  }
}
