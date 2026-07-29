/** Completed-game history, persisted to localStorage. Out of scope for RULES.md; UI only. */

export interface HistoryEntry {
  date: string;
  score: number;
}

const STORAGE_KEY = 'five-of-a-kind-history';
const MAX_ENTRIES = 20;

function isEntry(value: unknown): value is HistoryEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as HistoryEntry).date === 'string' &&
    typeof (value as HistoryEntry).score === 'number'
  );
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

export function appendScore(history: readonly HistoryEntry[], score: number): HistoryEntry[] {
  const entry: HistoryEntry = {
    date: new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    score,
  };
  const next = [entry, ...history].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private-mode or quota failure: keep the in-memory list and carry on.
  }
  return next;
}

export function summarize(history: readonly HistoryEntry[]) {
  if (history.length === 0) return { highScore: 0, gamesPlayed: 0, averageScore: 0 };
  const scores = history.map((entry) => entry.score);
  return {
    highScore: Math.max(...scores),
    gamesPlayed: history.length,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / history.length),
  };
}
