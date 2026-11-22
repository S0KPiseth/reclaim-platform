"""Generates the updated Reclaim project requirements .docx.

Kept as a script (not hand-edited XML) so the document can be regenerated when
the backend changes. Run from the folder containing the output file.

Sections 1-14 preserve the original v1.0 scope. Section 13 (AI phase) is
rewritten from "not built now" to "built", section 15 is a new implementation
status / gap list, and section 16 is the frontend integration brief.
"""

from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

OUT = "Reclaim Lost & Found Platform - Project Requirements.docx"


def add_heading(doc, text, level):
    h = doc.add_heading(text, level=level)
    return h


def add_para(doc, text, bold=False, italic=False):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    return p


def add_bullets(doc, items):
    for item in items:
        doc.add_paragraph(item, style="List Bullet")


def add_numbers(doc, items):
    for item in items:
        doc.add_paragraph(item, style="List Number")


def add_table(doc, headers, rows):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Light Grid Accent 1"
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = h
        for p in cell.paragraphs:
            for r in p.runs:
                r.bold = True
    for row in rows:
        cells = table.add_row().cells
        for i, value in enumerate(row):
            cells[i].text = str(value)
    return table


doc = Document()

# Base font
style = doc.styles["Normal"]
style.font.name = "Calibri"
style.font.size = Pt(10.5)

# ---------------------------------------------------------------- title block
title = doc.add_heading("Reclaim: Lost & Found Platform - Project Requirements", level=0)
add_para(
    doc,
    "Version 2.0 - 22 November 2026 - Scope: CRUD web platform and REST API, "
    "including the AI search phase",
    italic=True,
)

# ------------------------------------------------------------------ 1 overview
add_heading(doc, "1. Overview", 1)
add_para(
    doc,
    "Reclaim is a lost-and-found website. People who find an item report it with "
    "photos and a short description. People who lost something browse and search "
    "the found items, then submit a claim with proof of ownership. The finder "
    "reviews claims and hands the item back to the right person.",
)
add_para(doc, "Goals:", bold=True)
add_bullets(
    doc,
    [
        "A working CRUD platform: report, browse, search, claim, manage.",
        "Search that understands meaning, not just exact words, and can also "
        "search by photo. (Built in v2.0 - see section 13.)",
        "A profile dashboard where every user manages what they posted and what "
        "they claimed.",
        "A clean separation between the web app, the REST API, and the AI "
        "embedding service, so each can be developed and deployed on its own.",
    ],
)

# --------------------------------------------------------------------- 2 scope
add_heading(doc, "2. Scope", 1)
add_para(doc, "In scope:", bold=True)
add_bullets(
    doc,
    [
        "Accounts: register, log in, edit profile.",
        "Report a found item with up to 5 photos and a category the poster picks "
        "from existing ones or creates on the spot.",
        "Browse found items: filter grid, search, pagination.",
        "Item detail page and claim submission.",
        "Profile dashboard: my found items, claims on my items, my claims.",
        "Admin: moderate items and delete unused categories.",
        "REST API (Express, Prisma, PostgreSQL) for all of the above.",
        "AI search (v2.0): semantic text search and search-by-photo, served by a "
        "separate CLIP embedding microservice.",
    ],
)
add_para(doc, "Out of scope (later):", bold=True)
add_bullets(
    doc,
    [
        "Email or push notifications.",
        "Chat between finder and claimant.",
        "Reporting a lost item (only found items are posted).",
        "Automatic duplicate/smart-match suggestions.",
        "Vector search in the database (pgvector). Current design ranks in the "
        "AI service; see section 15 for the scaling limit.",
    ],
)

# ------------------------------------------------------- 3 users and roles
add_heading(doc, "3. Users and roles", 1)
add_bullets(
    doc,
    [
        "Guest: not logged in. Can view the home page, browse, search and open "
        "item details. Cannot report or claim.",
        "User: logged in. Can report found items, claim items and use the "
        "dashboard. The same person can be both finder and claimant.",
        "Admin: everything a user can do, plus edit or archive any item, review "
        "any claim, delete unused categories, and run search re-indexing.",
    ],
)

