import { Router } from "express";
import { prisma } from "../db.js";
import { isAdmin, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { conflict, forbidden, notFound, unprocessable } from "../middleware/errors.js";
import { createCategorySchema } from "../schemas/index.js";
import { resolveCategory, slugifyCategory } from "../lib/category.js";

const router = Router();

const publicCategory = {
  id: true,
  name: true,
  slug: true,
  _count: { select: { items: true } },
};

const serializeCategory = ({ _count, ...category }) => ({
  ...category,
  itemCount: _count?.items ?? 0,
});

// GET /categories — public list of every category posters have used.
// Used to populate the "pick or create" dropdown when posting an item.
router.get("/", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const categories = await prisma.category.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : {},
      select: publicCategory,
      orderBy: { name: "asc" },
    });
    res.json({ data: categories.map(serializeCategory) });
  } catch (err) {
    next(err);
  }
});

// POST /categories — logged in. Creates a category if it does not exist yet;
// creating an existing one simply returns it (idempotent on the slug).
router.post("/", requireAuth, validate(createCategorySchema), async (req, res, next) => {
  try {
    const slug = slugifyCategory(req.body.name);
    if (!slug) throw unprocessable("name: Please use letters or numbers");

    const existing = await prisma.category.findUnique({
      where: { slug },
      select: publicCategory,
    });
    if (existing) return res.status(200).json({ data: serializeCategory(existing) });

    const category = await resolveCategory(req.body.name);
    if (!category) throw unprocessable("name: Please use letters or numbers");

    const created = await prisma.category.findUnique({
      where: { id: category.id },
      select: publicCategory,
    });
    res.status(201).json({ data: serializeCategory(created) });
  } catch (err) {
    next(err);
  }
});

// DELETE /categories/:id — admin only, and only when nothing uses it.
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!isAdmin(req.user)) throw forbidden("Only an admin can delete categories");

    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { items: true } } },
    });
    if (!category) throw notFound("Category not found");
    if (category._count.items > 0) {
      throw conflict(
        `This category is used by ${category._count.items} item(s) and cannot be deleted`,
        "CATEGORY_IN_USE",
      );
    }

    await prisma.category.delete({ where: { id: category.id } });
    res.json({ data: { id: category.id, deleted: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
