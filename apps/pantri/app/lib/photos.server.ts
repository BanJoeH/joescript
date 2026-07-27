import { type AllowedPhotoContentType, MAX_PHOTO_BYTES } from "~/lib/photos";

export { ALLOWED_PHOTO_CONTENT_TYPES, MAX_PHOTO_BYTES, MAX_PHOTOS_PER_IMPORT } from "~/lib/photos";

const JPEG_MAGIC = [0xff, 0xd8, 0xff] as const;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47] as const;
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46] as const;
const WEBP_MARKER = [0x57, 0x45, 0x42, 0x50] as const;

export function sniffPhotoContentType(bytes: Uint8Array): AllowedPhotoContentType | null {
  if (bytes.length >= 3 && JPEG_MAGIC.every((value, index) => bytes[index] === value)) {
    return "image/jpeg";
  }

  if (bytes.length >= 4 && PNG_MAGIC.every((value, index) => bytes[index] === value)) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    WEBP_RIFF.every((value, index) => bytes[index] === value) &&
    WEBP_MARKER.every((value, index) => bytes[index + 8] === value)
  ) {
    return "image/webp";
  }

  return null;
}

export function extensionForContentType(contentType: AllowedPhotoContentType) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
  }
}

export function buildPhotoStorageKey(pantryId: string, photoId: string, ext: string) {
  return `${pantryId}/${photoId}.${ext}`;
}

export function assertPhotoSize(byteSize: number) {
  if (byteSize > MAX_PHOTO_BYTES) {
    throw new Error(`Each photo must be ${MAX_PHOTO_BYTES / (1024 * 1024)} MB or smaller.`);
  }
}
