#!/usr/bin/env bash
# Launcher for Cursor / Claude Code MCP hosts. Always uses stdio (hosts own
# the transport). Loads apps/mcp/.env when present, then forces stdio.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/apps/mcp"

export WIRE_API_URL="${WIRE_API_URL:-http://localhost:3001}"
export WIRE_EMAIL="${WIRE_EMAIL:-dev@wire.local}"
export WIRE_PASSWORD="${WIRE_PASSWORD:-wire-dev-password}"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export WIRE_MCP_TRANSPORT=stdio

exec cargo run -q -- serve
