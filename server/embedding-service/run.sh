#!/usr/bin/env bash
# Starts the embedding microservice on macOS/Linux.
# MODEL_DIR is NOT set here: settings.py defaults it to ../model (server/model).
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "[warn] no .env found; copying .env.example"
  cp .env.example .env
fi

exec python -m uvicorn service:app --host 127.0.0.1 --port 8000
