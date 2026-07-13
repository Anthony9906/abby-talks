import type { Role } from "./roles";

export type ReadingStopProgress = {
  notes: string[];
  shields: boolean[];
};

export type ReadingProgress = Record<number, ReadingStopProgress>;

const LEGACY_STORAGE_KEY = "abby-dragon-masters-quest-v1";

export async function loadReadingProgress(role: Role): Promise<ReadingProgress> {
  const response = await fetch(`/api/profiles/${role}/reading`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load reading progress");
  const payload = (await response.json()) as { progress: ReadingProgress };
  return payload.progress;
}

export async function saveReadingProgress(
  role: Role,
  progress: ReadingProgress,
): Promise<ReadingProgress> {
  const response = await fetch(`/api/profiles/${role}/reading`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ progress }),
  });
  if (!response.ok) throw new Error("Unable to save reading progress");
  const payload = (await response.json()) as { progress: ReadingProgress };
  return payload.progress;
}

export function loadLegacyReadingProgress(): unknown | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearLegacyReadingProgress() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}

