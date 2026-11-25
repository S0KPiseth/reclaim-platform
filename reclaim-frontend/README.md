# Reclaim frontend

Static, build-free frontend (HTML + CSS + ES modules) for the Reclaim Lost & Found API (`server/`).

## Run
1. Start the API (default `http://localhost:3445`) and seed it (`npm run db:seed`).
2. Serve this folder (any static server, ES modules need http, not file://):
   `npx serve -l 5173 .`  or  `python3 -m http.server 5173`
3. Open http://localhost:5173. Seed login: `sothy@reclaim.test` / `password123`.

If the API is elsewhere, edit `js/config.js` AND the `connect-src` / `img-src` hosts in the CSP `<meta>` in `index.html`.
The API's CORS allows localhost and 127.0.0.1 on any port only.

## Screens
Browse + search + category/status filters, item detail, claim form, post/edit (photo preview),
my posts (edit/remove with confirm), my claims (withdraw), log in, sign up, empty/error/404 states, toasts.

## Security choices
- Every dynamic value goes through `esc()` before it touches `innerHTML`; no inline scripts or styles.
- Strict Content-Security-Policy (scripts only from self, no inline, API-only connections).
- JWT kept in `sessionStorage` (cleared on tab close), sent as a Bearer header, never in URLs; `credentials: "omit"`.
- Image URLs are only accepted if they match `/uploads/<safe-name>`.
- Post-login redirects only accept internal `#/` paths (no open redirect).
- Hiding buttons is cosmetic: the API enforces ownership and validation. The UI also pre-checks the same rules for fast feedback.
- Photo: one JPEG/PNG, max 2 MB (assignment rules). The API itself still allows up to 5 images, WebP and 5 MB: change `maxImageBytes`/mime list in the backend if you need the limit enforced server-side.

## Notes
- "Remove post" archives the post (the backend soft-deletes).
- Smart search needs the CLIP service; otherwise the UI shows keyword results with a notice.
