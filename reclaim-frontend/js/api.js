import { API_URL } from "./config.js";

export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

// Token lives in sessionStorage (cleared when the tab closes), never in localStorage or the URL.
const read = (k) => { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } };
let token = read("rc_token");
let user = read("rc_user");

export const session = {
  get user() { return user; },
  get token() { return token; },
  set(t, u) { token = t; user = u; sessionStorage.setItem("rc_token", JSON.stringify(t)); sessionStorage.setItem("rc_user", JSON.stringify(u)); },
  clear() { token = null; user = null; sessionStorage.removeItem("rc_token"); sessionStorage.removeItem("rc_user"); },
};

// Only ever turn server paths under /uploads/ into image URLs.
export const imgSrc = (u) => (typeof u === "string" && /^\/uploads\/[\w.-]+$/.test(u) ? API_URL + u : "");

export async function api(path, { method = "GET", body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch(API_URL + path, { method, headers, body: payload, credentials: "omit" }); }
  catch { throw new ApiError(0, "NETWORK", "Can’t reach the server. Check that the API is running on " + API_URL + "."); }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) { session.clear(); location.hash = "#/login"; }
    throw new ApiError(res.status, data?.error?.code, data?.error?.message || "Something went wrong.");
  }
  return data;
}
