"""Stateless CLIP embedding microservice for the Reclaim lost & found app.

Endpoints
    GET  /health          liveness/readiness + model metadata (no auth)
    POST /embed/text      {"text": "..."}                  -> text vector
    POST /embed/image     multipart "file"                 -> image vector
    POST /embed/images    multipart "files" (batch)        -> image vectors
    POST /embed/item      {"title","description","image_urls"} -> text + image vectors
    POST /score           {"query": [...], "candidates": [[...]]} -> cosine scores
    POST /search/text     {"text","candidates":[{id,embedding}]} -> text->image ranked
    POST /search/image    multipart "file" + JSON "candidates" -> image->image ranked

The service never touches the database. Express owns persistence and decides
what to store; this process only turns text/images into vectors and does the
vector math. That keeps a model reload from ever blocking a DB migration.

Why /search/* exists in addition to /embed/*: CLIP's whole point is that text
and image vectors share one space, so a text query can rank item *photos*
directly. Doing that here means the ranking runs in one batched numpy call
instead of one HTTP round trip per candidate.

Configuration (environment)
    MODEL_DIR         Folder containing the CLIP checkpoint. REQUIRED.
    MODEL_VERSION     Label stored next to each vector so stale rows can be re-embedded.
    EMBEDDING_API_KEY If set, every request except /health must send X-API-Key.
    MAX_IMAGE_MB      Upload limit per image (default 10).
    MAX_BATCH         Images per /embed/images call (default 32).
    MAX_TEXTS         Texts per /embed/text call (default 32).
    MAX_CANDIDATES    Candidate vectors per /search call (default 2000).
"""

import hmac
import io
import json
import logging
import os
import threading
from contextlib import asynccontextmanager
from typing import Annotated, Any

import httpx
import numpy as np
import torch
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from PIL import UnidentifiedImageError
from pydantic import BaseModel, Field, field_validator
from starlette.concurrency import run_in_threadpool

from encoder import (
    image_vectors,
    load_encoder,
    open_image,
    score_matrix,
    text_vectors,
    to_response,
    tokenize,
)
from settings import load_env, resolve_model_dir

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("embedding-service")

# Load .env before reading any setting. MODEL_DIR defaults to server/model.
load_env()
MODEL_DIR = resolve_model_dir()
MODEL_VERSION = os.environ.get("MODEL_VERSION", "v1")
API_KEY = os.environ.get("EMBEDDING_API_KEY") or os.environ.get("SERVICE_API_KEY")
MAX_IMAGE_BYTES = int(float(os.environ.get("MAX_IMAGE_MB", "10")) * 1024 * 1024)
MAX_BATCH = int(os.environ.get("MAX_BATCH", "32"))
MAX_TEXTS = int(os.environ.get("MAX_TEXTS", "32"))
MAX_CANDIDATES = int(os.environ.get("MAX_CANDIDATES", "2000"))
MAX_TEXT_CHARS = 1000

state: dict[str, Any] = {}
# One forward pass at a time. Keeps peak memory predictable on CPU boxes and
# avoids CUDA OOM when several searches arrive together.
infer_lock = threading.Lock()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if not MODEL_DIR or not os.path.isdir(MODEL_DIR):
        raise RuntimeError(
            "Set MODEL_DIR to the folder holding the CLIP checkpoint "
            "(config.json, model.safetensors, tokenizer files)"
        )
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    log.info("loading CLIP from %s on %s", MODEL_DIR, device)
    model, processor, tokenizer = load_encoder(MODEL_DIR, device)
    state.update(
        device=device,
        model=model,
        processor=processor,
        tokenizer=tokenizer,
        dim=int(model.config.projection_dim),
    )
    log.info("model ready: dim=%s version=%s", state["dim"], MODEL_VERSION)
    try:
        yield
    finally:
        state.clear()


app = FastAPI(title="Reclaim embedding service", version="1.0.0", lifespan=lifespan)


# --------------------------------------------------------------------------- auth


def require_key(x_api_key: Annotated[str | None, Header()] = None):
    if API_KEY and not (x_api_key and hmac.compare_digest(x_api_key, API_KEY)):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


auth = [Depends(require_key)]


# ----------------------------------------------------------------------- schemas


class TextIn(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT_CHARS)


class TextsIn(BaseModel):
    texts: list[str] = Field(min_length=1)

    @field_validator("texts")
    @classmethod
    def _limit(cls, value: list[str]) -> list[str]:
        if len(value) > MAX_TEXTS:
            raise ValueError(f"at most {MAX_TEXTS} texts per call")
        if any(len(t) > MAX_TEXT_CHARS for t in value):
            raise ValueError(f"each text must be {MAX_TEXT_CHARS} characters or fewer")
        return value


