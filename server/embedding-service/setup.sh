#!/usr/bin/env bash
# Creates a local .venv and installs the embedding service dependencies.
# Run once: ./setup.sh   then start it with: ./run.sh
set -euo pipefail
cd "$(dirname "$0")"

PYTHON="${PYTHON:-}"
if [ -z "$PYTHON" ]; then
  for candidate in python3.13 python3.12 python3.11 python3.10; do
    if command -v "$candidate" >/dev/null 2>&1; then
      PYTHON="$candidate"
      break
    fi
  done
fi

if [ -z "$PYTHON" ]; then
  echo "[error] Python 3.10+ is required (macOS system python3 may be older)." >&2
  echo "        Install one, e.g.: brew install python@3.11" >&2
  exit 1
fi

echo "Using $("$PYTHON" --version) at $(command -v "$PYTHON")"
"$PYTHON" -m venv .venv
.venv/bin/python -m pip install --upgrade pip
# macOS wheels come from PyPI; the +cpu torch index only applies to Linux/Windows.
.venv/bin/python -m pip install -r requirements.txt torch

echo
echo "Done. Start the service with: ./run.sh"
