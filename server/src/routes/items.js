import { Router } from "express";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { isAdmin, optionalAuth, requireAuth } from "../middleware/auth.js";
import { uploadImages, removeUploadedFiles } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { AppError, forbidden, notFound, unprocessable } from "../middleware/errors.js";
import { resolveCategory, slugifyCategory } from "../lib/category.js";
import {
  createItemSchema,
  itemIdParamSchema,
  listItemsQuerySchema,
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
router.get(
  "/",
  optionalAuth,
  validate(listItemsQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const { q, category, status, page, limit } = req.validatedQuery;

      const categorySlug = category ? categoryFilterSlug(category) : null;
      const where = {
        status,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      };

      if (status === "ARCHIVED") {
        if (!req.user) throw forbidden("Log in to view archived items");
        if (!isAdmin(req.user)) where.posterId = req.user.id;
      }

      if (q) {
        where.OR = [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ];
      }

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

      res.json({ data: items.map(serializeItem), page, limit, total });
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

    res.status(201).json({ data: item });
  } catch (err) {
    removeUploadedFiles(req.files ?? []);
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
