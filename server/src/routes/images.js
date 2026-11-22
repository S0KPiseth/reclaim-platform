import { Router } from "express";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { isAdmin, requireAuth } from "../middleware/auth.js";
import { removeUploadedFile, removeUploadedFiles, uploadImages } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { badRequest, forbidden, notFound } from "../middleware/errors.js";
import { queueItemEmbedding } from "../lib/embeddingIndex.js";
import { itemIdParamSchema } from "../schemas/index.js";

// Mounted at /items  ->  POST /items/:id/images
export const itemImagesRouter = Router();

// Mounted at /images  ->  DELETE /images/:id
export const imagesRouter = Router();

// POST /items/:id/images — poster or admin, respects the 5-image total limit
itemImagesRouter.post("/:id/images", requireAuth, uploadImages, async (req, res, next) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: { images: true },
    });
    if (!item) throw notFound("Item not found");
    if (!isAdmin(req.user) && item.posterId !== req.user.id) {
      throw forbidden("Only the poster or an admin can add images");
    }

    const files = req.files ?? [];
    if (files.length === 0) throw badRequest("At least one image file is required", "NO_FILES");

    const remaining = config.maxImagesPerItem - item.images.length;
    if (remaining <= 0) {
      throw badRequest(
        `This item already has the maximum of ${config.maxImagesPerItem} images`,
        "IMAGE_LIMIT_REACHED",
      );
    }
    if (files.length > remaining) {
      throw badRequest(
        `Only ${remaining} more image(s) allowed for this item`,
        "IMAGE_LIMIT_REACHED",
      );
    }

    const nextPosition = item.images.length;
    await prisma.itemImage.createMany({
      data: files.map((file, index) => ({
        itemId: item.id,
        url: `${config.publicPathPrefix}/${file.filename}`,
        position: nextPosition + index,
      })),
    });

    const images = await prisma.itemImage.findMany({
      where: { itemId: item.id },
      orderBy: { position: "asc" },
    });

    // New photos change what the item looks like, so its vector must be rebuilt.
    queueItemEmbedding(item.id);

    res.status(201).json({ data: images });
  } catch (err) {
    removeUploadedFiles(req.files ?? []);
    next(err);
  }
});

// DELETE /images/:id — poster or admin; removes DB row and the file on disk
imagesRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const image = await prisma.itemImage.findUnique({
      where: { id: req.params.id },
      include: { item: { select: { posterId: true } } },
    });
    if (!image) throw notFound("Image not found");
    if (!isAdmin(req.user) && image.item.posterId !== req.user.id) {
      throw forbidden("Only the poster or an admin can delete images");
    }

    await prisma.itemImage.delete({ where: { id: image.id } });
    removeUploadedFile(image.url);

    // Rebuild the item vector without the deleted photo.
    queueItemEmbedding(image.itemId);


    res.json({ data: { id: image.id, deleted: true } });
  } catch (err) {
    next(err);
  }
});