# --------------------------------------------------- 4 how the platform works
add_heading(doc, "4. How the platform works", 1)
add_numbers(
    doc,
    [
        "A finder picks up an item and opens Report a found item. They log in if "
        "needed, then fill in the form: title, description, category, where and "
        "when it was found, and a handover note. They upload photos. The item "
        "appears as OPEN.",
        "The owner opens the site, types what they lost into the search bar, or "
        "uploads a photo of a similar item, and narrows results with filters. "
        "Text search is semantic, so 'purse' can find a 'black leather wallet'.",
        "The owner opens the matching item and presses Claim. They must log in "
        "and write a proof-of-ownership message. The claim is PENDING.",
        "The finder sees the claim in their dashboard, reads the message, and "
        "approves or rejects it.",
        "On approval the item becomes CLAIMED and all other pending claims on it "
        "are rejected automatically. The claimant sees the finder's phone and "
        "email plus the handover note.",
        "After the handover the finder marks the item RETURNED. Items nobody "
        "collects can be archived.",
    ],
)
add_para(
    doc,
    "Privacy: the public only ever sees the finder's name. Contact details are "
    "shown to the approved claimant only.",
)

# ------------------------------------------------------ 5 pages and features
add_heading(doc, "5. Pages and features", 1)

add_heading(doc, "5.1 Global navigation", 2)
add_bullets(
    doc,
    [
        "Logo, then Home, Browse found items, How it works, Report a found item.",
        "Right side: notification bell and profile avatar. Guests see Log in and "
        "Sign up instead of the avatar.",
        "The avatar opens the profile dashboard.",
        "Notification bell: shows the count of pending claims on the user's "
        "items. Note: the count endpoint is not built yet (section 15).",
    ],
)

add_heading(doc, "5.2 Home page", 2)
add_bullets(
    doc,
    [
        "Hero with headline, subtitle and the main search bar.",
        "Search bar: text input for the query, a Where? field and a When? field. "
        "Submitting opens Browse with those filters applied.",
        "Try chips: quick category shortcuts from the categories API.",
        "Recently found card: the newest OPEN item with title, handover note and "
        "time ago.",
        "Found something? Report it button goes to the report form.",
        "Search-by-photo button: NOW ENABLED in v2.0. It calls "
        "POST /items/search-image. Previously marked Coming soon.",
        "Smart match card: still not built. Keep it hidden or disabled.",
    ],
)

add_heading(doc, "5.3 Browse found items", 2)
add_bullets(
    doc,
    [
        "Grid of item cards: first photo, title, category tag, location, time "
        "ago and a status badge.",
        "Filters: category, status (default OPEN), and keyword/semantic search.",
        "Lazy loading by infinite scroll. The first request loads 12 items and "
        "the next batch loads near the bottom of the grid.",
        "Images use native lazy loading and show a skeleton while loading.",
        "Search text and filters live in the URL query string so a filtered view "
        "can be shared and the back button works.",
        "States: loading skeletons, empty result and an error state with retry.",
        "See section 16 for exactly which query params the API supports today. "
        "Important: cursor pagination, sort and date range are NOT implemented; "
        "use offset pagination (page/limit) instead.",
    ],
)

add_heading(doc, "5.4 Item detail", 2)
add_bullets(
    doc,
    [
        "Photo gallery, title, category, found location, found date, description, "
        "finder name and status.",
        "Claim button. A guest is sent to log in and then returned here. The "
        "poster sees Manage instead. A user who already claimed sees their claim "
        "status. Only OPEN items can be claimed.",
        "Claim form: one message field, at least 10 characters.",
    ],
)

