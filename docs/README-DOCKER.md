# Running the Reclaim backend

Two ways to run it. **Docker is recommended** because it removes the Python and
Postgres install steps. Native works too if Docker gives you trouble.

You need these ports free: `3445` (API), `8000` (AI service), `5432` (database).

---

## Option A — Docker (recommended)

From the **repository root** (the folder containing `docker-compose.yml`):

```bash
docker compose up --build
```

That starts three containers and applies database migrations automatically:

| Service | URL | What it is |
|---|---|---|
| `api` | http://localhost:3445 | The REST API you call from the frontend |
| `embedding` | http://localhost:8000 | CLIP AI service (internal; you don't call it) |
| `postgres` | localhost:5432 | Database |

Check it works:

```bash
curl http://localhost:3445/
# {"name":"Reclaim Lost & Found API","status":"ok"}
```

Load sample data (users, items, claims):

```bash
docker compose exec api npx prisma db seed
```

Seeded admin login: `admin@reclaim.test` / `password123`

Stop everything:

```bash
docker compose down          # keeps data
docker compose down -v       # deletes the database and uploads
```

### The model folder

The CLIP model is **~600 MB and is not in git**, so it is not baked into the
image. It is mounted read-only from `server/model/`.

Ask the backend team for the model folder and place it like this:

```
server/model/
  config.json
  model.safetensors
  preprocessor_config.json
  tokenizer.json
  tokenizer_config.json
  vocab.json
  merges.txt
  special_tokens_map.json
```

**If that folder is empty, everything still works** — the AI container exits and
the API runs with keyword search only. `GET /items?mode=semantic` will return
`"searchMode": "keyword"`. Photo search returns `503`.

Verify AI search is live:

```bash
curl http://localhost:8000/health
# {"status":"ok","model_version":"v1","dim":512,"device":"cpu"}
```

Model load takes 30–90 s on the first start (CPU). The API waits for it.

---

## Option B — Native (no Docker)

Requires Node 18+, Python 3.10+, and a running PostgreSQL.

```bash
# 1. Database
createdb reclaim

# 2. API
cd server
cp .env.example .env        # then set DATABASE_URL and SESSION_SECRET
npm install
npx prisma migrate deploy
npm run dev                 # API on :3445
```

```bash
# 3. AI service (optional, only for semantic / photo search)
cd server/embedding-service
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
cp .env.example .env
./run.sh                    # or run.bat on Windows; serves :8000
```

The AI service finds the model automatically at `server/model`. To use a
different folder, set `MODEL_DIR` in `server/embedding-service/.env`.

Point the API at it in `server/.env`:

```
EMBEDDING_URL="http://127.0.0.1:8000"
```

Then restart the API. You should see:

```
Embedding service ready at http://127.0.0.1:8000 (model v1, dim 512, cpu)
```

---

## Troubleshooting

**`docker compose up` fails on the `embedding` service**
You probably have no model at `server/model`. That is expected if you don't need
AI search. The API still starts; check `docker compose ps` to confirm `api` is up.
To run without the AI container at all, comment out the `embedding` service and
the `EMBEDDING_URL` line under `api` in `docker-compose.yml`.

**`503 SEARCH_UNAVAILABLE` from photo search**
The AI container isn't healthy yet, or exited. Run
`docker compose logs embedding` and check for a missing model folder.

**Semantic search returns `searchMode: "keyword"`**
Same cause: the AI service is unreachable, so the API fell back. This is by
design and is not an error — results are still returned.

**Port already in use**
Something else is on 3445/8000/5432. Stop it, or change the host side of the
mapping in `docker-compose.yml` (e.g. `"3446:3445"`).

**`prisma migrate deploy` fails on first boot**
Postgres wasn't ready yet. The compose setup waits for a healthcheck, so this
usually means a stale volume from an older schema:
`docker compose down -v && docker compose up --build`.

**Photo search finds nothing**
Only items that have at least one uploaded photo can match. Items created before
the AI was enabled need indexing — an admin can run
`POST /items/reindex`, or it happens automatically as searches are made.

---

## Notes for the frontend team

- **You only talk to `http://localhost:3445`.** Never call port 8000 from the
  browser: it needs an API key and is not CORS-enabled for public use.
- CORS allows `localhost` and `127.0.0.1` on any port over http/https.
- Every `GET /items` response includes `searchMode` (`keyword` | `semantic`) so
  the UI can label results.
- The full endpoint contract is in `API_DOCUMENTATION.txt` (v2.0).
- Semantic and photo search take ~0.3–1.5 s on CPU. Show a loading state.
