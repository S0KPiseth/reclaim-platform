# Reclaim — Frontend

React 19 + Vite + Tailwind CSS 4. The whole app lives in this folder and talks
only to the Express API in `../server` (default `:3445`). It never calls the
Python embedding service on `:8000` — that needs a shared secret and is not
CORS-enabled for browsers.

The visual language is the blue-glass landing design (gradient canvas, frosted
cards, Plus Jakarta Sans, white rounded panels); every screen uses it.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

The API must be running (see the root `README.md`). CORS already allows
`localhost` / `127.0.0.1` on any port.

If the API is elsewhere, copy `.env.example` to `.env` and set `VITE_API_URL`.
The default is the host serving the page on port 3445 (normally
`http://localhost:3445`) — same-site, so the session cookie is sent. Use
`localhost` consistently: a page on `127.0.0.1` calling `localhost` is
cross-site and the `SameSite=Lax` cookie is dropped.

Seed logins (after `cd ../server && npm run db:seed`): `sothy@reclaim.test`,
`dada@reclaim.test`, `admin@reclaim.test` — password `password123`.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |

`vite preview` and the dev server both fall back to `index.html`, so deep links
like `/items/<id>` work. If you host `dist/` on a static server, add an SPA
rewrite to `index.html`.

## Screens

| Route | What it does | API calls |
|---|---|---|
| `/` | Landing: hero, cycling items, search bar, photo search, category/status picks | `GET /categories` |
| `/browse` | Search + category/status filters, pagination, photo search | `GET /items`, `GET /categories`, `POST /items/search-image` |
| `/items/:id` | Detail, gallery, claim form, owner claim inbox, approve/reject, photos, status | `GET /items/:id`, `POST /items/:id/claims`, `GET /items/:id/claims`, `PATCH /claims/:id`, `PATCH /items/:id`, `DELETE /items/:id`, `POST /items/:id/images`, `DELETE /images/:id` |
| `/report` | Report a found item with photos | `GET /categories`, `POST /items` |
| `/items/:id/edit` | Edit a post, replace/remove photos | `GET /items/:id`, `PATCH /items/:id`, `POST /items/:id/images`, `DELETE /images/:id` |
| `/my-items` | Your posts, claim counts, edit/remove | `GET /items/mine`, `DELETE /items/:id` |
| `/my-claims` | Claims you sent; withdraw | `GET /claims/mine`, `PATCH /claims/:id` |
| `/my-claims?tab=received` | Claim requests on your finds; approve/reject | `GET /items/mine`, `GET /items/:id/claims`, `PATCH /claims/:id` |
| `/login`, `/register` | Sign in / create an account | `POST /auth/login`, `POST /auth/register` |
| `/profile` | Account details, links, log out; admins also get AI reindex + category management | `GET /auth/me`, `POST /auth/logout`, `POST /items/reindex`, `GET/POST /categories`, `DELETE /categories/:id` |
| `/how-it-works` | Static explainer | — |
| `*` | 404 state | — |

Protected routes (`/report`, `/my-items`, `/my-claims`, `/profile`,
`/items/:id/edit`) redirect to `/login?next=…` and return afterwards.

## Layout

```
src/
├── main.jsx
├── App.jsx                    providers + route table
├── index.css                  Tailwind v4 theme + component classes
├── lib/
│   ├── api.js                 fetch wrapper (cookie session), error envelope
│   ├── limits.js              upload limits mirrored from the server
│   ├── router.jsx             tiny history router (Link, navigate, hooks)
│   ├── format.js              dates, labels, initials, safe redirects
│   ├── photoSearch.js         hands a File from home to /browse
│   └── usePageTitle.js
├── context/
│   ├── AuthContext.jsx        login/register/logout, /auth/me bootstrap
│   ├── ToastContext.jsx       toast stack
│   └── ConfirmContext.jsx     promise-based confirm dialog
├── components/
│   ├── reclaim/               landing design + shared icons
│   ├── layout/                AppShell, Navbar, Footer, RequireAuth
│   └── ui/                    ItemCard, StatusBadge, Pagination, states…
└── pages/                     Home, Browse, Item, Report, MyItems,
                               MyClaims, Profile, Auth, HowItWorks, 404
```

## Behaviour worth knowing

- **Semantic search** is the default for the main search box
  (`mode=semantic`). Every `GET /items` response carries `searchMode`; when the
  AI service is down the API falls back to keyword and still returns 200. The
  browse page labels that case (“Smart search is offline, so these are keyword
  matches.”) instead of failing.
- **Photo search** goes to `POST /items/search-image`. It can return
  `503 SEARCH_UNAVAILABLE`; the UI shows a friendly message and offers text
  search. Uploaded search photos are never stored — the API encodes them in
  memory. A selected photo is kept in memory between routes so Back returns to
  the same results; a reload clears it (a `File` cannot live in a URL).
- **Auth** is a server-side session. `POST /auth/login` / `/auth/register` set
  an httpOnly `reclaim.sid` cookie; every request uses
  `credentials: "include"`, so no token is ever stored in JavaScript. A cached
  copy of the public user is kept in `localStorage` (`reclaim.user`) for instant
  paint and revalidated with `GET /auth/me` on each load. Any `401` clears the
  cache, bounces protected screens to login, and `POST /auth/logout` expires the
  cookie.
- **Uploads** accept JPG/PNG up to 2 MB, **1 per item**, matching
  `server/src/config.js` and mirrored in `src/lib/limits.js`. Images are
  rendered only from `/uploads/<safe-name>` resolved against `VITE_API_URL`.
- **Claim rules** are enforced by the API; the UI mirrors them (owner cannot
  claim their own item, only `PENDING` claims can change, only `OPEN` items can
  be approved, archived items are hidden from the board).
- **Status changes** use the allowed transitions: `OPEN/CLAIMED → RETURNED`,
  then `→ ARCHIVED`; “Remove post” is the soft-delete (archive).

## API gaps handled by the UI

- `GET /claims/received` does not exist, so the “Requests on my finds” tab fans
  out over `GET /items/mine` + `GET /items/:id/claims` (fine for normal volumes).
- `PATCH /auth/me` / `PATCH /auth/password` do not exist, so the profile screen
  is read-only and says so.
- No notification endpoint: the header bell opens your claims inbox.
- No cursor pagination, `sort`, `where`, or date-range params: the browse screen
  uses offset `page`/`limit` and single-category/status filters.

Full REST contract: `../docs/API_DOCUMENTATION.txt`.
