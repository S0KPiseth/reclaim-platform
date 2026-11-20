import multer from "multer";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "./errors.js";
import { removeUploadedFiles } from "./upload.js";

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.originalUrl} not found` },
  });
}

const send = (res, status, code, message) =>
  res.status(status).json({ error: { code, message } });

// Central error handler: maps zod → 422, Prisma unique → 409, everything else → 500.
export function errorHandler(err, req, res, _next) {
  if (Array.isArray(req.files) && req.files.length > 0) removeUploadedFiles(req.files);

  if (err instanceof AppError) {
    return send(res, err.status, err.code, err.message);
  }

  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const path = issue.path.join(".");
    return send(res, 422, "VALIDATION_ERROR", path ? `${path}: ${issue.message}` : issue.message);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = Array.isArray(err.meta?.target)
        ? err.meta.target.join(", ")
        : String(err.meta?.target ?? "field");
      return send(res, 409, "CONFLICT", `A record with this ${target} already exists`);
    }
    if (err.code === "P2025") {
      return send(res, 404, "NOT_FOUND", "Resource not found");
    }
    if (err.code === "P2003") {
      return send(res, 409, "CONFLICT", "Related record does not exist");
    }
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return send(res, 400, "FILE_TOO_LARGE", "Each image must be 5 MB or smaller");
    }
    if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
      return send(res, 400, "TOO_MANY_FILES", "You can upload at most 5 images");
    }
    return send(res, 400, "UPLOAD_ERROR", err.message);
  }

  if (err?.message === "Only jpg, png and webp images are allowed") {
    return send(res, 400, "UNSUPPORTED_FILE_TYPE", err.message);
  }

  if (err?.type === "entity.parse.failed") {
    return send(res, 400, "INVALID_JSON", "Request body is not valid JSON");
  }

  console.error(err);
  return send(res, 500, "INTERNAL_ERROR", "Something went wrong");
}
