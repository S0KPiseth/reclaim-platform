import { Router } from "express";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { isAdmin, optionalAuth, requireAuth } from "../middleware/auth.js";
import { uploadImages, removeUploadedFiles, uploadSearchImage } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { AppError, forbidden, notFound, unprocessable } from "../middleware/errors.js";
import { resolveCategory, slugifyCategory } from "../lib/category.js";
import {
  isEmbeddingEnabled,
  queueItemEmbedding,
  queueMissingEmbeddings,
  rankIdsByImage,
  rankIdsByText,
  reindexItems,
} from "../lib/embeddingIndex.js";
import {
  createItemSchema,
  itemIdParamSchema,
  listItemsQuerySchema,
  searchImageQuerySchema,
  updateItemSchema,
} from "../schemas/index.js";

const router = Router();

// Allowed status transitions for PATCH /items/:id
const STATUS_TRANSITIONS = {
  OPEN: ["RETURNED", "ARCHIVED"],
  CLAIMED: ["RETURNED", "ARCHIVED"],
  RETURNED: ["ARCHIVED"],
  ARCHIVED: [],
};

const publicPoster = { select: { id: true, name: true } };
const publicCategory = { select: { id: true, name: true, slug: true } };

const itemInclude = {
  images: { orderBy: { position: "asc" } },
  poster: publicPoster,
  category: publicCategory,
};

// Restricts a listing to items the viewer may see. ARCHIVED is poster/admin only.
function visibilityWhere({ status, categorySlug }, viewer) {
  const where = {
    status,
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
  };
  if (status === "ARCHIVED") {
    if (!viewer) throw forbidden("Log in to view archived items");
    if (!isAdmin(viewer)) where.posterId = viewer.id;
  }
  return where;
}

// Keyword filter used by both search modes. In semantic mode it is only a
// pre-filter guard for very large tables, not the ranking itself.
const keywordOr = (q) => [
  { title: { contains: q, mode: "insensitive" } },
  { description: { contains: q, mode: "insensitive" } },
];

// Maps a category filter (slug or display name) to a slug for the lookup.
const categoryFilterSlug = (value) => slugifyCategory(value);

export function serializeItem(item) {
  const { _count, ...rest } = item;
  return _count ? { ...rest, claimCount: _count.claims } : rest;
}

const assertItemVisible = (item, viewer) => {
  // ARCHIVED items are only visible to their poster or an admin.
  if (item.status === "ARCHIVED" && !isAdmin(viewer) && viewer?.id !== item.posterId) {
    throw notFound("Item not found");
  }
};

async function findVisibleItem(id, viewer) {
  const item = await prisma.item.findUnique({ where: { id }, include: itemInclude });
  if (!item) throw notFound("Item not found");
  assertItemVisible(item, viewer);
  return item;
}

function assertOwnerOrAdmin(item, user) {
  if (!isAdmin(user) && item.posterId !== user.id) {
    throw forbidden("Only the poster or an admin can do that");
  }
}