class ItemIn(BaseModel):
    """An item is described by its text and its photos.

    Returns two vectors, deliberately kept separate:
      textVector  - CLIP text encoding of title + description
      imageVector - mean of the photo encodings (empty when there are no photos)

    They are not blended, because CLIP scores text-vs-text (~0.57) and
    text-vs-photo (~0.41) on different scales. Fusing them let wordy items
    without photos outrank genuine photo matches. Callers pick the vector that
    matches their query type.
    """

    title: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=MAX_TEXT_CHARS)
    image_urls: list[str] = Field(default_factory=list, max_length=10)


class ScoreIn(BaseModel):
    query: list[float] = Field(min_length=1)
    candidates: list[list[float]] = Field(min_length=1)


class Candidate(BaseModel):
    id: str
    embedding: list[float] = Field(min_length=1)


class SearchTextIn(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT_CHARS)
    candidates: list[Candidate] = Field(min_length=0)
    k: int = Field(default=10, ge=1, le=100)


# ------------------------------------------------------------------- image helpers


async def _read_image(upload: UploadFile):
    data = await upload.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail=f"{upload.filename}: image larger than limit")
    if not data:
        raise HTTPException(status_code=400, detail=f"{upload.filename}: file is empty")
    try:
        return open_image(io.BytesIO(data))
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail=f"{upload.filename}: not a readable image")


def _embeddings_for(images):
    """Batched image forward pass. Runs in the threadpool, not the event loop."""
    with infer_lock, torch.inference_mode():
        pixel_values = state["processor"](images=images, return_tensors="pt").pixel_values
        vectors = image_vectors(state["model"], pixel_values.to(state["device"]))
    return vectors.cpu().numpy(), state["dim"]


def _text_embedding(text: str):
    with infer_lock, torch.inference_mode():
        tokens = tokenize(state["tokenizer"], [text]).to(state["device"])
        vector = text_vectors(state["model"], tokens)[0].cpu().numpy()
    return vector, state["dim"]


def _guard_ready():
    if "model" not in state:
        raise HTTPException(status_code=503, detail="model is still loading")


def _vector_payload(vector, dim):
    payload = to_response(vector, dim)
    payload["model_version"] = MODEL_VERSION
    return payload


def _candidate_matrix(candidates: list[Candidate]):
    if not candidates:
        raise HTTPException(status_code=400, detail="candidates must not be empty")
    if len(candidates) > MAX_CANDIDATES:
        raise HTTPException(status_code=413, detail=f"at most {MAX_CANDIDATES} candidates per call")

    matrix = np.asarray([c.embedding for c in candidates], dtype=np.float32)
    if matrix.shape[1] != state["dim"]:
        raise HTTPException(
            status_code=400,
            detail=f"candidate vectors must have dim {state['dim']}, got {matrix.shape[1]}",
        )
    return matrix


def _ranked(candidates: list[Candidate], scores, k):
    order = scores.argsort()[::-1][:k]
    return [
        {"id": candidates[i].id, "score": round(float(scores[i]), 6)}
        for i in order
        if scores[i] > 0.0
    ]


# ------------------------------------------------------------------------ routes


@app.get("/health")
def health():
    ready = "model" in state
    return {
        "status": "ok" if ready else "loading",
        "model_version": MODEL_VERSION,
        "dim": state.get("dim"),
        "device": str(state.get("device")) if ready else None,
    }


@app.post("/embed/text", dependencies=auth)
def embed_text(body: TextIn):
    _guard_ready()
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text must contain characters")
    vector, dim = _text_embedding(text)
    return _vector_payload(vector, dim)


@app.post("/embed/texts", dependencies=auth)
def embed_texts(body: TextsIn):
    """Batch text encoding: one forward pass instead of one per text."""
    _guard_ready()
    texts = [t.strip() for t in body.texts]
    if any(not t for t in texts):
        raise HTTPException(status_code=400, detail="every text must contain characters")
    with infer_lock, torch.inference_mode():
        tokens = tokenize(state["tokenizer"], texts).to(state["device"])
        vectors = text_vectors(state["model"], tokens).cpu().numpy()
    return {
        "items": [_vector_payload(v, state["dim"]) for v in vectors],
        "dim": state["dim"],
        "model_version": MODEL_VERSION,
    }


