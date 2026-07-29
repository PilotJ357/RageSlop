import type { GameState } from './types';
import { ALL_CATEGORIES, MAX_ROLLS_PER_TURN, TOTAL_ROUNDS } from './types';

const STORAGE_KEY = 'five-of-a-kind-game';

/** Whole numbers only — a fractional die has no pip pattern and no scoring meaning. */
function isIntegerInRange(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/** A committed score is a finite number; `null` means the category is still open. */
function isValidScore(value: unknown): boolean {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function isValidGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!Array.isArray(obj.dice) || obj.dice.length !== 5) return false;
  if (!obj.dice.every((d: unknown) => isIntegerInRange(d, 1, 6))) return false;

  if (!Array.isArray(obj.held) || obj.held.length !== 5) return false;
  if (!obj.held.every((h: unknown) => typeof h === 'boolean')) return false;

  if (!isIntegerInRange(obj.rollsUsed, 0, MAX_ROLLS_PER_TURN)) return false;
  if (!isIntegerInRange(obj.round, 1, TOTAL_ROUNDS)) return false;
  if (typeof obj.phase !== 'string' || !['rolling', 'awaitingCommit', 'gameOver'].includes(obj.phase)) return false;

  if (typeof obj.scorecard !== 'object' || obj.scorecard === null) return false;
  const sc = obj.scorecard as Record<string, unknown>;
  if (typeof sc.scores !== 'object' || sc.scores === null) return false;

  // Every category must be present and hold a number or null. Without this check a
  // lookup returns `undefined`, which is neither open (`=== null`) nor filled: no
  // category is playable, every commit is a no-op, and the game soft-locks.
  const scores = sc.scores as Record<string, unknown>;
  if (!ALL_CATEGORIES.every((category) => category in scores && isValidScore(scores[category]))) {
    return false;
  }

  // At most one bonus per committed round, so the count cannot exceed the round count.
  if (!isIntegerInRange(sc.bonusCount, 0, TOTAL_ROUNDS)) return false;

  return true;
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidGameState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private-mode or quota failure: silently ignore.
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private-mode or quota failure: silently ignore.
  }
}
