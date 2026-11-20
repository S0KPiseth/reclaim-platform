import { prisma } from "../db.js";

const MAX_NAME_LENGTH = 40;

/**
 * Turns whatever the poster typed into a stable lookup key,
 * e.g. "Phone Charger" / "phone-charger" / "  PHONE   charger " -> "phone-charger".
 */
export function slugifyCategory(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_NAME_LENGTH)
    .replace(/-+$/g, "");
}

/** Trims and collapses whitespace so "  Phone   charger " -> "Phone charger". */
export function cleanCategoryName(name) {
  return String(name ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim();
}

/**
 * Finds a category by slug, creating it if it does not exist yet.
 * Categories are poster-defined, so this is the only place they get created
 * from item writes.
 */
export async function resolveCategory(input, tx = prisma) {
  const name = cleanCategoryName(input);
  const slug = slugifyCategory(name);
  if (!slug) return null;

  return tx.category.upsert({
    where: { slug },
    update: {},
    create: { name, slug },
  });
}

export { MAX_NAME_LENGTH as MAX_CATEGORY_NAME_LENGTH };
