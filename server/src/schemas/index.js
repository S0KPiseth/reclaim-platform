import { z } from "zod";

const roleEnum = z.enum(["USER", "ADMIN"]);
// Categories are free-form: the poster either picks an existing one or types a new
// name, so this is plain text validated at write time (see src/lib/category.js).
const categoryName = z
  .string()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .refine((value) => value.length >= 2, { message: "Category must be at least 2 characters" })
  .refine((value) => value.length <= 40, { message: "Category must be 40 characters or fewer" })
  .refine((value) => /[a-z0-9]/i.test(value), {
    message: "Category must contain at least one letter or number",
  });
const itemStatusEnum = z.enum(["OPEN", "CLAIMED", "RETURNED", "ARCHIVED"]);
const claimStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"]);

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: z.string().trim().min(3).max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Must be a valid email"),
  password: z.string().min(1, "Password is required"),
});

// Used for both JSON and multipart bodies (multipart values arrive as strings).
export const createItemSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(150),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000),
  category: categoryName,
  foundLocation: z.string().trim().min(1, "Found location is required").max(200),
  foundAt: z.coerce.date({ message: "foundAt must be a valid date" }),
  handoverNote: z.string().trim().max(1000).optional(),
});

export const updateItemSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().min(10).max(5000),
    category: categoryName,
    status: itemStatusEnum,
    foundLocation: z.string().trim().min(1).max(200),
    foundAt: z.coerce.date({ message: "foundAt must be a valid date" }),
    handoverNote: z.string().trim().max(1000).nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: "No fields to update" });

export const listItemsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  // "keyword" is plain SQL substring matching. "semantic" sends the query to
  // the CLIP service, which also matches related wording ("purse" -> "wallet")
  // and compares text against item *photos*. Falls back to keyword when the
  // service is unavailable.
  mode: z.enum(["keyword", "semantic"]).default("keyword"),
  // Matches either the category slug ("phone-charger") or its display name
  // ("Phone charger"); both are normalized to a slug server-side.
  category: z.string().trim().min(1).max(40).optional(),
  status: itemStatusEnum.default("OPEN"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// POST /items/search-image — query params for the image->image search.
// No absolute score threshold: CLIP scores cluster too high for one to work, so
// results are trimmed relative to the best hit (SEARCH_RELATIVE_MARGIN).
export const searchImageQuerySchema = z.object({
  category: z.string().trim().min(1).max(40).optional(),
  status: itemStatusEnum.default("OPEN"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const itemIdParamSchema = z.object({ id: z.string().min(1) });

export const createClaimSchema = z.object({
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
});

export const updateClaimSchema = z.object({
  status: claimStatusEnum.refine((s) => ["APPROVED", "REJECTED", "WITHDRAWN"].includes(s), {
    message: "Status must be APPROVED, REJECTED or WITHDRAWN",
  }),
});

export const createCategorySchema = z.object({ name: categoryName });

export { roleEnum, categoryName, itemStatusEnum, claimStatusEnum };
