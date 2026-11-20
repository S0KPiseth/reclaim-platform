import { Router } from "express";
import { prisma } from "../db.js";
import { isAdmin, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  AppError,
  conflict,
  forbidden,
  notFound,
  unprocessable,
} from "../middleware/errors.js";
import {
  createClaimSchema,
  itemIdParamSchema,
  updateClaimSchema,
} from "../schemas/index.js";

// Mounted at /items  ->  POST /items/:id/claims, GET /items/:id/claims
export const itemClaimsRouter = Router();

// Mounted at /claims ->  GET /claims/mine, PATCH /claims/:id
const claimsRouter = Router();

const claimantPublic = { select: { id: true, name: true } };
const claimantPrivate = { select: { id: true, name: true, email: true, phone: true } };

const itemSummary = {
  select: {
    id: true,
    title: true,
    category: { select: { id: true, name: true, slug: true } },
    status: true,
    foundLocation: true,
    foundAt: true,
    posterId: true,
  },
};

// POST /items/:id/claims — any logged-in user who is not the poster
itemClaimsRouter.post(
  "/:id/claims",
  requireAuth,
  validate(itemIdParamSchema, "params"),
  validate(createClaimSchema),
  async (req, res, next) => {
    try {
      const item = await prisma.item.findUnique({ where: { id: req.params.id } });
      if (!item) throw notFound("Item not found");

      if (item.posterId === req.user.id) {
        throw forbidden("You cannot claim your own item");
      }
      if (item.status !== "OPEN") {
        throw conflict("This item is no longer open for claims", "ITEM_NOT_OPEN");
      }

      const existing = await prisma.claim.findUnique({
        where: { itemId_claimantId: { itemId: item.id, claimantId: req.user.id } },
      });
      if (existing) throw conflict("You have already claimed this item", "CLAIM_EXISTS");

      const claim = await prisma.claim.create({
        data: { itemId: item.id, claimantId: req.user.id, message: req.body.message },
        include: { claimant: claimantPublic, item: itemSummary },
      });

      res.status(201).json({ data: claim });
    } catch (err) {
      next(err);
    }
  },
);

// GET /items/:id/claims — poster or admin; shows claimant contact details
itemClaimsRouter.get(
  "/:id/claims",
  requireAuth,
  validate(itemIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const item = await prisma.item.findUnique({ where: { id: req.params.id } });
      if (!item) throw notFound("Item not found");
      if (!isAdmin(req.user) && item.posterId !== req.user.id) {
        throw forbidden("Only the poster or an admin can view claims");
      }

      const claims = await prisma.claim.findMany({
        where: { itemId: item.id },
        include: { claimant: claimantPrivate },
        orderBy: { createdAt: "desc" },
      });

      res.json({ data: claims });
    } catch (err) {
      next(err);
    }
  },
);

// GET /claims/mine — claims made by the current user
claimsRouter.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const claims = await prisma.claim.findMany({
      where: { claimantId: req.user.id },
      include: {
        item: {
          select: {
            ...itemSummary.select,
            images: { orderBy: { position: "asc" }, select: { id: true, url: true } },
            poster: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Poster email/phone are only exposed on this user's APPROVED claim.
    const data = await Promise.all(
      claims.map(async (claim) => {
        let posterContact = null;
        if (claim.status === "APPROVED") {
          const poster = await prisma.user.findUnique({
            where: { id: claim.item.posterId },
            select: { email: true, phone: true },
          });
          posterContact = poster ? { email: poster.email, phone: poster.phone } : null;
        }
        return { ...claim, posterContact };
      }),
    );

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// PATCH /claims/:id — poster/admin approve or reject; claimant may withdraw
claimsRouter.patch(
  "/:id",
  requireAuth,
  validate(updateClaimSchema),
  async (req, res, next) => {
    try {
      const { status } = req.body;

      const claim = await prisma.claim.findUnique({
        where: { id: req.params.id },
        include: { item: { select: { id: true, posterId: true, status: true } } },
      });
      if (!claim) throw notFound("Claim not found");

      const admin = isAdmin(req.user);
      const isPoster = claim.item.posterId === req.user.id;
      const isClaimant = claim.claimantId === req.user.id;

      if (status === "WITHDRAWN") {
        if (!isClaimant && !admin) throw forbidden("Only the claimant can withdraw a claim");
      } else if (!isPoster && !admin) {
        throw forbidden("Only the poster or an admin can approve or reject claims");
      }

      if (claim.status !== "PENDING") {
        throw conflict(
          `This claim has already been ${claim.status.toLowerCase()}`,
          "CLAIM_NOT_PENDING",
        );
      }

      if (status === "APPROVED" && claim.item.status !== "OPEN") {
        throw conflict("Only OPEN items can have an approved claim", "ITEM_NOT_OPEN");
      }

      // Approving: claim → APPROVED, item → CLAIMED, other PENDING claims → REJECTED.
      const updated = await prisma.$transaction(async (tx) => {
        if (status === "APPROVED") {
          await tx.claim.updateMany({
            where: { itemId: claim.itemId, status: "PENDING", id: { not: claim.id } },
            data: { status: "REJECTED" },
          });
          await tx.item.update({
            where: { id: claim.itemId },
            data: { status: "CLAIMED" },
          });
        }

        return tx.claim.update({
          where: { id: claim.id },
          data: { status },
          include: {
            claimant: claimantPublic,
            item: itemSummary,
          },
        });
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  },
);

export default claimsRouter;
