/**
 * Embedding-backed search and index maintenance.
 *
 * Design notes:
 *  - Vector storage is best-effort. If the microservice is down, item writes
 *    still succeed and search falls back to SQL; only a stale/missing vector is
 *    the consequence, never a failed request.
 *  - Ranking happens in Python over a capped candidate pool, so no pgvector
 *    extension is needed. Above config.searchCandidateCap you would want
 *    pgvector + an ORDER BY in SQL instead.
 *  - Vectors are only comparable within one modelVersion, so the stored
 *    version is checked against the service's current one and mismatches are
 *    treated as "not indexed".
 */
import { prisma } from "../db.js";
import { config } from "../config.js";
import {
  applyRelativeCutoff,
  embedItem,
  embeddingHealth,
  isEmbeddingEnabled,
  searchByImage,
  searchByText,
} from "./embedding.js";

// Re-exported so routes import every search concern from this one module.
export { isEmbeddingEnabled };

/** Public "/uploads/x.jpg" URL -> absolute URL the Python service can fetch. */
function absoluteImageUrl(publicPath) {
  const base = config.publicBaseUrl;
  if (!base) return publicPath;
  return new URL(publicPath, base).toString();
}

/** Resolves the service's current model version, cached per process. */
let cachedVersionPromise = null;
export async function currentModelVersion() {
  if (!isEmbeddingEnabled()) return null;
  cachedVersionPromise ??= embeddingHealth().then((health) =>
    health.status === "ok" ? health.model_version : null,
  );
  // A failed probe is retried next time (e.g. the model was still loading).
  const version = await cachedVersionPromise;
  if (!version) cachedVersionPromise = null;
  return version;
}

/**
 * Recomputes and stores an item's vector.
 * Never throws: returns null when embeddings are unavailable.
 */
export async function refreshItemEmbedding(itemId) {
  if (!isEmbeddingEnabled()) return null;
  try {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { images: { orderBy: { position: "asc" } } },
    });
    if (!item) return null;

    const version = await currentModelVersion();
    if (!version) return null;

    const { textVector, imageVector, hasPhotos } = await embedItem({
      title: item.title,
      description: item.description,
      imageUrls: item.images.map((image) => absoluteImageUrl(image.url)),
    });

    const data = {
      textVector,
      imageVector: imageVector ?? [],
      hasPhotos: Boolean(hasPhotos),
      dim: textVector.length,
      modelVersion: version,
    };
    await prisma.itemEmbedding.upsert({
      where: { itemId: item.id },
      create: { itemId: item.id, ...data },
      update: data,
    });
    return textVector;
  } catch (err) {
    console.warn(`[embedding] could not index item ${itemId}: ${err.message}`);
    return null;
  }
}

/** Fire-and-forget variant for write paths that must not block on the model. */
export function queueItemEmbedding(itemId) {
  if (!isEmbeddingEnabled()) return;
  setImmediate(() => {
    refreshItemEmbedding(itemId).catch(() => {});
  });
}

// Bounds the background sweep so a large backlog cannot saturate the model.
const SWEEP_BATCH = Number(process.env.EMBEDDING_SWEEP_BATCH ?? 5);
let sweepRunning = false;

/**
 * Indexes a few unindexed items in the background.
 *
 * Search-time queuing only covers items that appear in a request's candidate
 * window, so an item that never matches a query could stay unindexed forever.
 * This sweep closes that hole without any admin action. Bounded and
 * single-flight so repeated searches do not pile on work.
 */
