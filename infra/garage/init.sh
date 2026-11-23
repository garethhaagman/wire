#!/bin/bash
# One-time setup for the local single-node dev Garage cluster: assigns this node
# to the cluster layout (required before Garage will serve any S3 request) and
# creates + grants the bucket apps/api's S3Adapter expects. Safe to re-run —
# every step no-ops (or reuses the existing key) if already done.
#
# Run from the repo root, on the HOST (not inside the container — the official
# Garage image is scratch-based with no shell, so this drives the `garage` CLI
# via `docker compose exec` instead of copying a script into the container):
#
#   docker compose --profile s3 up -d garage
#   ./infra/garage/init.sh
set -euo pipefail

COMPOSE=(docker compose --profile s3 exec garage /garage)
BUCKET="wire-dev"
KEY_NAME="wire-api"
CREDENTIALS_FILE="$(dirname "$0")/../../apps/api/.garage-dev-credentials.env"

echo "waiting for garage to be ready..."
until "${COMPOSE[@]}" status >/dev/null 2>&1; do sleep 1; done

NODE_ID=$("${COMPOSE[@]}" status | awk '/NO ROLE ASSIGNED/ {print $1}' | head -n1)
if [ -n "$NODE_ID" ]; then
  echo "assigning cluster layout to node $NODE_ID..."
  "${COMPOSE[@]}" layout assign -z dev -c 1G "$NODE_ID"
  "${COMPOSE[@]}" layout apply --version 1
fi

"${COMPOSE[@]}" bucket create "$BUCKET" 2>/dev/null || true

if [ -f "$CREDENTIALS_FILE" ]; then
  echo "credentials already captured at $CREDENTIALS_FILE — skipping key creation"
else
  if "${COMPOSE[@]}" key info "$KEY_NAME" >/dev/null 2>&1; then
    # Key already exists from a prior run but the credentials file is missing
    # (e.g. deleted after being copied into .env) — Garage has no "show secret
    # again" command, so the only recovery is a fresh key under a new name.
    KEY_NAME="wire-api-$(date +%s)"
  fi

  OUTPUT=$("${COMPOSE[@]}" key create "$KEY_NAME")
  # Garage pads these fields with variable runs of spaces (not a single `: `
  # separator), so strip the label and all whitespace rather than splitting on
  # a fixed delimiter.
  ACCESS_KEY=$(echo "$OUTPUT" | grep "Key ID:" | sed -E 's/^Key ID:[[:space:]]*//' | tr -d '\r[:space:]')
  SECRET_KEY=$(echo "$OUTPUT" | grep "Secret key:" | sed -E 's/^Secret key:[[:space:]]*//' | tr -d '\r[:space:]')

  cat > "$CREDENTIALS_FILE" <<EOF
S3_ACCESS_KEY_ID=$ACCESS_KEY
S3_SECRET_ACCESS_KEY=$SECRET_KEY
EOF
  echo "wrote $CREDENTIALS_FILE — copy these two lines into apps/api/.env"
fi

"${COMPOSE[@]}" bucket allow --read --write "$BUCKET" --key "$KEY_NAME"

echo "garage dev bucket '$BUCKET' ready"
