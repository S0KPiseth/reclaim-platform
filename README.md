# Reclaim — Campus Lost-and-Found Board

**INFO653 Final Project — Database-Driven Website**

Reclaim is a small database-driven website for a campus lost-and-found board. Visitors can browse and search found items. After registering and logging in, a user can post a found item, edit or delete their own posts, upload one photo, and mark an item as returned. Other logged-in users can only view and claim items — they cannot change someone else's post.

> **Team name:** `Team06` 
> **Submission ZIP:** `INFO653_TeamNN_FinalProject.zip`

---

## Team members and contributions

| Member | Area | Contributions |
|---|---|---|
| **Sok Piseth** | Backend and database system design | Express application and route structure, Prisma schema and migrations, PostgreSQL setup, seed data, session-based authentication (bcrypt + express-session), server-side validation, ownership checks, image upload handling with multer, error handling, search/filter APIs, AI embedding-service integration, Docker configuration. |
| **Hieng Dara** | Frontend, UI tests, integration | All React pages and components, routing, styling and responsive layout, forms and validation feedback, connecting every screen to the Express API (session cookies, uploads, error states), and the browser/UI test cases and manual test evidence. |
| **Chhin Sopanha** | Frontend, UI tests, integration | All React pages and components, routing, styling and responsive layout, forms and validation feedback, connecting every screen to the Express API (session cookies, uploads, error states), and the browser/UI test cases and manual test evidence. |

**Contribution statement:** Sok Piseth designed and implemented the backend and database, including the three-table core model, migrations, seed data, authentication, validation, ownership enforcement and uploads. Hieng Dara and Chhin Sopanha built the entire frontend, wrote and executed the UI test cases, and connected the client to the backend for every workflow (auth, browse/search, post, edit, delete, claims and admin tools).

---

## 1. Project topic and scope

**Topic:** Campus Lost-and-Found Board (one of the approved topics).

**Main resource:** a found-item post. Each post has a title, description, category, found location, found date, a topic-specific status (`OPEN`, `CLAIMED`, `RETURNED`, `ARCHIVED`) and at most one optional photo.

**Required user journey (implemented end to end):**

| Visitor / user | What they can do |
|---|---|
| Visitor (not logged in) | Browse the board, search by keyword, filter by category/status, open an item's detail page, register. |
| Logged-in user | Everything above, plus create a post, edit or delete **their own** post, change its status, upload/remove **their own** post's photo, send a claim on someone else's item, and log out. |
| Second logged-in user | Can browse and view another user's post, but every update/delete request is rejected by the server (`403 FORBIDDEN`) even when the UI buttons are bypassed. |

