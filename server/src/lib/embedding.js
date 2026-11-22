/**
 * Client for the Python embedding microservice (server/embedding-service).
 *
 * The service is optional: if EMBEDDING_URL is unset, isEmbeddingEnabled() is
 * false and callers fall back to plain SQL substring search. Nothing here
 * throws on a cold/absent service, so the API keeps working while the model
 * is still loading.
 */
import { config } from "../config.js";

const BASE_URL = config.embeddingUrl;
const API_KEY = config.embeddingApiKey;
const TIMEOUT_MS = config.embeddingTimeoutMs;

export const isEmbeddingEnabled = () => Boolean(BASE_URL);

/** Error carrying the upstream status so routes can answer 502/503 sensibly. */
export class EmbeddingError extends Error {
  constructor(message, { status = 502, unreachable = false } = {}) {
    super(message);
    this.name = "EmbeddingError";
    this.status = status;
    this.unreachable = unreachable;
  }
}

async function call(path, { form, ...options } = {}) {
  if (!BASE_URL) throw new EmbeddingError("Embedding service is not configured", { status: 503 });

  const headers = { ...(API_KEY ? { "X-API-Key": API_KEY } : {}), ...(options.headers ?? {}) };
  // Let fetch set the multipart boundary itself; a manual header breaks it.
  if (!form) headers["Content-Type"] ??= "application/json";

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      body: form ?? options.body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // AbortSignal.timeout() fires as TimeoutError; DNS/refused land here too.
    const reason = err?.name === "TimeoutError" ? "timed out" : "unreachable";
    throw new EmbeddingError(`Embedding service ${reason}`, { status: 503, unreachable: true });
  }

  if (res.status === 503) {
    throw new EmbeddingError("Embedding model is still loading", { status: 503 });
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new EmbeddingError(`Embedding service ${res.status}: ${detail.slice(0, 200)}`, {
      status: res.status,
    });
  }
  return res.json();
}

const toForm = (buffer, filename, mimetype) => {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimetype }), filename);
  return form;
};

/** @returns {Promise<number[]>} 512-d text vector */
export async function embedText(text) {
  const { embedding } = await call("/embed/text", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  return embedding;
}

/** Batch text encoding — one model pass instead of N HTTP calls. */
export async function embedTexts(texts) {
  const { items } = await call("/embed/texts", {
    method: "POST",
    body: JSON.stringify({ texts }),
  });
  return items.map((item) => item.embedding);
}

/** @returns {Promise<number[]>} 512-d image vector from an in-memory buffer */
export async function embedImage(buffer, mimetype = "image/jpeg", filename = "image.jpg") {
  const form = toForm(buffer, filename, mimetype);
  const { embedding } = await call("/embed/image", { method: "POST", form });
  return embedding;
}

/**
 * Build the vectors stored on an item: one text vector plus a photo vector
 * (empty when the item has no photos). They stay separate because CLIP scores
 * text-vs-text and text-vs-photo on different scales.
 * @returns {Promise<{textVector: number[], imageVector: number[], hasPhotos: boolean}>}
 */
export async function embedItem({ title, description, imageUrls = [] }) {
  return call("/embed/item", {
    method: "POST",
    body: JSON.stringify({ title, description, image_urls: imageUrls }),
  });
}

/** Cosine scores of one query vector against many candidate vectors. */
export async function scoreAgainst(query, candidates) {
  const { scores } = await call("/score", {
    method: "POST",
    body: JSON.stringify({ query, candidates }),
  });
  return scores;
}

/**
 * Text → images: the query text is compared directly against item vectors.
 * @param {string} text
 * @param {Array<{id: string, embedding: number[]}>} candidates
 * @returns {Promise<Array<{id: string, score: number}>>}
 */
export async function searchByText(text, candidates, k = 10) {
  const { results } = await call("/search/text", {
    method: "POST",
    body: JSON.stringify({ text, candidates, k }),
  });
  return results;
}

/**
 * Cosine scores are high and tightly clustered for this checkpoint (unrelated
 * text/photos still score ~0.35-0.58), so an absolute floor cannot separate
 * matches from noise. These helpers apply a *relative* cutoff instead: keep
 * results within `margin` of the best hit. Tune with SEARCH_RELATIVE_MARGIN.
 */
export function applyRelativeCutoff(results, { margin = 0.05, minScore = 0 } = {}) {
  if (results.length === 0) return results;
  const best = results[0].score;
  const floor = Math.max(best - margin, minScore);
  // Always keep at least one result so a weak-but-real match is never lost.
  const kept = results.filter((row) => row.score >= floor);
  return kept.length > 0 ? kept : results.slice(0, 1);
}

/**
 * Image → images. multipart because the query is a file; candidates travel as
 * a JSON string field.
 * @returns {Promise<Array<{id: string, score: number}>>}
 */
export async function searchByImage(buffer, candidates, { k = 10, mimetype = "image/jpeg", filename = "query.jpg" } = {}) {
  const form = toForm(buffer, filename, mimetype);
  form.append("candidates", JSON.stringify(candidates));
  form.append("k", String(k));
  const { results } = await call("/search/image", { method: "POST", form });
  return results;
}

/** Never throws — used by /health style probes. */
export async function embeddingHealth() {
  if (!BASE_URL) return { status: "disabled" };
  try {
    return await call("/health");
  } catch (err) {
    return { status: "unavailable", error: err.message };
  }
}
