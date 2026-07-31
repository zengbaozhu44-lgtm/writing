/**
 * Trigger — 文件系统事件触发器
 */
import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson } from '../../inkos-core/src/lib/paths.js';
import { brainSystemDir } from '../../inkos-brain/src/loader.js';

export class Trigger {
  constructor(bus, options = {}) {
    this.bus = bus;
    this.watchers = [];
    this.debounceMs = options.debounceMs ?? 800;
    this.pending = new Map();
  }

  watchChapterSaved(bookDir, onTrigger) {
    const chaptersDir = path.join(bookDir, 'chapters');
    if (!exists(chaptersDir)) fs.mkdirSync(chaptersDir, { recursive: true });

    const watcher = fs.watch(chaptersDir, { persistent: true }, (event, filename) => {
      if (!filename || !/^\d{4}_.*\.md$/.test(filename)) return;
      const chapter = parseInt(filename.slice(0, 4), 10);
      this._debounce(`chapter:${chapter}`, async () => {
        const filePath = path.join(chaptersDir, filename);
        if (!exists(filePath)) return;
        const text = fs.readFileSync(filePath, 'utf8');
        await this.bus.emit('chapterFinished', { bookDir, chapter, text, filePath, source: 'fs' });
        if (onTrigger) await onTrigger({ bookDir, chapter, text, filePath });
      });
    });
    this.watchers.push(watcher);
    return watcher;
  }

  watchSceneArtifacts(bookDir, onTrigger) {
    const brainDir = brainSystemDir(bookDir);
    if (!exists(brainDir)) fs.mkdirSync(brainDir, { recursive: true });

    const watcher = fs.watch(brainDir, { persistent: true }, (event, filename) => {
      if (!filename) return;

      if (/^ch_\d{4}_scenes\.json$/.test(filename)) {
        this._debounce(`scenes:${filename}`, async () => {
          const filePath = path.join(brainDir, filename);
          if (!exists(filePath)) return;
          const data = readJson(filePath);
          const pending = (data.scenes || []).filter((s) => s.text?.trim() && s.status !== 'done');
          for (const scene of pending) {
            await this.bus.emit('sceneFinished', { bookDir, chapter: data.chapter, scene, source: 'fs' });
          }
          if (onTrigger) await onTrigger({ bookDir, chapter: data.chapter, scenes: data.scenes, type: 'scenes' });
        });
      }

      if (/^ch_\d{4}_plan\.json$/.test(filename)) {
        this._debounce(`plan:${filename}`, async () => {
          if (onTrigger) {
            const m = filename.match(/ch_(\d{4})_plan/);
            const chapter = m ? Number(m[1]) : null;
            onTrigger({ bookDir, chapter, type: 'plan' });
          }
        });
      }
    });
    this.watchers.push(watcher);
    return watcher;
  }

  watchScenePrompts(bookDir, onTrigger) {
    const promptsDir = path.join(brainSystemDir(bookDir), 'prompts');
    if (!exists(promptsDir)) fs.mkdirSync(promptsDir, { recursive: true });

    const watcher = fs.watch(promptsDir, { persistent: true }, (event, filename) => {
      if (!filename || !/^ch_\d{4}_.*\.md$/.test(filename)) return;
      this._debounce(`prompt:${filename}`, async () => {
        if (onTrigger) {
          const m = filename.match(/ch_(\d{4})_/);
          onTrigger({ bookDir, chapter: m ? Number(m[1]) : null, filename, type: 'prompt' });
        }
      });
    });
    this.watchers.push(watcher);
    return watcher;
  }

  async emitChapterFinished(bookDir, chapter, text) {
    return this.bus.emit('chapterFinished', { bookDir, chapter, text, source: 'manual' });
  }

  async emitSceneFinished(bookDir, chapter, scene) {
    return this.bus.emit('sceneFinished', { bookDir, chapter, scene, source: 'manual' });
  }

  _debounce(key, fn) {
    clearTimeout(this.pending.get(key));
    this.pending.set(key, setTimeout(() => {
      this.pending.delete(key);
      fn().catch(console.error);
    }, this.debounceMs));
  }

  stop() {
    for (const w of this.watchers) w.close();
    this.watchers = [];
    for (const t of this.pending.values()) clearTimeout(t);
    this.pending.clear();
  }
}
