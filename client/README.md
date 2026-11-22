# Reclaim — Frontend

React 19 + Vite + Tailwind CSS 4.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

The API must be running at **http://localhost:3445** (see the root `README.md`).
CORS already allows `localhost` and `127.0.0.1` on any port.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |

## Layout

```
src/
├── main.jsx
├── App.jsx
├── index.css                  Tailwind entry
├── assets/
└── components/reclaim/        Feature components
    ├── index.js               barrel export
    ├── Navbar.jsx
    ├── HeroHeading.jsx
    ├── SearchPrompt.jsx       search bar + Where? / When? (not wired to API yet)
    ├── FloatingCards.jsx
    ├── ItemCycle.jsx
    ├── items.js               local mock data (LOST_ITEMS)
    └── icons.jsx
```

Dev server runs on Vite's default port 5173.

## Status

The UI is currently a **static shell**. There are no API calls yet — `items.js`
holds local mock data and `SearchPrompt.jsx` doesn't submit anywhere.

## Wiring the API

Everything goes through the Express API at `:3445`. Never call the AI service on
`:8000` from the browser — it needs an API key and isn't CORS-enabled for it.

| UI control | Request |
|---|---|
| Search box | `GET /items?q=<text>&mode=semantic&page=1&limit=12` |
| Search-by-photo button | `POST /items/search-image` (multipart, field `image`) |
| Filters only | `GET /items?category=...&status=...` |

**Handle the fallback.** Every `GET /items` response includes `searchMode`:

- `"semantic"` — AI-ranked results
- `"keyword"` — the AI service was unavailable and the server fell back to plain
  text matching; still HTTP 200, so no error handling is needed

`POST /items/search-image` **can** return `503 SEARCH_UNAVAILABLE` — show a
friendly message rather than a raw error.

Semantic and photo search take ~0.3–1.5 s on CPU. Show a loading state.

Full contract: `API_DOCUMENTATION.txt` at the repo root.

## Known API gaps

These are specified in the requirements but not implemented — don't build against
them: `GET /me/summary`, `GET /claims/received`, `PATCH /auth/me`,
`PATCH /auth/password`, cursor pagination, `sort`, `where`, `from`/`to` date
range, multi-category filter. Use offset pagination (`page`/`limit`).
