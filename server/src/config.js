import "dotenv/config";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function requiredAny(names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Missing required environment variable: ${names[0]}`);
}

export const config = {
  databaseUrl: required("DATABASE_URL"),
  // Prefer SESSION_SECRET; fall back to JWT_SECRET so existing .env / Docker configs keep working.
  sessionSecret: requiredAny(["SESSION_SECRET", "JWT_SECRET"]),
  sessionCookieName: "reclaim.sid",
  sessionMaxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  cookieSecure: process.env.COOKIE_SECURE === "true",
  port: Number(process.env.PORT ?? 3445),
  uploadDir: "uploads",
  publicPathPrefix: "/uploads",
  maxImagesPerItem: 1,
  maxImageBytes: 2 * 1024 * 1024, // 2 MB

  // Embedding microservice (server/embedding-service). Optional: when
  // EMBEDDING_URL is empty, search falls back to SQL substring matching and
  // item writes skip vector storage. EMBEDDING_API_KEY is the service's own
  // shared secret and is unrelated to JWT_SECRET.
  embeddingUrl: (process.env.EMBEDDING_URL ?? "").replace(/\/$/, ""),
  embeddingApiKey: process.env.EMBEDDING_API_KEY ?? "",
  embeddingTimeoutMs: Number(process.env.EMBEDDING_TIMEOUT_MS ?? 15000),
  // Public origin used to turn "/uploads/x.jpg" into a URL the Python service
  // can fetch. Defaults to localhost so local dev works with no extra config.
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? `http://127.0.0.1:${Number(process.env.PORT ?? 3445)}`,
  // Item vectors over 2000 candidates need pgvector, not an HTTP round trip.
  searchCandidateCap: Number(process.env.SEARCH_CANDIDATE_CAP ?? 2000),
  // Cosine scores from this checkpoint cluster high (unrelated pairs still score
  // ~0.35-0.58), so results are trimmed to within this margin of the best hit.
  // Raise for more results, lower for stricter matching.
  searchRelativeMargin: Number(process.env.SEARCH_RELATIVE_MARGIN ?? 0.05),
};