add_heading(doc, "5.5 Report a found item (poster side)", 2)
add_bullets(
    doc,
    [
        "Requires login. Fields: Title (3-150 chars), Description (10-5000), "
        "Category (combobox over existing categories; new names are created on "
        "the fly and normalized so Wallet, wallet and WALLET become one), Found "
        "location (free text), Found date/time, Handover note (optional), and 1 "
        "to 5 photos (jpg/png/webp, 5 MB max each).",
        "After submitting, the item is OPEN and the poster lands on its detail "
        "page.",
        "Photos are optional at the API level, but the product assumption is at "
        "least one photo. Text is always required.",
    ],
)

add_heading(doc, "5.6 Profile dashboard", 2)
add_bullets(
    doc,
    [
        "Summary cards: open items, pending claims to review, my pending claims, "
        "items returned.",
        "My found items: the user's posts with photo, status, claim count and a "
        "pending badge. Actions: edit, mark returned, archive.",
        "Claims on my items: inbox of claims others made, grouped by item, newest "
        "first. Actions: approve or reject. After approval the claimant's contact "
        "details are shown.",
        "My claims: items the user claimed with their status. Action: withdraw "
        "while pending. When approved, the finder's contact details and handover "
        "note are shown.",
        "Account: edit name and phone, change password. Note: these endpoints are "
        "not built yet (section 15).",
    ],
)

add_heading(doc, "5.7 How it works", 2)
add_para(
    doc,
    "Static page with three steps (Report, Search, Claim and collect) and a short "
    "FAQ about proof of ownership. Add a line about searching by photo.",
)

add_heading(doc, "5.8 Auth pages", 2)
add_para(
    doc,
    "Register (name, email, password, optional phone) and Log in. The token "
    "expires after 7 days.",
)

# ------------------------------------------------------------ 6 status rules
add_heading(doc, "6. Status rules", 1)
add_para(doc, "Item status:", bold=True)
add_bullets(
    doc,
    [
        "OPEN: visible and claimable.",
        "CLAIMED: a claim was approved. Not claimable. Handover pending.",
        "RETURNED: handed back. Kept for history and hidden from default browse.",
        "ARCHIVED: removed. Visible only to the poster or an admin.",
    ],
)
add_para(doc, "Allowed item changes:", bold=True)
add_bullets(
    doc,
    [
        "OPEN to CLAIMED only by approving a claim.",
        "OPEN or CLAIMED to RETURNED.",
        "Any status to ARCHIVED.",
    ],
)
add_para(doc, "Claim status:", bold=True)
add_bullets(
    doc,
    [
        "PENDING to APPROVED or REJECTED, by the poster or an admin.",
        "PENDING to WITHDRAWN, by the claimant.",
        "Approving runs in one database transaction: approve the claim, set the "
        "item to CLAIMED, reject all other pending claims on it.",
        "One approved claim per item, one claim per user per item, and nobody can "
        "claim their own item.",
    ],
)

