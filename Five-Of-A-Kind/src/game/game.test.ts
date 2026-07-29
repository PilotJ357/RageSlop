/** Turn structure (§2) and the §4.4 worked examples, driven through the state machine. */

import { describe, expect, it } from 'vitest';
import { canCommit, canRoll, commit, emptyScorecard, newGame, rollDice, toggleHold } from './game';
import { grandTotal } from './scoring';
import {
  ALL_CATEGORIES,
  type Category,
  type Dice,
  type DieValue,
  type GameState,
  type Scorecard,
} from './types';

/** Deterministic rng that yields the given faces in order, then repeats the last one. */
function seqRng(faces: readonly DieValue[]): () => number {
  let index = 0;
  return () => {
    const face = faces[Math.min(index, faces.length - 1)] ?? 1;
    index += 1;
    return (face - 1) / 6;
  };
}

function card(overrides: Partial<Record<Category, number | null>>, bonusCount = 0): Scorecard {
  return { scores: { ...emptyScorecard().scores, ...overrides }, bonusCount };
}

function midTurn(scorecard: Scorecard, dice: Dice): GameState {
  return { ...newGame(), scorecard, dice, rollsUsed: 1, phase: 'awaitingCommit' };
}

describe('§2 turn structure', () => {
  it('starts in rolling with nothing committable', () => {
    const state = newGame();
    expect(state.phase).toBe('rolling');
    expect(state.round).toBe(1);
    expect(canCommit(state)).toBe(false);
    expect(commit(state, 'chance')).toBe(state);
  });

  it('allows at most three rolls per turn', () => {
    let state = newGame();
    for (let i = 1; i <= 3; i += 1) {
      expect(canRoll(state)).toBe(true);
      state = rollDice(state, seqRng([1, 2, 3, 4, 5]));
      expect(state.rollsUsed).toBe(i);
    }
    expect(canRoll(state)).toBe(false);
    expect(rollDice(state, seqRng([6]))).toBe(state);
  });

  it('rerolls only unheld dice, and holds are revisable between rolls', () => {
    let state = rollDice(newGame(), seqRng([1, 2, 3, 4, 5]));
    expect(state.dice).toEqual([1, 2, 3, 4, 5]);

    state = toggleHold(toggleHold(state, 0), 1);
    state = rollDice(state, seqRng([6]));
    expect(state.dice).toEqual([1, 2, 6, 6, 6]);

    // Release a held die and hold a previously rerolled one.
    state = toggleHold(toggleHold(state, 0), 2);
    state = rollDice(state, seqRng([3]));
    expect(state.dice).toEqual([3, 2, 6, 3, 3]);
  });

  it('ignores hold toggles before the first roll', () => {
    const state = newGame();
    expect(toggleHold(state, 0)).toBe(state);
  });

  it('resets dice, holds and rolls after a commit', () => {
    const rolled = rollDice(newGame(), seqRng([6, 6, 6, 6, 6]));
    const next = commit(toggleHold(rolled, 0), 'sixes');
    expect(next.scorecard.scores.sixes).toBe(30);
    expect(next.rollsUsed).toBe(0);
    expect(next.held).toEqual([false, false, false, false, false]);
    expect(next.phase).toBe('rolling');
    expect(next.round).toBe(2);
  });

  it('rejects a commit to a filled category', () => {
    const state = midTurn(card({ chance: 17 }), [1, 2, 3, 4, 5]);
    expect(commit(state, 'chance')).toBe(state);
  });

  it('ends after thirteen commits with every category filled', () => {
    let state = newGame();
    for (const category of ALL_CATEGORIES) {
      state = rollDice(state, seqRng([1, 2, 3, 4, 5]));
      state = commit(state, category);
    }
    expect(state.phase).toBe('gameOver');
    expect(state.round).toBe(13);
    expect(ALL_CATEGORIES.every((c) => state.scorecard.scores[c] !== null)).toBe(true);
    expect(canRoll(state)).toBe(false);
  });

  it('permits a voluntary scratch (ruling G)', () => {
    const state = midTurn(emptyScorecard(), [1, 1, 1, 1, 2]);
    expect(commit(state, 'largeStraight').scorecard.scores.largeStraight).toBe(0);
  });
});

describe('§4.4 worked examples', () => {
  const WILD: Dice = [4, 4, 4, 4, 4];

  it('five of a kind = 50, Fours open → +100 and 20 forced into Fours', () => {
    const state = midTurn(card({ fiveOfAKind: 50 }), WILD);
    expect(commit(state, 'chance')).toBe(state); // step 1 forbids anything else
    const next = commit(state, 'fours');
    expect(next.scorecard.scores.fours).toBe(20);
    expect(next.scorecard.bonusCount).toBe(1);
  });

  it('five of a kind = 50, Fours filled, Large Straight open → +100 and 40 (step 2)', () => {
    const state = midTurn(card({ fiveOfAKind: 50, fours: 12 }), WILD);
    const next = commit(state, 'largeStraight');
    expect(next.scorecard.scores.largeStraight).toBe(40);
    expect(next.scorecard.bonusCount).toBe(1);
  });

  it('five of a kind = 0, Fours filled, Full House open → no bonus, still 25 (step 2)', () => {
    const state = midTurn(card({ fiveOfAKind: 0, fours: 12 }), WILD);
    expect(commit(state, 'ones')).toBe(state); // lower boxes are open, so upper is illegal
    const next = commit(state, 'fullHouse');
    expect(next.scorecard.scores.fullHouse).toBe(25);
    expect(next.scorecard.bonusCount).toBe(0);
  });

  it('five of a kind = 50, everything but Ones filled → +100 and a forced 0 (step 3)', () => {
    const scores = {} as Record<Category, number | null>;
    for (const category of ALL_CATEGORIES) scores[category] = 0;
    scores.fiveOfAKind = 50;
    scores.ones = null;
    const state = midTurn({ scores, bonusCount: 0 }, WILD);
    const next = commit(state, 'ones');
    expect(next.scorecard.scores.ones).toBe(0);
    expect(next.scorecard.bonusCount).toBe(1);
  });

  it('five of a kind open → ordinary turn, free choice, no bonus (ruling F)', () => {
    const state = midTurn(emptyScorecard(), WILD);
    const next = commit(state, 'sixes');
    expect(next.scorecard.scores.sixes).toBe(0);
    expect(next.scorecard.bonusCount).toBe(0);
  });

  it('scoring the first five of a kind into its own box earns no bonus', () => {
    const state = midTurn(emptyScorecard(), WILD);
    const next = commit(state, 'fiveOfAKind');
    expect(next.scorecard.scores.fiveOfAKind).toBe(50);
    expect(next.scorecard.bonusCount).toBe(0);
    expect(grandTotal(next.scorecard)).toBe(50);
  });

  it('stacks uncapped bonuses across a game', () => {
    let state = midTurn(card({ fiveOfAKind: 50, fours: 12 }), WILD);
    state = commit(state, 'largeStraight');
    state = { ...state, dice: WILD, rollsUsed: 1, phase: 'awaitingCommit' };
    state = commit(state, 'smallStraight');
    expect(state.scorecard.bonusCount).toBe(2);
    expect(grandTotal(state.scorecard)).toBe(12 + 50 + 40 + 30 + 200);
  });
});
