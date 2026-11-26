/**
 * Holds the photo used for a photo search.
 *
 * A File cannot live in the URL, so the landing page hands the photo over in
 * memory and navigates to `?mode=image`. Keeping it here (rather than consuming
 * it once) means going back to the results re-runs the same photo search.
 */
let pendingImage = null;

export function setPendingImage(file) {
  pendingImage = file ?? null;
}

export function peekPendingImage() {
  return pendingImage;
}

export function clearPendingImage() {
  pendingImage = null;
}
