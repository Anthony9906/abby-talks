import type { Stats } from "./types";

const STORAGE_KEY = "math-battle-v1";

export const defaultStats: Stats = {
  medals: 0,
  stars: 0,
  totalMatches: 0,
  totalQuestions: 0,
  daughterCorrect: 0,
  daughterAttempts: 0,
  fastestAnswerSec: null,
  winStreak: 0,
  wrongBook: [],
};

export const loadStats = (): Stats => {
  if (typeof window === "undefined") return defaultStats;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats;

    return {
      ...defaultStats,
      ...JSON.parse(raw),
    };
  } catch {
    return defaultStats;
  }
};

export const saveStats = (stats: Stats) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};
