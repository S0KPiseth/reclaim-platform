FROM python:3.11-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

# CPU-only torch keeps the image small. Swap for a CUDA build on a GPU host.
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY encoder.py settings.py service.py ./

# The CLIP checkpoint is mounted at runtime, never baked into the image:
#   docker run -v /abs/path/to/server/model:/models/model:ro \
#              -e MODEL_DIR=/models/model -e EMBEDDING_API_KEY=... -p 8000:8000 ...
ENV MODEL_DIR=/models/model

EXPOSE 8000
CMD ["uvicorn", "service:app", "--host", "0.0.0.0", "--port", "8000"]
