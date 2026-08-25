const DISPLAY_NAME_FIELDS = ["given_name", "full_name", "name"] as const;

export function getAuthDisplayName(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) return null;

  for (const field of DISPLAY_NAME_FIELDS) {
    const value = metadata[field];
    if (typeof value !== "string") continue;

    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized || normalized.length > 80 || normalized.includes("@")) continue;

    return normalized.split(" ")[0] ?? null;
  }

  return null;
}
