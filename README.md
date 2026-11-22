# Reclaim — Lost & Found Platform

Report found items, search for what you lost (by text **or by photo**), claim
with proof of ownership, and hand items back.

Three parts:

| Folder | What it is | Port |
|---|---|---|
| `client/` | React + Vite + Tailwind frontend | 5173 |
| `server/` | Express + Prisma + PostgreSQL REST API | 3445 |
| `server/embedding-service/` | Python (FastAPI) CLIP service for AI search | 8000 |

The frontend only ever talks to the Express API. The AI service is called by
Express, never by the browser.

---

## Quick start (Docker — recommended)

From this folder:

```bash
docker compose up --build
```

Starts Postgres, the API (migrations run automatically) and the AI service.

```bash
docker compose exec api npx prisma db seed   # sample users, items, claims
```

API → http://localhost:3445 · seeded admin `admin@reclaim.test` / `password123`

Then the frontend:

```bash
cd client && npm install && npm run dev      # http://localhost:5173
```

**AI search needs the model.** It's ~600 MB and git-ignored, so it isn't in the
image — place it at `server/model/` (ask a maintainer). Without it everything
still runs in keyword mode; see [AI search](#ai-search) below.

---

## Quick start (native, no Docker)

Requires Node 18+, Python 3.10+, PostgreSQL 14+.

```bash
# 1. API
cd server
cp .env.example .env          # set DATABASE_URL + JWT_SECRET
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev                   # :3445

# 2. AI service (optional)
cd embedding-service
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
./run.sh                      # or run.bat on Windows; :8000

# 3. Frontend
cd ../../client
npm install && npm run dev    # :5173
```

The AI service finds the model automatically at `server/model`. To point it
elsewhere, set `MODEL_DIR` in `server/embedding-service/.env`.

---

## AI search

Two features, both additive — every other endpoint behaves as before.

| Feature | Request |
|---|---|
| Semantic text search | `GET /items?q=purse&mode=semantic` |
| Search by photo | `POST /items/search-image` (multipart, field `image`) |

Semantic search matches meaning, not literal text: `purse` finds *"black leather
wallet"*, where keyword search returns nothing. Photo search compares an uploaded
image against item photos.

**How it works:** a fine-tuned CLIP model turns text and images into 512-dim
vectors. Each item stores two — `textVector` and `imageVector` — because CLIP
scores text-vs-text (~0.57) and text-vs-photo (~0.41) on different scales, so a
single blended vector let wordy photo-less items outrank real photo matches.

**Reliability:**

- Indexing is always background work — creating an item never waits for the model.
- `GET /items?mode=semantic` **never** fails because of AI: it falls back to
  keyword and returns 200 with `"searchMode": "keyword"`.
- `POST /items/search-image` returns `503 SEARCH_UNAVAILABLE` when AI is down
  (there's no keyword equivalent of "find by photo").
- Unindexed items self-heal: searches queue missing vectors in the background.
  Admins can force it with `POST /items/reindex`.

---

## Project layout

```
.
├── docker-compose.yml          Postgres + API + AI service
├── client/                     React + Vite + Tailwind
│   └── src/components/reclaim/
├── server/
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma       User, Category, Item, ItemImage, Claim, ItemEmbedding
│   │   ├── migrations/
│   │   └── seed.js
│   ├── src/
│   │   ├── routes/             auth, categories, items, images, claims
│   │   ├── lib/
│   │   │   ├── embedding.js        HTTP client for the AI service
│   │   │   ├── embeddingIndex.js   vector storage + ranking + self-healing
│   │   │   └── category.js
│   │   ├── middleware/         auth, validation, uploads, error handling
│   │   └── schemas/            zod validation
│   ├── model/                  CLIP checkpoint — git-ignored, ~600 MB
│   └── embedding-service/      FastAPI + CLIP (see its own README)
└── shared/constants.js
```

---

## Scripts

`server/`:

| Command | Does |
|---|---|
| `npm run dev` | API with nodemon |
| `npm start` | API, production mode |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Sample data |
| `npm run db:studio` | Prisma Studio |

`client/`: `npm run dev` · `npm run build` · `npm run lint`

`embedding-service/`: `./run.sh` or `run.bat`. Needs `pip install -r requirements.txt` first.

---

## Configuration

`server/.env`:

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/reclaim?schema=public"
JWT_SECRET="change-me-to-a-long-random-string"
PORT=3445

# Leave EMBEDDING_URL empty to disable AI search entirely.
EMBEDDING_URL="http://127.0.0.1:8000"
EMBEDDING_API_KEY=""          # must match the AI service's value
EMBEDDING_TIMEOUT_MS=15000
# SEARCH_CANDIDATE_CAP=2000   # ranking is in-memory; raise only with pgvector
# SEARCH_RELATIVE_MARGIN=0.05 # trim results to within this of the best score
```

`server/embedding-service/.env`: `MODEL_DIR`, `MODEL_VERSION`, `EMBEDDING_API_KEY`, limits.

The model path is never hardcoded — it resolves from `MODEL_DIR`, defaulting to
`server/model`.

---

## Known gaps

Honest list, so nobody builds against something that isn't there. Also in
`docs/API_DOCUMENTATION.txt` (v2.0) and the requirements doc (§15).

**Endpoints the requirements doc specifies but that don't exist yet:**

- `GET /me/summary` — dashboard cards + notification bell
- `GET /claims/received` — claims inbox
- `PATCH /auth/me`, `PATCH /auth/password` — profile / password edit

**`GET /items` query gaps:** no cursor pagination (offset `page`/`limit` only),
no `sort`, no `where`, no `from`/`to` date range, single category only, and `q`
is matched as one substring rather than word-by-word.

**Other:**

- No automated tests — verification has been manual.
- Frontend is still a static shell with no API integration.
- Ranking caps at `SEARCH_CANDIDATE_CAP` (2000) items per request; pgvector is
  the next step beyond that.
- CPU inference is ~0.3–1.5 s per embedding; a GPU is advisable for production.

---

## Docs

All in `docs/`:

- `docs/API_DOCUMENTATION.txt` — full REST contract incl. AI search and fallback rules
- `docs/Reclaim Lost & Found Platform - Project Requirements.docx` — product spec
- `docs/README-DOCKER.md` — Docker setup and troubleshooting
- `server/embedding-service/README.md` — AI service endpoints and internals
