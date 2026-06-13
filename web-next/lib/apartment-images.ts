/** Backend stores images as `{ url, publicId, ... }[]`; legacy rows may use plain strings. */

export type ApartmentImageRef =
  | string
  | {
      url?: string | null;
      secure_url?: string | null;
    };

const PLACEHOLDER_HOSTS = ["via.placeholder.com", "placehold.co", "placeholder.com"];

function isPlaceholderUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return PLACEHOLDER_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export function resolveApartmentImageUrl(image: ApartmentImageRef | null | undefined): string | null {
  if (!image) return null;

  const url =
    typeof image === "string"
      ? image.trim()
      : (image.url || image.secure_url || "").trim();

  if (!url || isPlaceholderUrl(url)) return null;
  return url;
}

export function getApartmentImageUrls(images: ApartmentImageRef[] | null | undefined): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => resolveApartmentImageUrl(img))
    .filter((url): url is string => Boolean(url));
}

export function getFirstApartmentImageUrl(images: ApartmentImageRef[] | null | undefined): string | null {
  return getApartmentImageUrls(images)[0] ?? null;
}
