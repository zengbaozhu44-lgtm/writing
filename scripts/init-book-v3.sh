#!/usr/bin/env bash
# [已废弃] 请使用 init-book-v4.sh — V4 为所有新书默认标准
echo "⚠ V3 已废弃，正在转发到 V4..." >&2
exec "$(dirname "$0")/init-book-v4.sh" "$@"
