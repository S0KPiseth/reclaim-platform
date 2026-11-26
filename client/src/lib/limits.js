/**
 * Upload limits mirrored from the API (server/src/config.js). Keep these in
 * sync with the server: the API stores one JPEG/PNG photo per item, max 2 MB.
 * The UI validates first so people get a friendly message instead of a 400.
 */
export const MAX_IMAGES_PER_ITEM = 1;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];
export const ALLOWED_IMAGE_ACCEPT = "image/jpeg,image/png";
export const ALLOWED_IMAGE_LABEL = "JPG or PNG";
export const MAX_IMAGE_LABEL = "2 MB";