# ---------------------------------------------------------------- 7 data model
add_heading(doc, "7. Data model", 1)
add_para(doc, "Based on the current schema.prisma (Prisma 7 with a driver adapter).")
add_bullets(
    doc,
    [
        "User: id, email (unique), passwordHash, name, phone, role (USER or "
        "ADMIN), timestamps.",
        "Category: id, name (unique), slug (unique), createdAt. Free-form: "
        "created by posters and deduplicated by slug.",
        "Item: id, title, description, status, foundLocation, foundAt, "
        "handoverNote, categoryId, posterId, timestamps. A category cannot be "
        "deleted while items use it.",
        "ItemImage: id, itemId, url, position.",
        "Claim: id, itemId, claimantId, message, status, timestamps. Unique on "
        "itemId plus claimantId.",
        "ItemEmbedding (NEW in v2.0): itemId (primary key, cascades from Item), "
        "textVector, imageVector, modelVersion, dim, hasPhotos, updatedAt.",
    ],
)
add_para(doc, "Why two vectors instead of one:", bold=True)
add_para(
    doc,
    "CLIP scores text-against-text and text-against-photo on different scales. In "
    "testing, a text query scored about 0.57 against another item's text vector, "
    "but only about 0.41 against a genuinely matching photo. A single blended "
    "vector therefore let wordy, photo-less items outrank real photo matches. "
    "Storing textVector and imageVector separately means each search compares "
    "like with like: semantic text search uses textVector, while search-by-photo "
    "uses imageVector for items that actually have photos.",
)
add_para(doc, "Schema notes:", bold=True)
add_bullets(
    doc,
    [
        "The comment above model Category claimed Item stores the category "
        "display name; the model actually uses categoryId. Comment corrected.",
        "Found location is plain text; there are no coordinates in this phase.",
        "The dashboard and bell count need no schema change.",
        "Vectors are stored as Float[] (double precision[]) rather than pgvector, "
        "so no database extension is required. Ranking happens in the AI service.",
    ],
)

# ------------------------------------------------------------ 8 search design
add_heading(doc, "8. Search and filtering", 1)
add_heading(doc, "8.1 Keyword mode (implemented)", 2)
add_para(
    doc,
    "The whole q value is matched, case-insensitive, as a substring against title "
    "OR description. Note: this is NOT the per-word AND matching described in "
    "v1.0; see section 15 for the gap.",
)
add_heading(doc, "8.2 Semantic mode (implemented, v2.0)", 2)
add_bullets(
    doc,
    [
        "q is embedded by the CLIP service and compared against each item's "
        "textVector using cosine similarity.",
        "This matches related wording: 'purse' matches 'black leather wallet', "
        "'a scarf' matches 'Grey scarf'.",
        "Results are trimmed to those within a small margin of the best score. "
        "An absolute score threshold does not work here because unrelated pairs "
        "still score 0.35-0.58.",
        "If the AI service is unavailable, the API falls back to keyword mode and "
        "still returns HTTP 200, with searchMode set to 'keyword'.",
    ],
)
add_heading(doc, "8.3 Search by photo (implemented, v2.0)", 2)
add_bullets(
    doc,
    [
        "POST /items/search-image uploads a photo and compares it against each "
        "item's imageVector.",
        "The uploaded image is encoded in memory and never stored.",
        "Only items with at least one photo can match.",
        "Each result carries a score; results are already ordered best-first.",
    ],
)

# --------------------------------------------------------- 9 API requirements
add_heading(doc, "9. API requirements", 1)
add_para(
    doc,
    "General: JSON responses, errors shaped as { error: { code, message } }, JWT "
    "Bearer auth, zod validation. The full endpoint reference is in "
    "API_DOCUMENTATION.txt, which is the authoritative contract for the "
    "frontend.",
)
add_para(doc, "Implemented endpoints:", bold=True)
add_bullets(
    doc,
    [
        "Auth: POST /auth/register, POST /auth/login, GET /auth/me.",
        "Categories: GET /categories, POST /categories, DELETE /categories/:id.",
        "Items: GET /items, GET /items/:id, GET /items/mine, POST /items, "
        "PATCH /items/:id, DELETE /items/:id.",
        "AI search: GET /items?mode=semantic, POST /items/search-image, "
        "POST /items/reindex (admin).",
        "Images: POST /items/:id/images, DELETE /images/:id.",
        "Claims: POST /items/:id/claims, GET /items/:id/claims, GET /claims/mine, "
        "PATCH /claims/:id.",
    ],
)
add_para(doc, "Required but NOT yet implemented (see section 15):", bold=True)
add_bullets(
    doc,
    [
        "GET /claims/received - claims on the user's items, for the dashboard "
        "inbox.",
        "GET /me/summary - counts for the four summary cards and the bell.",
        "PATCH /auth/me and PATCH /auth/password - edit profile and password.",
        "GET /items cursor pagination, sort, where/from/to date range, and "
        "multi-word q matching.",
        "GET /categories sort=popular and limit.",
    ],
)

