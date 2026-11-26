#!/usr/bin/env bash
# Starts the embedding microservice on macOS/Linux.
# MODEL_DIR is NOT set here: settings.py defaults it to ../model (server/model).
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "[warn] no .env found; copying .env.example"
  cp .env.example .env
fi

# Prefer the local venv created by ./setup.sh, then any Python 3.10+.
PYTHON="${PYTHON:-}"
if [ -z "$PYTHON" ]; then
  if [ -x .venv/bin/python ]; then
    PYTHON=.venv/bin/python
  else
    for candidate in python3.13 python3.12 python3.11 python3.10 python3 python; do
      if command -v "$candidate" >/dev/null 2>&1 \
        && "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
        PYTHON="$candidate"
        break
      fi
    done
  fi
fi

if [ -z "$PYTHON" ]; then
  echo "[error] Python 3.10+ not found. Run ./setup.sh first (or install Python 3.11+)." >&2
  exit 1
fi

exec "$PYTHON" -m uvicorn service:app --host 127.0.0.1 --port 8000
