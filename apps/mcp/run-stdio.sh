#!/usr/bin/env bash
# Launcher for Cursor / Claude Code MCP hosts. Always uses stdio (hosts own
# the transport). Loads apps/mcp/.env when present, then forces stdio.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/apps/mcp"

# Cursor / GUI hosts often lack ~/.cargo/bin on PATH.
if [[ -f "${CARGO_HOME:-$HOME/.cargo}/env" ]]; then
  # shellcheck disable=SC1091
  source "${CARGO_HOME:-$HOME/.cargo}/env"
fi
export PATH="${CARGO_HOME:-$HOME/.cargo}/bin:${PATH:-}"

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
# Stdio hosts time out if we sit in auth retries for minutes.
export WIRE_MCP_STARTUP_RETRIES="${WIRE_MCP_STARTUP_RETRIES:-5}"

CARGO_BIN="${CARGO_HOME:-$HOME/.cargo}/bin/cargo"
if [[ ! -x "$CARGO_BIN" ]]; then
  CARGO_BIN="$(command -v cargo || true)"
fi
if [[ -z "$CARGO_BIN" ]]; then
  echo "cargo not found; install Rust or put cargo on PATH" >&2
  exit 1
fi

# Prefer a built binary so hosts don't wait on compile during handshake.
for candidate in \
  target/release/wire-mcp \
  target/debug/wire-mcp \
  "${CARGO_TARGET_DIR:-}/release/wire-mcp" \
  "${CARGO_TARGET_DIR:-}/debug/wire-mcp"
do
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    exec "$candidate" serve
  fi
done

exec "$CARGO_BIN" run -q -- serve