// GET /items — public, with optional auth to reveal ARCHIVED to poster/admin.
// ?mode=semantic routes the query through the CLIP service: it matches related
// wording and the item's photos, not just literal substrings.
router.get(
  "/",
  optionalAuth,
  validate(listItemsQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const { q, category, status, page, limit, mode } = req.validatedQuery;
      const categorySlug = category ? categoryFilterSlug(category) : null;
      const where = visibilityWhere({ status, categorySlug }, req.user);

      // Semantic search: fetch a bounded candidate pool, rank with CLIP, page
      // in memory. Falls back to keyword search if the service is unavailable.
      if (q && mode === "semantic") {
        // Opportunistic backfill so unindexed items converge without admin action.
        queueMissingEmbeddings();
        const candidates = await prisma.item.findMany({
          where,
          include: itemInclude,
          orderBy: { createdAt: "desc" },
          take: config.searchCandidateCap,
        });

        const candidateIds = candidates.map((item) => item.id);
        let orderedIds;
        try {
          orderedIds = await rankIdsByText(q, candidateIds);
        } catch (err) {
          // rankIdsByText already degrades to null; this is a belt-and-braces guard.
          console.warn(`[embedding] semantic search failed: ${err.message}`);
          orderedIds = null;
        }

        if (orderedIds) {
          const byId = new Map(candidates.map((item) => [item.id, item]));
          const ranked = orderedIds.map((id) => byId.get(id)).filter(Boolean);
          const start = (page - 1) * limit;
          return res.json({
            data: ranked.slice(start, start + limit).map(serializeItem),
            page,
            limit,
            total: ranked.length,
            searchMode: "semantic",
          });
        }
        // Model unavailable: fall through to keyword search below.
      }

      if (q) where.OR = keywordOr(q);

      const [total, items] = await Promise.all([
        prisma.item.count({ where }),
        prisma.item.findMany({
          where,
          include: itemInclude,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      res.json({
        data: items.map(serializeItem),
        page,
        limit,
        total,
        searchMode: "keyword",
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /items/search-image — image -> image. Declared before /items/:id so the
// literal path is not captured as an id. The uploaded image is never stored.
// Result trimming is handled once, inside rankIdsByImage (relative cutoff), so
// there is no absolute score threshold here: CLIP keeps text-only items out and
// filters to items that actually have photos.
router.post(
  "/search-image",
  optionalAuth,
  uploadSearchImage,
  validate(searchImageQuerySchema, "query"),
  async (req, res, next) => {
    try {
      if (!req.file) throw unprocessable("image: An image file is required");
      if (!isEmbeddingEnabled()) {
        throw new AppError(503, "SEARCH_UNAVAILABLE", "Image search is not configured on this server");
      }

      const { category, status, limit } = req.validatedQuery;
      const categorySlug = category ? categoryFilterSlug(category) : null;
      const where = visibilityWhere({ status, categorySlug }, req.user);

      queueMissingEmbeddings();

      const candidates = await prisma.item.findMany({
        where,
        include: itemInclude,
        orderBy: { createdAt: "desc" },
        take: config.searchCandidateCap,
      });

      const matches = await rankIdsByImage(
        req.file.buffer,
        candidates.map((item) => item.id),
        { mimetype: req.file.mimetype },
      );

      if (matches === null) {
        throw new AppError(503, "SEARCH_UNAVAILABLE", "Image search is temporarily unavailable");
      }

      const byId = new Map(candidates.map((item) => [item.id, item]));
      const results = matches
        .slice(0, limit)
        .map((match) => {
          const item = byId.get(match.id);
          return item ? { ...serializeItem(item), score: match.score } : null;
        })
        .filter(Boolean);

      res.json({ data: results, limit, total: results.length, searchMode: "image" });
    } catch (err) {
      next(err);
    }
  },
);

// GET /items/mine — must be declared before /items/:id
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.item.findMany({
      where: { posterId: req.user.id },
      include: { ...itemInclude, _count: { select: { claims: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: items.map(serializeItem) });
  } catch (err) {
    next(err);
  }
});

// GET /items/:id — public
router.get("/:id", optionalAuth, validate(itemIdParamSchema, "params"), async (req, res, next) => {
  try {
    const item = await findVisibleItem(req.params.id, req.user);
    res.json({ data: item });
  } catch (err) {
    next(err);
  }
});

// POST /items — logged in, multipart/form-data with optional "images"
router.post("/", requireAuth, uploadImages, async (req, res, next) => {
  try {
    const parsed = createItemSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue.path.join(".");
      throw unprocessable(path ? `${path}: ${issue.message}` : issue.message);
    }

    const { category: categoryName, ...data } = parsed.data;
    const files = req.files ?? [];

    // The poster picked an existing category or typed a brand new one.
    const category = await resolveCategory(categoryName);
    if (!category) throw unprocessable("category: Please choose or create a category");

    const item = await prisma.item.create({
      data: {
        ...data,
        categoryId: category.id,
        posterId: req.user.id,
        images: {
          create: files.map((file, index) => ({
            url: `${config.publicPathPrefix}/${file.filename}`,
            position: index,
          })),
        },
      },
      include: itemInclude,
    });

    // Index in the background: a cold model must not delay the 201 response.
    queueItemEmbedding(item.id);

    res.status(201).json({ data: item });
  } catch (err) {
    removeUploadedFiles(req.files ?? []);
    next(err);
  }
});

// POST /items/reindex — admin only. Backfills vectors for existing items and
// for rows left stale by a model upgrade. Safe to re-run (idempotent upserts).
router.post("/reindex", requireAuth, async (req, res, next) => {
  try {
    if (!isAdmin(req.user)) throw forbidden("Only an admin can reindex search data");
    const limit = req.query.limit ? Number(req.query.limit) : null;
    const result = await reindexItems({
      limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// PATCH /items/:id — poster or admin
router.patch(
  "/:id",
  requireAuth,
  validate(itemIdParamSchema, "params"),
  validate(updateItemSchema),
  async (req, res, next) => {
    try {
      const item = await prisma.item.findUnique({ where: { id: req.params.id } });
      if (!item) throw notFound("Item not found");
      assertOwnerOrAdmin(item, req.user);

      const updates = { ...req.body };

      if (updates.status && updates.status !== item.status) {
        const allowed = STATUS_TRANSITIONS[item.status] ?? [];
        if (!allowed.includes(updates.status)) {
          throw new AppError(
            400,
            "INVALID_STATUS_TRANSITION",
            `Cannot change status from ${item.status} to ${updates.status}`,
          );
        }
      }

      // A new/changed category is resolved (created on the fly) before the update.
      if (updates.category !== undefined) {
        const category = await resolveCategory(updates.category);
        if (!category) throw unprocessable("category: Please choose or create a category");
        updates.categoryId = category.id;
        delete updates.category;
      }

      const updated = await prisma.item.update({
        where: { id: item.id },
        data: updates,
        include: itemInclude,
      });

      // Title/description changes invalidate the stored vector.
      if (updates.title !== undefined || updates.description !== undefined) {
        queueItemEmbedding(updated.id);
      }

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /items/:id — soft delete
router.delete(
  "/:id",
  requireAuth,
  validate(itemIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const item = await prisma.item.findUnique({ where: { id: req.params.id } });
      if (!item) throw notFound("Item not found");
      assertOwnerOrAdmin(item, req.user);

      const updated = await prisma.item.update({
        where: { id: item.id },
        data: { status: "ARCHIVED" },
        include: itemInclude,
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
