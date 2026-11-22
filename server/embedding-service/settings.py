"""Minimal .env loader + default MODEL_DIR resolution.

Kept separate from service.py so the path rules are testable and so the model
folder is never hardcoded: if MODEL_DIR is unset we fall back to ../model
relative to this file, i.e. server/model.
"""

import os
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL_DIR = SERVICE_DIR.parent / "model"


def load_env(path: Path | None = None) -> None:
    """Load KEY=VALUE pairs from .env without clobbering real env vars."""
    env_file = path or SERVICE_DIR / ".env"
    if not env_file.is_file():
        return
    for raw in env_file.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        # Empty values in .env mean "use the default", so don't override with "".
        if key and value and key not in os.environ:
            os.environ[key] = value


def resolve_model_dir() -> str:
    """MODEL_DIR from env, else server/model, else "" (service refuses to start)."""
    configured = os.environ.get("MODEL_DIR", "").strip()
    candidate = Path(configured).expanduser() if configured else DEFAULT_MODEL_DIR
    return str(candidate.resolve())
