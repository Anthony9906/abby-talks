import type { Stats } from "./types";
import type { Role } from "./roles";

const STORAGE_KEY = "math-battle-v1";

export const defaultStats: Stats = {
  medals: 0,
  stars: 0,
  totalMatches: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  attempts: 0,
  fastestAnswerSec: null,
  winStreak: 0,
  wrongBook: [],
};

export async function loadStats(role: Role): Promise<Stats> {
  const response = await fetch(`/api/profiles/${role}/math`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load math progress");
  const payload = (await response.json()) as { stats: Stats };
  return { ...defaultStats, ...payload.stats };
}

export async function saveStats(role: Role, stats: Stats): Promise<Stats> {
  const response = await fetch(`/api/profiles/${role}/math`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stats }),
  });
  if (!response.ok) throw new Error("Unable to save math progress");
  const payload = (await response.json()) as { stats: Stats };
  return payload.stats;
}

export const loadLegacyStats = (): Stats | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stats> & {
      daughterCorrect?: number;
      daughterAttempts?: number;
    };

    return {
      ...defaultStats,
      ...parsed,
      correctAnswers: parsed.correctAnswers ?? parsed.daughterCorrect ?? 0,
      attempts: parsed.attempts ?? parsed.daughterAttempts ?? 0,
    };
  } catch {
    return null;
  }
};

export const clearLegacyStats = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
};
