/**
 * `loadGame` is the app's only trust boundary: localStorage is the one input it does
 * not produce itself. These tests pin down what it must reject.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearGame, loadGame, saveGame } from './persistence';
import { emptyScorecard, newGame } from './game';
import { ALL_CATEGORIES } from './types';

const STORAGE_KEY = 'five-of-a-kind-game';

const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
});

/** A state that passes validation; individual tests override one field at a time. */
function validState() {
  return {
    dice: [1, 2, 3, 4, 5],
    held: [false, true, false, false, false],
    rollsUsed: 1,
    round: 2,
    phase: 'awaitingCommit',
    scorecard: { scores: { ...emptyScorecard().scores, ones: 3 }, bonusCount: 0 },
  };
}

function put(state: unknown) {
  store.set(STORAGE_KEY, JSON.stringify(state));
}

beforeEach(() => store.clear());

describe('loadGame', () => {
  it('returns null when nothing is stored', () => {
    expect(loadGame()).toBeNull();
  });

  it('returns null on malformed JSON', () => {
    store.set(STORAGE_KEY, '{not json');
    expect(loadGame()).toBeNull();
  });

  it('round-trips a state written by saveGame', () => {
    const state = newGame();
    saveGame(state);
    expect(loadGame()).toEqual(state);
  });

  it('accepts a well-formed state', () => {
    put(validState());
    expect(loadGame()).not.toBeNull();
  });
});

describe('loadGame rejects tampered scorecards', () => {
  it('rejects a scores object missing categories', () => {
    put({ ...validState(), scorecard: { scores: {}, bonusCount: 0 } });
    expect(loadGame()).toBeNull();
  });

  it.each(ALL_CATEGORIES)('rejects a scores object missing %s', (category) => {
    const scores: Record<string, unknown> = { ...emptyScorecard().scores };
    delete scores[category];
    put({ ...validState(), scorecard: { scores, bonusCount: 0 } });
    expect(loadGame()).toBeNull();
  });

  // NaN and Infinity are deliberately absent: JSON.stringify turns both into `null`,
  // so they cannot reach the validator through localStorage. `isValidScore` still
  // screens for them in case it is ever reused on a non-JSON source.
  it.each(['PWNED', true, {}, [], '42'])('rejects %p as a score value', (bad) => {
    const scores = { ...emptyScorecard().scores, ones: bad };
    put({ ...validState(), scorecard: { scores, bonusCount: 0 } });
    expect(loadGame()).toBeNull();
  });

  it.each([-1, 14, 1e308, 2.5, 'many'])('rejects bonusCount %p', (bonusCount) => {
    put({ ...validState(), scorecard: { scores: emptyScorecard().scores, bonusCount } });
    expect(loadGame()).toBeNull();
  });

  it('rejects a missing scorecard', () => {
    const { scorecard: _drop, ...rest } = validState();
    put(rest);
    expect(loadGame()).toBeNull();
  });
});

describe('loadGame rejects tampered turn state', () => {
  it.each([0, 7, 3.7, '4', null])('rejects %p as a die face', (die) => {
    put({ ...validState(), dice: [die, 2, 3, 4, 5] });
    expect(loadGame()).toBeNull();
  });

  it('rejects the wrong number of dice', () => {
    put({ ...validState(), dice: [1, 2, 3, 4] });
    expect(loadGame()).toBeNull();
  });

  it('rejects a non-boolean hold', () => {
    put({ ...validState(), held: [1, false, false, false, false] });
    expect(loadGame()).toBeNull();
  });

  it.each([-1, 4, 1.5])('rejects rollsUsed %p', (rollsUsed) => {
    put({ ...validState(), rollsUsed });
    expect(loadGame()).toBeNull();
  });

  it.each([0, 14, 2.5])('rejects round %p', (round) => {
    put({ ...validState(), round });
    expect(loadGame()).toBeNull();
  });

  it('rejects an unknown phase', () => {
    put({ ...validState(), phase: 'cheating' });
    expect(loadGame()).toBeNull();
  });
});

describe('clearGame', () => {
  it('removes a stored game', () => {
    saveGame(newGame());
    clearGame();
    expect(loadGame()).toBeNull();
  });
});
