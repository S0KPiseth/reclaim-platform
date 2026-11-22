@echo off
REM Starts the embedding microservice on Windows.
REM MODEL_DIR is intentionally NOT set here: settings.py defaults it to
REM ..\model, i.e. server\model. Override only via embedding-service\.env.

cd /d "%~dp0"

if not exist ".env" (
  echo [warn] No .env found. Copying .env.example - edit it to set EMBEDDING_API_KEY.
  copy /y ".env.example" ".env" >nul
)

python -m uvicorn service:app --host 127.0.0.1 --port 8000