The required scope is complete. Claim approval, photo search and admin tools are additional features beyond the brief (see [Optional extensions](#13-optional-extensions)) and do not replace the required features.

---

## 2. Demo accounts

All seeded accounts use the same password:

```text
Password for every demo account:  password123
```

| Email | Role | Name |
|---|---|---|
| `sothy@reclaim.test` | USER | Sothy Chan |
| `dada@reclaim.test` | USER | Dada Kim |
| `admin@reclaim.test` | ADMIN | Admin User |

Passwords are **never stored in plain text** — `prisma/seed.js` hashes them with bcrypt (cost 10). To create a demo account, either register through `/register` in the browser, or run the seed command below. The seed also creates **8 categories, 10 fictional sample records and 2 sample claims**.

---

## 3. Setup and run instructions

### Prerequisites

- Node.js 18+ (tested with Node 24)
- PostgreSQL 14+ (tested with PostgreSQL 15)
- Python 3.10+ **only** if you want AI semantic/photo search
- npm

### Option A — native (recommended for marking)

```bash
# 1. Create the database (adjust the name if you like)
createdb reclaim

# 2. API
cd server
cp .env.example .env
#    Edit .env: set DATABASE_URL and SESSION_SECRET
npm install
npx prisma generate
npx prisma migrate deploy      # creates all tables
npm run db:seed                # demo users, categories, 10 items, 2 claims
npm run dev                    # http://localhost:3445

# 3. Frontend (second terminal)
cd ../client
npm install
npm run dev                    # http://localhost:5173
```

Open **http://localhost:5173** and log in with `sothy@reclaim.test` / `password123`.

The Vite dev server serves every deep link (for example `/items/<id>`) correctly.

### Option B — Docker (API + PostgreSQL + AI service)

```bash
# From the repository root
docker compose up --build

# In another terminal, load the sample data
docker compose exec api npx prisma db seed
```

API → `http://localhost:3445` · frontend still runs from `client/` with `npm run dev`.

> The AI container needs the CLIP checkpoint in `server/model/` (about 600 MB, git-ignored). Without it, leave the AI service out and use keyword search.

### Environment configuration

`server/.env` (copy from `server/.env.example`; never commit the real file):

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/reclaim?schema=public"
SESSION_SECRET="a-long-random-string"
COOKIE_SECURE=false          # true only when served over HTTPS
PORT=3445

# Optional AI search — leave EMBEDDING_URL empty to disable it
EMBEDDING_URL="http://127.0.0.1:8000"
EMBEDDING_API_KEY=""
EMBEDDING_TIMEOUT_MS=15000
# PUBLIC_BASE_URL="http://localhost:3445"
# SEARCH_CANDIDATE_CAP=2000
# SEARCH_RELATIVE_MARGIN=0.05
```

`client/.env` is optional; the default API URL is the host serving the page on port `3445`:

```bash
VITE_API_URL=http://localhost:3445
```

### Optional — AI semantic and photo search

The core requirements do **not** need this. Everything works with plain keyword search and category filters.

```bash
cd server/embedding-service
./setup.sh          # creates .venv, installs requirements + torch (once)
./run.sh            # FastAPI + CLIP on 127.0.0.1:8000
```

Then set `EMBEDDING_URL="http://127.0.0.1:8000"` in `server/.env` and restart the API. Existing items can be indexed with the admin button on `/profile` or `POST /items/reindex` while logged in as `admin@reclaim.test`.

---

## 4. Required features checklist

| INFO653 requirement | Status | Where / how |
|---|---|---|
| Registration, login, logout with unique email and hashed passwords | ✅ | `server/src/routes/auth.js`; bcrypt; `express-session` cookie `reclaim.sid`; `POST /auth/register`, `/auth/login`, `/auth/logout` |
| Browse records and view details | ✅ | `GET /items`, `GET /items/:id`; `/browse`, `/items/:id` |
| Create a record with title, description, category and topic status | ✅ | `POST /items`; `/report`; status starts as `OPEN`, changes to `CLAIMED/RETURNED/ARCHIVED` |
| Update and delete only the owner's record, with delete confirmation | ✅ | `PATCH /items/:id`, `DELETE /items/:id`; server-side ownership check; confirmation dialog in the UI |
| One image per record (JPEG/PNG, 2 MB) with a placeholder when absent | ✅ | multer + server-generated filenames; `server/src/middleware/upload.js`; placeholder in `ItemCard`/`ItemPage` |
| Search or filter | ✅ | Keyword search `GET /items?q=…`, category filter `?category=…`, status filter `?status=…` |
| Clear feedback (success, validation errors, empty results, missing record) | ✅ | Toasts, inline form errors, empty states, 404 detail page |
| Node.js + Express with separate auth and resource route files | ✅ | `server/src/routes/auth.js`, `items.js`, `categories.js`, `images.js`, `claims.js` |
| Three related tables with foreign keys | ✅ | `users`, `categories`, `items` (owner + category FKs), plus supporting tables |
| At least 3 categories and 10 sample records | ✅ | Seed creates 8 categories and 10 items |
| Demo account instructions, no plaintext passwords | ✅ | See [Demo accounts](#2-demo-accounts); bcrypt hashes only |
| Parameterized SQL | ✅ | Prisma Client parameterizes all queries; no string-concatenated SQL |
| Server validation of fields, IDs, status values, categories | ✅ | zod schemas in `server/src/schemas/index.js`; category normalization in `server/src/lib/category.js` |
| Session-based login | ✅ | `express-session`, HttpOnly `SameSite=Lax` cookie, 7-day expiry |
| Server-side ownership checks on update/delete | ✅ | `assertOwnerOrAdmin()` in `items.js`; verified with direct HTTP requests by a second user |
| multer uploads with type/size checks and safe filenames | ✅ | JPEG/PNG only, 2 MB, generated filenames, files served from `/uploads` |
| Errors without secrets or stack traces | ✅ | Central error handler in `server/src/middleware/error.js` |
| Credentials in environment variables + example config | ✅ | `.env` (ignored) and `.env.example` |
| Browser UI for the whole journey | ✅ | React + Fetch against the Express API; every action connects to saved data (PostgreSQL here — see limitations) |

> **Database engine note:** the brief specifies MySQL. This project uses **PostgreSQL** with Prisma; the data model and behaviour match the three-table requirement, but this is a documented deviation. See [Known limitations](#12-known-limitations-and-deviations-from-the-brief).

---

## 5. Required screens (UI)

| Screen | Route | INFO653 requirement |
|---|---|---|
| Home / landing | `/` | Entry point with search and category shortcuts |
| Browse + search + filters | `/browse` | Browse/search records |
| Record details | `/items/:id` | Detail view, gallery, claim form, owner actions |
| Register | `/register` | Registration |
| Login | `/login` | Login |
| Report a find (create) | `/report` | Create record form |
| Edit post | `/items/:id/edit` | Same form reused for editing |
| My posts | `/my-items` | My records with edit/delete actions |
| My claims | `/my-claims` | Claims sent / claim requests on my posts (additional feature) |
| Profile | `/profile` | Account details, logout, admin tools |
| How it works | `/how-it-works` | Static help page |
| Not found | any other route | Helpful missing-page response |

The UI uses labelled fields, visible navigation, disabled/busy states, success toasts, inline validation messages, empty states and a confirmation dialog for destructive actions. It is usable at a normal laptop width (tested at 1280×900) without overlapping controls.

---

## 6. Technical stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express 5 |
| Database | PostgreSQL 15 + Prisma 7 (migrations and seed) |
| Auth | bcryptjs + express-session (HttpOnly cookie) |
| Validation | zod |
| Uploads | multer (disk storage, generated filenames) |
| Frontend | React 19, Vite, Tailwind CSS 4, Fetch API |
| Optional AI | Python 3.10+, FastAPI, CLIP (transformers + torch) |
| Deployment | Docker Compose (PostgreSQL + API + optional AI service) |

---

## 7. Database design

### Core three-table structure (as required)

```text
users                          categories
------                         ----------
id (PK)                        id (PK)
email (UNIQUE)                 name (UNIQUE)
passwordHash                   slug (UNIQUE)
name                           createdAt
phone
role (USER/ADMIN)
createdAt / updatedAt
      │                              │
      │ 1                            │ 1
      │                              │
      └──────────────┬───────────────┘
                     │ *
                   items
                   -----
                   id (PK)
                   title
                   description
                   status (OPEN/CLAIMED/RETURNED/ARCHIVED)
                   foundLocation
                   foundAt
                   handoverNote
                   categoryId (FK -> categories.id, ON DELETE RESTRICT)
                   posterId   (FK -> users.id, ON DELETE CASCADE)
                   createdAt / updatedAt
                     │
        ┌────────────┼─────────────┐
        │ *          │ *           │ 1
   item_images     claims     item_embeddings
```

Column names above match the database (Prisma camelCase identifiers).

- `items.category_id` and `items.poster_id` are **foreign keys** (the main table references its owner and its category).
- `item_images`, `claims` and `item_embeddings` are supporting tables added for the photo limit, the claim workflow and optional AI search. They do not replace the required three-table structure.

### Schema and seed scripts

The brief names `schema.sql` and `seed.sql`. This project's equivalents are:

| Brief | This project |
|---|---|
| `schema.sql` | `server/prisma/schema.prisma` + generated SQL DDL in `server/prisma/migrations/*/migration.sql` |
| `seed.sql` | `server/prisma/seed.js` (`npm run db:seed`) |

Recreate everything from scratch with:

```bash
cd server
npx prisma migrate reset --force   # destructive: drops, recreates and seeds
# or
npx prisma migrate deploy && npm run db:seed
```

### Validation and data rules

- `email` is unique; duplicate registration returns `409 EMAIL_TAKEN`.
- `password` minimum 8 characters; stored only as a bcrypt hash.
- `title` 3–150 characters, `description` 10–5000 characters, `foundLocation` 1–200, `handoverNote` up to 1000.
- `category` 2–40 characters, normalized to a slug; existing names are reused, new names are created on the fly.
- `status` must be one of `OPEN | CLAIMED | RETURNED | ARCHIVED`; allowed transitions are `OPEN/CLAIMED → RETURNED → ARCHIVED`.
- `foundAt` must be a valid date.
- Image: JPEG or PNG, at most 2 MB, at most one per item.

---

## 8. Project structure

```text
.
├── client/                        React + Vite frontend
│   ├── src/
│   │   ├── components/            layout, UI and landing components
│   │   ├── context/               auth, toast and confirm providers
│   │   ├── lib/                   API client, router, formatting, limits
│   │   └── pages/                 Home, Browse, Item, Report, MyItems,
│   │                              MyClaims, Profile, Login, Register, 404
│   └── .env.example
├── server/                        Express API
│   ├── prisma/
│   │   ├── schema.prisma          three core tables + supporting tables
│   │   ├── migrations/            SQL DDL (schema history)
│   │   └── seed.js                demo users, categories, 10 items, claims
│   ├── src/
│   │   ├── routes/                auth, items, categories, images, claims
│   │   ├── middleware/            auth, validation, upload, error handling
│   │   ├── lib/                   category, embeddings, ranking
│   │   └── schemas/               zod validation schemas
│   ├── embedding-service/         optional FastAPI + CLIP service
│   ├── .env.example
│   └── package.json
├── docs/                          API documentation and Docker notes
└── docker-compose.yml             PostgreSQL + API + optional AI service
```

---

## 9. API and route organisation

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | Create an account and start a session |
| POST | `/auth/login` | public | Log in |
| POST | `/auth/logout` | public | Destroy the session |
| GET | `/auth/me` | session | Current user |
| GET | `/items` | optional | Browse, keyword search, category/status filter, pagination |
| GET | `/items/:id` | optional | Item details |
| GET | `/items/mine` | session | The current user's posts |
| POST | `/items` | session | Create a post (multipart, optional image) |
| PATCH | `/items/:id` | session | Edit own post / change status |
| DELETE | `/items/:id` | session | Archive own post (soft delete) |
| POST | `/items/:id/images` | session | Add the single photo (delete the existing one first to replace it) |
| DELETE | `/images/:id` | session | Remove a photo |
| POST | `/items/:id/claims` | session | Claim another user's item |
| GET | `/items/:id/claims` | session | Poster/admin reads claims |
| PATCH | `/claims/:id` | session | Approve/reject/withdraw a claim |
| GET | `/claims/mine` | session | Claims the current user sent |
| GET | `/categories` | public | List categories |
| POST | `/categories` | session | Create a category |
| DELETE | `/categories/:id` | admin | Delete an unused category |
| POST | `/items/search-image` | optional | Photo search (optional AI feature) |
| POST | `/items/reindex` | admin | Backfill AI vectors (optional) |

Full request/response details are in `docs/API_DOCUMENTATION.txt`.

---

## 10. Security, validation and uploads

- Passwords are hashed with **bcrypt** (cost 10). No plaintext password is ever stored or returned.
- Login uses **server-side sessions** stored in an HttpOnly, `SameSite=Lax` cookie (`reclaim.sid`, 7-day expiry). The frontend never stores a token.
- Every update/delete route re-checks ownership on the server; hiding UI buttons is not used as protection.
- All input is validated with **zod** before it reaches the database (required fields, lengths, IDs, enums, dates).
- Prisma parameterizes every query — no user input is concatenated into SQL.
- Uploads use **multer** with a MIME allow-list (JPEG/PNG), a 2 MB size limit, and server-generated filenames. Rejected files are deleted; uploaded files are served from `/uploads`.
- The central error handler returns a clean `{ "error": { code, message } }` envelope. It never exposes passwords, connection strings or stack traces.
- Secrets live in `server/.env`, which is git-ignored. `server/.env.example` contains placeholders only.
- CORS allows only `localhost` / `127.0.0.1` origins and requires credentials for the session cookie.

---

## 11. Testing

**Environment:** macOS 15.6 · Node 24.11.1 · PostgreSQL 15.17 · Google Chrome 158 · tested on 26 November 2026.

Tests were executed against the running application: API checks over HTTP with an isolated cookie jar, and browser checks in Chrome at 1280×900 covering the required user journey. The table below is the required action / expected / actual / pass-fail evidence. All tests passed; the "Actual result" column records what was observed.

### 11.1 Required testing checklist

| # | Action / input | Expected result | Actual result | Pass/Fail |
|---|---|---|---|---|
| 1 | Register a new user (`POST /auth/register`, and the `/register` form) | Account created, session started | `201 Created`, user returned, browser redirected to home and signed in | **PASS** |
| 2 | Register again with the same email | Duplicate rejected | `409 EMAIL_TAKEN`; UI shows "An account with this email already exists" | **PASS** |
| 3 | Log in with a wrong password | Login rejected | `401 INVALID_CREDENTIALS`; UI shows "Invalid email or password" | **PASS** |
| 4 | Log in with the correct credentials | Login succeeds | `200 OK`, `reclaim.sid` cookie set, `/auth/me` returns the user, UI redirects | **PASS** |
| 5 | Create a record with valid data (`/report`) | Record saved and open | `201 Created`, detail page shows the item and photo state | **PASS** |
| 6 | Create a record with an empty title | Server rejects the request | `422 VALIDATION_ERROR`, "title: Title must be at least 3 characters" | **PASS** |
| 7 | Create a record with an invalid category (`!`) | Server rejects the request | `422 VALIDATION_ERROR`, "category: Category must be at least 2 characters" | **PASS** |
| 8 | Browse the board and search for the new title | Matching records shown | `200 OK`; the record appears in `/browse?q=…` | **PASS** |
| 9 | Filter by category | Only matching records shown | `200 OK`, `total = 1` for the test category; UI filter works | **PASS** |
| 10 | Update your own record (title/description) | Update saved | `200 OK`, detail page shows the edited title | **PASS** |
| 11 | Delete your own record and confirm the dialog | Record archived after confirmation | Confirmation dialog shown; `200 OK`, status `ARCHIVED`; UI returns to My posts where it is listed | **PASS** |
| 12 | Log in as a second user and send `PATCH /items/:id` directly | Request rejected | `403 FORBIDDEN` (no change made) | **PASS** |
| 13 | Second user sends `DELETE /items/:id` directly | Request rejected | `403 FORBIDDEN` (record not deleted) | **PASS** |
| 14 | Upload a valid JPEG/PNG to your own record, then delete it | Image saved, displayed and removable | `201 Created`; photo rendered from `/uploads`; after deleting, the "No photo yet" placeholder returned | **PASS** |
| 15 | Upload an unsupported file (WebP) | Rejected | `400 UNSUPPORTED_FILE_TYPE`; UI also blocks it before upload | **PASS** |
| 16 | Upload an image larger than 2 MB | Rejected | `400 FILE_TOO_LARGE`; UI also blocks it before upload | **PASS** |
| 17 | Log out, then open a protected action/page | Logged out and protected routes require login | `POST /auth/logout` → `200`; `/items/mine` and `POST /items` → `401`; `/report` redirects to `/login?next=…` | **PASS** |
| 18 | Request a record that does not exist | Helpful not-found response | `404 NOT_FOUND`; detail page shows "We can’t find that item" | **PASS** |
| 19 | Restart the API and request a saved record | Records remain in the database | Same record returned `200` before and after the restart | **PASS** |
| 20 | Complete the whole journey in the browser: register → log in → create → browse/search → edit → delete → log out | Every step works and messages are visible | Full flow completed in Chrome with visible success/error feedback, labels and navigation | **PASS** |

### 11.2 Additional checks (beyond the required list)

| # | Action / input | Expected result | Actual result | Pass/Fail |
|---|---|---|---|---|
| 21 | Keyword search when Smart search is off | Keyword results | `200 OK`, `searchMode: keyword`, matching item returned | **PASS** |
| 22 | Semantic text search (`GET /items?q=…&mode=semantic`) with the AI service running | AI-ranked results | `200 OK`, `searchMode: semantic`, results returned | **PASS** |
| 23 | Photo search (`POST /items/search-image`) using an item's own photo | That item is the best match | `200 OK`, `searchMode: image`, the item returned with score `1.0` | **PASS** |
| 24 | Log in as a normal user and delete an unused category | Admin-only action rejected | `403 FORBIDDEN` | **PASS** |
| 25 | Validation of status values (`PATCH` with `status: "NOT_A_STATUS"`) | Rejected | `422 VALIDATION_ERROR`, "status: Invalid option: expected one of OPEN, CLAIMED, RETURNED, ARCHIVED" | **PASS** |
| 26 | Open the browse board where records have no photo | Placeholder is shown instead of a broken image | 5 "No photo yet" placeholders rendered and 0 broken images on the board | **PASS** |

**How to reproduce:** run the seed, start the API and client, then follow the rows above. The API base URL is `http://localhost:3445`; credentials are in [Demo accounts](#2-demo-accounts). Sessions are cookies, so use a browser or a cookie jar when testing with curl.

**Notes:**
- New posts are indexed by the AI service in the background. Photo/semantic search for a post created a second earlier may need a few seconds (or an admin reindex) before it appears.
- The AI service is optional. When it is off, keyword search still works and the API reports `"searchMode": "keyword"`; photo search returns a friendly `503` and the UI explains that photo search is unavailable.

---

## 12. Known limitations and deviations from the brief

1. **Database engine:** the brief specifies **MySQL**; this implementation uses **PostgreSQL** with Prisma. The required three-table relationship (users, categories, items with owner/category foreign keys) is implemented, plus supporting tables for images, claims and AI vectors. There are no standalone `schema.sql` / `seed.sql` files; the SQL schema lives in `server/prisma/migrations/*/migration.sql` and seeding is `server/prisma/seed.js`. The application and all required behaviour run locally as documented.
2. **Frontend:** the brief allows server-rendered templates or HTML/CSS/JS with Fetch. This project uses a React + Vite client with Fetch against the Express API. This is more than required; all flows still use the same Express application and database.
3. **Categories are poster-defined:** users may select an existing category or type a new one. The server validates and normalizes it, then creates it if needed. The brief's stricter rule that a submitted category must already exist is relaxed by design.
4. **Extra scope:** claims (claim → approve/reject/withdraw), admin tools, pagination, semantic search and photo search are beyond the required scope. They do not replace any required feature.
5. **Admins are moderators:** in addition to the owner, an `ADMIN` can edit/delete any record. The required second-user restriction still holds for normal users.
6. **AI search is optional and local:** it needs Python 3.10+, ~600 MB of dependencies/checkpoint, and CPU inference is slow (roughly 0.3–1.5 s per embedding). It is disabled when `EMBEDDING_URL` is empty.
7. **No automated test suite is committed:** testing evidence is the manual/API/browser checklist above; the brief accepts documented manual checks.
8. **Profile editing is read-only:** changing name/email/password is not implemented (not required by the brief).
9. **Runs locally:** no public deployment, payments, chat, email verification, password recovery or maps (all out of scope).

---

## 13. Optional extensions

Implemented as extras after the required core worked:

- Pagination on the browse page (12 items per page).
- Extra filters: status tabs and category chips, plus keyword/semantic search modes.
- A summary of claims per post on the **My posts** screen.
- AI semantic search and photo search (optional service).

---

## 14. Submission checklist

- [ ] Replace `TeamNN` with the registered team number.
- [ ] ZIP name: `INFO653_TeamNN_FinalProject.zip`.
- [ ] Include all source code, `package.json` files, Prisma schema/migrations/seed, and `.env.example`.
- [ ] **Do not include** `node_modules/`, real `.env` files, real credentials, `server/model/` (about 600 MB) or real personal data.
- [ ] Follow this README on a clean machine to confirm the site runs locally.
- [ ] Demo accounts and seed data are loaded (`npm run db:seed`).
- [ ] Prepare the live demonstration (below) and make sure every member can explain their part.

---

## 15. Live demonstration outline (7–10 minutes)

| Time | What to show |
|---|---|
| 0:00–1:00 | Topic, team, stack and the three-table design (users → items ← categories). |
| 1:00–2:00 | Visitor view: browse, search, category filter, open a detail page. |
| 2:00–3:00 | Register a new account, log out, log in with wrong then correct credentials. |
| 3:00–4:30 | Create a post with a photo, show the image and the placeholder state. |
| 4:30–6:00 | Edit the post, change its status, then log in as a second user and show that update/delete is refused. |
| 6:00–7:00 | Delete the post with the confirmation dialog, show My posts and empty states. |
| 7:00–8:30 | Server-side validation and upload checks (bad input, wrong file type, >2 MB), and where each check lives in the code. |
| 8:30–10:00 | Optional AI search and the testing table; each member explains their contribution. |

---

## 16. Documentation

- `docs/API_DOCUMENTATION.txt` — full REST contract, error codes and AI fallback rules.
- `server/embedding-service/README.md` — optional AI service endpoints and internals.
- `docs/README-DOCKER.md` — Docker setup and troubleshooting.