# ------------------------------------------------------------- 10 permissions
add_heading(doc, "10. Permissions", 1)
add_bullets(
    doc,
    [
        "Guest: GET /items, GET /items/:id, GET /categories, "
        "POST /items/search-image.",
        "User: everything a guest can do, plus create items and categories, edit "
        "or archive own items, claim other people's items, manage claims on own "
        "items and withdraw own claims.",
        "Admin: all user actions on any record, delete unused categories, and "
        "POST /items/reindex.",
        "Never return passwordHash. Poster email and phone are exposed only to the "
        "approved claimant.",
    ],
)

# ----------------------------------------------------------- 11 non-functional
add_heading(doc, "11. Non-functional requirements", 1)
add_bullets(
    doc,
    [
        "Security: bcrypt password hashes, JWT with 7-day expiry, server-side "
        "validation, uploads limited by type and size. The AI service has its own "
        "shared-secret API key and is never called from the browser.",
        "Performance: the first grid load of 12 items should feel instant. Images "
        "are lazy loaded. Database indexes cover status, category, poster and "
        "claims.",
        "AI latency: semantic search and search-by-photo take roughly 0.3-1.5 s "
        "per request on a CPU-only dev machine. The UI must show a loading state.",
        "Images: stored under uploads/ and served statically. In Docker, uploads "
        "are a named volume so they survive restarts.",
        "Responsive: mobile first. 1 column on phones, 2 on tablets, 3-4 on "
        "desktop.",
        "Accessibility: keyboard navigation, alt text from the item title, "
        "enough contrast on the blue theme.",
        "Reliability: claim approval is transactional. AI search degrades "
        "gracefully rather than failing the request.",
    ],
)

# -------------------------------------------------------------- 12 milestones
add_heading(doc, "12. Milestones", 1)
add_bullets(
    doc,
    [
        "1. Backend CRUD: schema migration, auth, categories, items, images, "
        "claims and seed data. DONE.",
        "2. AI search backend: CLIP embedding microservice, vector storage, "
        "semantic and photo search endpoints. DONE.",
        "3. Docker stack so the frontend team can run everything with one "
        "command. DONE (see README-DOCKER.md).",
        "4. Frontend core: home, browse with filters and lazy loading, item "
        "detail, auth pages.",
        "5. Frontend AI integration: semantic search in the search bar, "
        "search-by-photo button.",
        "6. Poster and claimant flows: report form with category picker and the "
        "profile dashboard.",
        "7. Missing backend endpoints from section 15.",
        "8. Polish: empty and error states, responsive pass, How it works page "
        "and demo data.",
    ],
)

