export const MAX_PHOTOS_PER_ENTRY = 6;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTO_CAPTION_LENGTH = 500;

export const ALLOWED_PHOTO_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedPhotoContentType = (typeof ALLOWED_PHOTO_CONTENT_TYPES)[number];
