#!/usr/bin/env node
/**
 * InkOS Studio Server — Runtime API Wrapper (Stability 1.0)
 * 不修改 Runtime / Brain。只包装公开 API。
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exists } from '../../inkos-core/src/lib/paths.js';
import { loadInkOsConfig } from '../../inkos-core/src/lib/config.js';
import { handleApi } from './routes.js';
import { normalizeVersion } from './compatibility.js';
import { taskManager } from './task-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIST = path.resolve(__dirname, '../../inkos-studio/dist');

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    });
  });
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.woff2': 'font/woff2',
  };
  if (!exists(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

async function main() {
  const config = loadInkOsConfig();
  const port = Number(process.env.INKOS_STUDIO_PORT || config.servePort || 4567);
  const ver = normalizeVersion();

  // Boot：清除上次崩溃遗留的 pending/running 任务并回滚章锁
  const sweep = taskManager.sweepStaleTasks({ reason: 'studio-server-boot' });
  if (sweep.swept > 0) {
    console.warn(`  ⚠ Stale Task Sweeper: 已中断 ${sweep.swept} 个残留任务并尝试回滚`);
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-InkOS-Runtime-Version', ver.runtimeVersion);
    res.setHeader('X-InkOS-API-Version', ver.apiVersion);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const url = new URL(req.url, `http://localhost:${port}`);

    if (url.pathname.startsWith('/api/')) {
      const body = ['POST', 'PUT', 'DELETE'].includes(req.method) ? await readBody(req) : {};
      return handleApi(req, res, url, body);
    }

    let filePath = path.join(STUDIO_DIST, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!exists(filePath) && !path.extname(url.pathname)) {
      filePath = path.join(STUDIO_DIST, 'index.html');
    }
    serveStatic(res, filePath);
  });

  server.listen(port, () => {
    console.log(`\n  InkOS Novel Studio IDE`);
    console.log(`  ${ver.runtimeLabel} (LOCKED) · API ${ver.apiVersion}`);
    console.log(`  → http://localhost:${port}`);
    console.log(`  API → http://localhost:${port}/api/version`);
    if (!exists(STUDIO_DIST)) {
      console.log(`\n  ⚠ 前端未构建。运行: npm run studio:build`);
    }
    console.log('');
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
