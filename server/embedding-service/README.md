# Reclaim embedding microservice

Stateless FastAPI service that turns text and images into **512-d CLIP vectors**
and ranks items by cosine similarity. It uses the local checkpoint in
`server/model/` and never touches your database — Express owns persistence.

## What it unlocks

The old search was `LIKE '%q%'` on title/description. This gives you three
things that keyword search cannot do:

| Capability | How |
|---|---|
| **Text → image** search | `POST /search/text` compares query text against item vectors |
| **Image → image** search | `POST /search/image` compares an uploaded photo against item vectors |
| **Semantic text search** | `POST /embed/text` + `/score`: "purse" matches "black leather wallet" |

CLIP is contrastively trained, so text and image vectors share one space. That
is what makes text→image and image→image possible with a single model.

## Quick start

```bash
cd server/embedding-service
./setup.sh                # creates .venv + installs requirements + torch
./run.sh                  # starts uvicorn on 127.0.0.1:8000
```

`./setup.sh` needs Python 3.10+ (macOS system `python3` may be 3.9 — install
`brew install python@3.11`). `run.sh` prefers `.venv`, so no activation is
needed. `run.bat` is the Windows equivalent (install the deps with pip first).

Model loading takes a few seconds. `/health` returns `{"status":"loading"}`
until ready, then `{"status":"ok", ...}`.

**The Express API only uses the service when `EMBEDDING_URL` is set** in
`server/.env` (e.g. `EMBEDDING_URL="http://127.0.0.1:8000"`). Restart `npm run
dev`, then backfill existing items once via `POST /items/reindex` as an admin
(or just search — missing vectors are queued in the background).

**`MODEL_DIR` is never hardcoded.** If unset it resolves to `server/model`
via `settings.py`, which is why the model folder needs no path in any config.

## Endpoints

All require `X-API-Key: <EMBEDDING_API_KEY>` when that variable is set.
`/health` is always open.

| Route | Body | Returns |
|---|---|---|
| `GET /health` | — | `{status, model_version, dim, device}` |
| `POST /embed/text` | `{"text"}` | `{embedding[512], dim, model_version}` |
| `POST /embed/texts` | `{"texts": [...]}` | `{items[], dim, model_version}` |
| `POST /embed/image` | multipart `file` | `{embedding[512], ...}` |
| `POST /embed/images` | multipart `files` (repeated) | `{items[], ...}` |
| `POST /embed/item` | `{title, description, image_urls[]}` | `{textVector, imageVector, hasPhotos}` |
| `POST /score` | `{query[], candidates[][]}` | `{scores[]}` |
| `POST /search/text` | `{text, candidates:[{id,embedding}], k}` | `{results:[{id,score}], scanned}` |
| `POST /search/image` | multipart `file` + form `candidates` (JSON string) + `k` | `{results, scanned}` |

Vectors are L2-normalized, so cosine similarity is a dot product. `/search/*`
returns only positive scores — with normalized CLIP vectors anything `<= 0` is
unrelated, so returning it would just pad results with noise.

### `/embed/item` returns two vectors, not one

`textVector` is the CLIP encoding of title + description. `imageVector` is the
mean of the photo encodings (empty when an item has no photos).

They are kept **separate on purpose.** CLIP scores text-vs-text and
text-vs-photo on different scales: a text query typically scores ~0.57 against
another text vector but only ~0.41 against a genuinely matching photo. A single
fused vector therefore lets wordy text-only items outrank real photo matches.
Storing both means each query type compares like with like.

### Why results are trimmed relatively

Score distributions for this checkpoint are high and tightly clustered —
unrelated pairs still score ~0.35–0.58. A fixed absolute threshold is useless
(it either keeps everything or nothing), so Express keeps only results within
`SEARCH_RELATIVE_MARGIN` (default `0.05`) of the top hit.

## Express integration

`EMBEDDING_URL` / `EMBEDDING_API_KEY` in `server/.env`. Client:
`server/src/lib/embedding.js`.

## Notes and limits

- **One forward pass at a time** (`infer_lock`). On CPU that caps throughput but
  keeps memory flat; tune with more workers only on GPU.
- `MAX_TEXT_CHARS` is 1000, but CLIP truncates at **77 tokens**. Long
  descriptions are silently shortened — keep the searchable part early.
- Candidate caps: `MAX_CANDIDATES` (2000) per search call. Beyond that, move to
  `pgvector` and rank in SQL.
- Vectors are only comparable within the same `model_version`. Re-embed stored
  items after retraining the checkpoint.
- `/embed/item` fetches `image_urls` over HTTP, so the service must be able to
  reach them (e.g. your Express `/uploads` host).
- CPU-only installs print a `torchvision` fallback warning from
  `CLIPImageProcessor`. Harmless; install `torchvision` to silence it.