# ------------------------------------------------------------- 13 AI phase
add_heading(doc, "13. AI search phase (BUILT in v2.0)", 1)
add_para(
    doc,
    "The AI search phase described as future work in v1.0 is now implemented.",
)
add_heading(doc, "13.1 Architecture", 2)
add_bullets(
    doc,
    [
        "A separate Python microservice (server/embedding-service, FastAPI) loads "
        "a CLIP model and converts text and images into 512-dimension vectors.",
        "The Express API calls that service over HTTP. The frontend only ever "
        "talks to the Express API; it never calls the Python service directly.",
        "The service is stateless and never touches the database. Express owns "
        "all persistence.",
        "Vectors are stored per item in the ItemEmbedding table.",
        "Model files live in server/model and are git-ignored (about 600 MB). "
        "The service resolves the path from MODEL_DIR, defaulting to server/model, "
        "so no absolute path is hardcoded anywhere.",
    ],
)
add_heading(doc, "13.2 What the user gets", 2)
add_bullets(
    doc,
    [
        "Semantic text search: natural phrasing and synonyms work. 'purse' finds "
        "'black leather wallet'. Keyword search returns nothing for the same "
        "query.",
        "Search by photo: upload a picture and get visually similar found items.",
        "Both are additive. Every existing endpoint behaves exactly as before.",
    ],
)
add_heading(doc, "13.3 Reliability rules", 2)
add_bullets(
    doc,
    [
        "Vector indexing is always background work. Creating or editing an item "
        "never waits for the model, and never fails because the model is down.",
        "If the AI service is down, GET /items?mode=semantic falls back to keyword "
        "and returns 200.",
        "If the AI service is down, POST /items/search-image returns 503 "
        "SEARCH_UNAVAILABLE, because there is no keyword equivalent of searching "
        "by photo.",
        "Unindexed items heal themselves: searches queue missing vectors in the "
        "background, and POST /items/reindex is available to admins as a manual "
        "backfill.",
    ],
)
add_heading(doc, "13.4 Not in this phase", 2)
add_bullets(
    doc,
    [
        "pgvector indexing. Ranking is done in the service over a capped candidate "
        "pool, which is fine up to a few thousand items (see section 15).",
        "Automatic smart-match suggestions on the item detail page.",
        "Automatic re-embedding on model upgrade is manual: bump MODEL_VERSION and "
        "run POST /items/reindex.",
    ],
)

# ------------------------------------------------------- 14 assumptions
add_heading(doc, "14. Assumptions and open questions", 1)
add_para(doc, "Assumptions:", bold=True)
add_bullets(
    doc,
    [
        "At least one photo is recommended when reporting an item. Photos are "
        "optional in the API, but photo search only works for items that have "
        "them.",
        "The bell shows the pending-claim count only.",
        "Found location is free text with no map.",
        "Found items are public to everyone, guests included.",
    ],
)
add_para(doc, "Open questions:", bold=True)
add_bullets(
    doc,
    [
        "Frontend framework is not decided in this document. The repo currently "
        "has a React + Vite shell.",
        "Can any logged-in user create a category, or should an admin approve new "
        "ones? Current design: any logged-in user.",
        "Should RETURNED items stay browsable? Current design: hidden by default, "
        "reachable through the status filter.",
        "How large is the expected item count? This decides whether the in-memory "
        "ranking cap is sufficient or pgvector is needed.",
    ],
)

# ------------------------------------------------ 15 NEW: implementation status
add_heading(doc, "15. Implementation status and known gaps", 1)
add_para(
    doc,
    "This section is new in v2.0 and is deliberately blunt. It exists so the "
    "frontend team does not build against endpoints that do not exist yet.",
)
add_heading(doc, "15.1 Built and verified", 2)
add_table(
    doc,
    ["Area", "Status"],
    [
        ["Auth (register, login, me)", "Working"],
        ["Categories (list, create, delete)", "Working"],
        ["Items CRUD + images", "Working"],
        ["Claims (create, list, approve/reject/withdraw)", "Working"],
        ["Semantic text search", "Working"],
        ["Search by photo", "Working"],
        ["Background vector indexing", "Working"],
        ["Graceful degradation when AI is down", "Verified"],
        ["Docker stack (Postgres + API + AI)", "Compose file validated; image "
         "build not yet run on a machine with a Docker daemon"],
        ["Automated test suite", "NOT written - all checks were manual"],
    ],
)
add_heading(doc, "15.2 Required endpoints that do not exist yet", 2)
add_table(
    doc,
    ["Endpoint", "Needed for", "Impact"],
    [
        ["GET /me/summary", "Dashboard cards, notification bell",
         "Must compute counts client-side from /items/mine and /claims/mine"],
        ["GET /claims/received", "Claims-on-my-items inbox",
         "Must group client-side from per-item calls"],
        ["PATCH /auth/me", "Edit profile (name, phone)", "No endpoint"],
        ["PATCH /auth/password", "Change password", "No endpoint"],
    ],
)
add_heading(doc, "15.3 Query features not implemented on GET /items", 2)
add_table(
    doc,
    ["Feature", "v1.0 spec", "Reality"],
    [
        ["Pagination", "cursor + nextCursor", "page/limit offset only"],
        ["sort", "newest / oldest", "Always newest first"],
        ["where (location)", "contains filter", "Not supported"],
        ["from / to (date range)", "foundAt inclusive range", "Not supported"],
        ["q matching", "every word must appear", "Whole q as one substring"],
        ["category (multiple)", "repeatable", "One category per request"],
    ],
)
add_heading(doc, "15.4 Known limits and risks", 2)
add_bullets(
    doc,
    [
        "Ranking cap: semantic and photo search rank at most SEARCH_CANDIDATE_CAP "
        "items (default 2000) per request. Beyond that, pagination over ranked "
        "results becomes approximate and pgvector is the next step.",
        "Semantic search is relevance-only; it does not consider recency, so new "
        "items are not boosted.",
        "Model quality: on loosely related short queries the model still returns "
        "some plausible-but-wrong items. This is model behaviour, not a bug.",
        "CPU inference: about 0.3-1.5 s per embedding on a CPU-only machine. A GPU "
        "is advisable for production volume.",
        "Model files are 600 MB and git-ignored, so they must be transferred to "
        "each developer separately.",
        "Seed data creates items without vectors; they are indexed in the "
        "background on first search, so a fresh database starts in keyword mode "
        "for a few seconds.",
    ],
)