export function queueMissingEmbeddings(limit = SWEEP_BATCH) {
  if (!isEmbeddingEnabled() || sweepRunning) return;
  sweepRunning = true;
  setImmediate(async () => {
    try {
      const version = await currentModelVersion();
      if (!version) return;
      const missing = await prisma.item.findMany({
        where: {
          OR: [
            { embedding: { is: null } },
            { embedding: { is: { modelVersion: { not: version } } } },
          ],
        },
        select: { id: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      for (const { id } of missing) {
        await refreshItemEmbedding(id);
      }
    } catch (err) {
      console.warn(`[embedding] background sweep failed: ${err.message}`);
    } finally {
      sweepRunning = false;
    }
  });
}

/**
 * Loads one stored vector per candidate item, skipping stale model versions.
 * @param {"text"|"image"} kind which vector to compare against the query
 */
async function loadVectors(itemIds, version, kind) {
  if (itemIds.length === 0) return [];
  const rows = await prisma.itemEmbedding.findMany({
    where: {
      itemId: { in: itemIds },
      modelVersion: version,
      // Image search only makes sense for items that actually have photos.
      ...(kind === "image" ? { hasPhotos: true } : {}),
    },
    select: { itemId: true, textVector: true, imageVector: true },
  });
  return rows
    .map((row) => ({
      id: row.itemId,
      embedding: kind === "image" ? row.imageVector : row.textVector,
    }))
    // An empty array would break the Python dimension check.
    .filter((row) => row.embedding.length > 0);
}

/**
 * Backfills vectors for items that have none (or an outdated model version).
 * Used by POST /items/reindex and by the startup warm-up.
 */
export async function reindexItems({ batchSize = 16, limit = null } = {}) {
  if (!isEmbeddingEnabled()) return { enabled: false, indexed: 0, remaining: 0 };
  const version = await currentModelVersion();
  if (!version) return { enabled: true, indexed: 0, remaining: 0, error: "service unavailable" };

  const stale = await prisma.item.findMany({
    where: {
      OR: [{ embedding: { is: null } }, { embedding: { is: { modelVersion: { not: version } } } }],
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    ...(limit ? { take: limit } : {}),
  });

  let indexed = 0;
  for (let i = 0; i < stale.length; i += batchSize) {
    const slice = stale.slice(i, i + batchSize);
    // Sequential on purpose: the Python service serializes forward passes anyway.
    for (const { id } of slice) {
      if (await refreshItemEmbedding(id)) indexed += 1;
    }
  }
  return { enabled: true, indexed, remaining: stale.length - indexed, modelVersion: version };
}

/**
 * Semantic text search. Returns null when embeddings cannot be used, so the
 * caller can fall back to SQL substring matching.
 * @param {string} query
 * @param {string[]} candidateIds item ids already filtered by SQL
 * @returns {Promise<string[] | null>} ordered item ids
 */
export async function rankIdsByText(query, candidateIds) {
  if (!isEmbeddingEnabled() || candidateIds.length === 0) return null;
  try {
    const version = await currentModelVersion();
    if (!version) return null;
    const candidates = await loadVectors(candidateIds, version, "text");

    // Self-healing: any candidate without a vector (never indexed, or stale
    // after a model upgrade) is queued for background indexing, so this search
    // returns keyword results now and semantic results next time. Without this,
    // a cold table would stay degraded until an admin ran /items/reindex.
    if (candidates.length < candidateIds.length) {
      const indexed = new Set(candidates.map((row) => row.id));
      for (const id of candidateIds) {
        if (!indexed.has(id)) queueItemEmbedding(id);
      }
    }

    if (candidates.length === 0) return null;

    const results = await searchByText(query, candidates, candidates.length);
    return applyRelativeCutoff(results, {
      margin: config.searchRelativeMargin,
    }).map((row) => row.id);
  } catch (err) {
    console.warn(`[embedding] text search failed: ${err.message}`);
    return null;
  }
}

/**
 * Image → image search.
 * @param {Buffer} buffer query image bytes
 * @param {string[]} candidateIds
 * @returns {Promise<Array<{id: string, score: number}> | null>}
 */
export async function rankIdsByImage(buffer, candidateIds, { mimetype = "image/jpeg" } = {}) {
  if (!isEmbeddingEnabled() || candidateIds.length === 0) return null;
  try {
    const version = await currentModelVersion();
    if (!version) return null;
    // Only items with photos are comparable in image space.
    const candidates = await loadVectors(candidateIds, version, "image");

    // Same self-healing as text search: queue anything not yet indexed.
    if (candidates.length < candidateIds.length) {
      const indexed = new Set(candidates.map((row) => row.id));
      for (const id of candidateIds) {
        if (!indexed.has(id)) queueItemEmbedding(id);
      }
    }

    if (candidates.length === 0) return null;

    const results = await searchByImage(buffer, candidates, {
      k: candidates.length,
      mimetype,
    });
    return applyRelativeCutoff(results, { margin: config.searchRelativeMargin });
  } catch (err) {
    console.warn(`[embedding] image search failed: ${err.message}`);
    return null;
  }
}
