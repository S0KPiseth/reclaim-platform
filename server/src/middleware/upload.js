import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { config } from "../config.js";

export const uploadDir = path.resolve(process.cwd(), config.uploadDir);
fs.mkdirSync(uploadDir, { recursive: true });

const allowedMime = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = allowedMime.get(file.mimetype) ?? path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!allowedMime.has(file.mimetype)) {
    return cb(new Error("Only jpg, png and webp images are allowed"));
  }
  cb(null, true);
};

// Accepts up to 5 files in the field named "images".
export const uploadImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.maxImageBytes, files: config.maxImagesPerItem },
}).array("images", config.maxImagesPerItem);

// Removes a previously stored upload given its public URL ("/uploads/xxx.jpg").
export function removeUploadedFile(url) {
  if (!url?.startsWith(`${config.publicPathPrefix}/`)) return;
  const name = path.basename(url);
  fs.promises.unlink(path.join(uploadDir, name)).catch(() => {});
}

// Deletes files multer already wrote when a request fails validation later on.
export function removeUploadedFiles(files = []) {
  for (const file of files) {
    fs.promises.unlink(file.path).catch(() => {});
  }
}
