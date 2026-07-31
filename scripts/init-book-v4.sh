#!/usr/bin/env bash
# InkOS V4 — 初始化新书（调用 Node CLI）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/packages/inkos-core/src/cli.js" init "$@"
