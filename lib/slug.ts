export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findBySlug<T>(items: T[], get: (t: T) => string, slug: string): T | undefined {
  return items.find((t) => slugify(get(t)) === slug);
}