@app.post("/embed/image", dependencies=auth)
async def embed_image(file: Annotated[UploadFile, File()]):
    _guard_ready()
    image = await _read_image(file)
    vectors, dim = await run_in_threadpool(_embeddings_for, [image])
    return _vector_payload(vectors[0], dim)


@app.post("/embed/images", dependencies=auth)
async def embed_images(files: Annotated[list[UploadFile], File()]):
    _guard_ready()
    if len(files) > MAX_BATCH:
        raise HTTPException(status_code=413, detail=f"at most {MAX_BATCH} images per call")
    images = [await _read_image(f) for f in files]
    vectors, dim = await run_in_threadpool(_embeddings_for, images)
    return {
        "items": [_vector_payload(v, dim) for v in vectors],
        "dim": dim,
        "model_version": MODEL_VERSION,
    }


@app.post("/embed/item", dependencies=auth)
async def embed_item(body: ItemIn):
    """Item vectors for storage: separate text and image vectors.

    Used at write time so each item has both vectors persisted. Image search
    compares against imageVector, semantic text search against textVector.
    """
    _guard_ready()

    text = " ".join(part for part in (body.title.strip(), body.description.strip()) if part)
    if not text and not body.image_urls:
        raise HTTPException(status_code=400, detail="provide text or at least one image")

    photos: list[Any] = []
    for url in body.image_urls[:10]:
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                response = await client.get(url)
            response.raise_for_status()
            photos.append(open_image(io.BytesIO(response.content)))
        except Exception as exc:  # one bad URL must not sink the item
            log.warning("skipping image %s: %s", url, exc)

    if not text:
        # Photo-only item: give the text vector a neutral value so the column is
        # never empty. Semantic text search skips rows flagged hasPhotos=False
        # anyway, and this row is flagged True.
        text = "an object with no description"

    text_vec, dim = await run_in_threadpool(_text_embedding, text)

    image_vec: list[float] = []
    if photos:
        vectors, dim = await run_in_threadpool(_embeddings_for, photos)
        averaged = vectors.mean(axis=0)
        image_vec = (averaged / (np.linalg.norm(averaged) + 1e-12)).tolist()

    return {
        "textVector": to_response(text_vec, dim)["embedding"],
        "imageVector": [round(float(x), 6) for x in image_vec],
        "dim": dim,
        "hasPhotos": bool(photos),
        "photoCount": len(photos),
        "modelVersion": MODEL_VERSION,
    }


@app.post("/score", dependencies=auth)
def score(body: ScoreIn):
    """Raw cosine scores of one query vector against many candidates."""
    _guard_ready()

    dim = state["dim"]
    if len(body.query) != dim:
        raise HTTPException(status_code=400, detail=f"query must have dim {dim}")
    if any(len(c) != dim for c in body.candidates):
        raise HTTPException(status_code=400, detail=f"every candidate must have dim {dim}")
    scores = score_matrix(body.query, body.candidates)
    return {"scores": [round(float(s), 6) for s in scores]}


@app.post("/search/text", dependencies=auth)
def search_text(body: SearchTextIn):
    """Text -> images. The query text is compared directly against item vectors."""
    _guard_ready()

    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text must contain characters")
    matrix = _candidate_matrix(body.candidates)
    vector, _ = _text_embedding(text)
    scores = score_matrix(vector, matrix)
    return {
        "results": _ranked(body.candidates, scores, body.k),
        "model_version": MODEL_VERSION,
        "dim": state["dim"],
        "scanned": int(matrix.shape[0]),
    }


@app.post("/search/image", dependencies=auth)
async def search_image(
    file: Annotated[UploadFile, File()],
    candidates: Annotated[str, Form()],
    k: Annotated[int, Form()] = 10,
):
    """Image -> images. Multipart, because candidates travel as a JSON string."""
    _guard_ready()
    try:
        parsed = [Candidate(**c) for c in json.loads(candidates)]
    except (json.JSONDecodeError, TypeError, ValueError):
        raise HTTPException(status_code=400, detail="candidates must be a JSON array of {id, embedding}")
    matrix = _candidate_matrix(parsed)

    image = await _read_image(file)
    vectors, _ = await run_in_threadpool(_embeddings_for, [image])
    scores = score_matrix(vectors[0], matrix)
    return {
        "results": _ranked(parsed, scores, max(1, min(int(k), 100))),
        "model_version": MODEL_VERSION,
        "dim": state["dim"],
        "scanned": int(matrix.shape[0]),
    }
