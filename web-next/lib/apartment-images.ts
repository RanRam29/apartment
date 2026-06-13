/** Backend stores images as `{ url, publicId, ... }[]`; legacy rows may use plain strings. */

export type ApartmentImageRef =
  | string
  | {
      url?: string | null;
      secure_url?: string | null;
    };

const PLACEHOLDER_HOSTS = ["via.placeholder.com", "placehold.co", "placeholder.com"];

/** Known dead Unsplash IDs from early seed data — swap at read time for existing DB rows */
const DEAD_UNSPLASH_REPLACEMENTS: Record<string, string> = {
  "1502672023488-203a3bb6e526": "1600585154340-be6161a56a0c",
  "1555041469-db819a8be170": "1484154218962-a197022b5858",
};

function repairUnsplashUrl(url: string): string {
  let repaired = url;
  for (const [deadId, replacementId] of Object.entries(DEAD_UNSPLASH_REPLACEMENTS)) {
    if (repaired.includes(deadId)) {
      repaired = repaired.replace(deadId, replacementId);
    }
  }
  return repaired;
}

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
  return repairUnsplashUrl(url);
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
