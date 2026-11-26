/**
 * Thin client for the Reclaim REST API (server/, default :3445).
 *
 * The browser only ever talks to the Express API — never to the Python
 * embedding service on :8000, which needs a shared secret and is not
 * CORS-enabled for public use.
 *
 * Auth is a server-side session: the API sets the httpOnly `reclaim.sid`
 * cookie, so every request is sent with `credentials: "include"` and the
 * frontend never stores a token. Only a cached copy of the public user is kept
 * in localStorage, and it is revalidated with GET /auth/me on every page load.
 */

const DEFAULT_API_URL = `http://${window.location.hostname || "localhost"}:3445`;

export const API_URL = (
  import.meta.env.VITE_API_URL || DEFAULT_API_URL
).replace(/\/+$/, "");

const USER_KEY = "reclaim.user";

// A 401 from these routes means "bad credentials", not "expired session".
const AUTH_ENTRY_PATHS = new Set(["/auth/login", "/auth/register"]);

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function readJSON(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage can be disabled — the app still works for this tab */
  }
}

function remove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Cached user for instant paint. The session itself lives in an httpOnly
 * cookie that JavaScript cannot read; AuthContext always revalidates it.
 */
export const session = {
  getUser: () => readJSON(USER_KEY),
  setUser: (user) => writeJSON(USER_KEY, user),
  clear: () => remove(USER_KEY),
};

async function request(path, { method = "GET", body, form } = {}) {
  const headers = {};

  let payload;
  if (form) {
    // Let the browser set the multipart boundary itself.
    payload = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: payload,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK",
      `Can’t reach the API at ${API_URL}. Check that the server is running.`,
    );
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const route = path.split("?")[0];
    if (response.status === 401 && !AUTH_ENTRY_PATHS.has(route)) {
      session.clear();
      window.dispatchEvent(new Event("reclaim:session-expired"));
    }
    throw new ApiError(
      response.status,
      json?.error?.code ?? "ERROR",
      json?.error?.message ?? `Request failed (${response.status}).`,
    );
  }

  return json;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path) => request(path, { method: "DELETE" }),
  submitForm: (path, form, method = "POST") => request(path, { method, form }),
};

/** Builds `?a=1&b=2`, skipping empty values. */
export function toQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Uploaded photos are stored as "/uploads/<file>" and served by the API.
 * Anything else is rejected so the UI never renders an unexpected URL.
 */
export function imageUrl(path) {
  if (typeof path !== "string") return "";
  if (!/^\/uploads\/[\w.-]+$/.test(path)) return "";
  return `${API_URL}${path}`;
}

/** First photo of an item, already resolved to an absolute URL. */
export function itemImage(item) {
  const first = item?.images?.[0];
  return first ? imageUrl(first.url) : "";
}
