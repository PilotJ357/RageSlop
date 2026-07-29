import type { GameState } from './types';
import { TOTAL_ROUNDS } from './types';

const STORAGE_KEY = 'five-of-a-kind-game';

function isValidGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!Array.isArray(obj.dice) || obj.dice.length !== 5) return false;
  if (!obj.dice.every((d: unknown) => typeof d === 'number' && d >= 1 && d <= 6)) return false;

  if (!Array.isArray(obj.held) || obj.held.length !== 5) return false;
  if (!obj.held.every((h: unknown) => typeof h === 'boolean')) return false;

  if (typeof obj.rollsUsed !== 'number' || obj.rollsUsed < 0 || obj.rollsUsed > 3) return false;
  if (typeof obj.round !== 'number' || obj.round < 1 || obj.round > TOTAL_ROUNDS) return false;
  if (typeof obj.phase !== 'string' || !['rolling', 'awaitingCommit', 'gameOver'].includes(obj.phase)) return false;

  if (typeof obj.scorecard !== 'object' || obj.scorecard === null) return false;
  const sc = obj.scorecard as Record<string, unknown>;
  if (typeof sc.scores !== 'object' || sc.scores === null) return false;
  if (typeof sc.bonusCount !== 'number' || sc.bonusCount < 0) return false;

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