# ------------------------------------------- 16 NEW: frontend integration brief
add_heading(doc, "16. Frontend integration brief", 1)
add_para(
    doc,
    "Summary of what the frontend team needs. API_DOCUMENTATION.txt has the full "
    "contract.",
)
add_heading(doc, "16.1 Running the backend", 2)
add_para(doc, "Preferred, one command, from the repository root:", bold=False)
add_para(doc, "    docker compose up --build", bold=True)
add_para(
    doc,
    "Then the API is at http://localhost:3445 and the database is already "
    "migrated. You need the CLIP model folder at server/model for AI search; ask "
    "the backend team for it. Without it, everything still runs in keyword mode.",
)
add_para(doc, "Alternative, native:", bold=False)
add_para(
    doc,
    "    cd server && npm install && npx prisma migrate deploy && npm run dev\n"
    "    npm run db:seed      # sample data; admin@reclaim.test / password123",
    bold=True,
)
add_heading(doc, "16.2 Wiring the two AI features", 2)
add_table(
    doc,
    ["UI control", "Request"],
    [
        ["Main search box", "GET /items?q=<text>&mode=semantic&page=1&limit=12"],
        ["Search-by-photo button", "POST /items/search-image (multipart, field "
         "\"image\")"],
        ["Filters only", "GET /items?category=...&status=... (no mode needed)"],
    ],
)
add_heading(doc, "16.3 Handling the fallback", 2)
add_bullets(
    doc,
    [
        "Every GET /items response includes searchMode: 'keyword' or 'semantic'.",
        "If you requested semantic and the AI service is down, the API silently "
        "returns keyword results with HTTP 200 and searchMode 'keyword'. Check "
        "that field if the UI wants to label results, for example 'Best match' "
        "versus 'Text matches'.",
        "POST /items/search-image can return 503 SEARCH_UNAVAILABLE. Show a "
        "friendly message rather than a raw error.",
        "Keep q and mode in the URL so views are shareable and the back button "
        "works.",
    ],
)
add_heading(doc, "16.4 Things not to do", 2)
add_bullets(
    doc,
    [
        "Do not call the Python service on port 8000 from the browser. It needs an "
        "API key and is not CORS-enabled for public use.",
        "Do not call POST /items/reindex from the client; it is an admin tool.",
        "Do not send mode=semantic with an empty q.",
    ],
)

doc.save(OUT)
print(f"wrote {OUT}")
