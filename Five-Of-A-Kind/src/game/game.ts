/**
 * Turn state machine — docs/RULES.md §2.
 *
 * Every transition is pure: callers replace state rather than mutating it, and an
 * illegal transition returns the state untouched.
 */

import {
  ALL_CATEGORIES,
  MAX_ROLLS_PER_TURN,
  TOTAL_ROUNDS,
  type Category,
  type Dice,
  type GameState,
  type Held,
  type Scorecard,
} from './types';
import { earnsBonus, isLegalCategory, isOpen, roll, scoreFor } from './scoring';

const UNROLLED_DICE: Dice = [1, 1, 1, 1, 1];
const NOTHING_HELD: Held = [false, false, false, false, false];

export function emptyScorecard(): Scorecard {
  const scores = {} as Record<Category, number | null>;
  for (const category of ALL_CATEGORIES) scores[category] = null;
  return { scores, bonusCount: 0 };
}

export function newGame(): GameState {
  return {
    dice: UNROLLED_DICE,
    held: NOTHING_HELD,
    rollsUsed: 0,
    round: 1,
    scorecard: emptyScorecard(),
    phase: 'rolling',
  };
}

export function rollsLeft(state: GameState): number {
  return MAX_ROLLS_PER_TURN - state.rollsUsed;
}

export function canRoll(state: GameState): boolean {
  return state.phase !== 'gameOver' && state.rollsUsed < MAX_ROLLS_PER_TURN;
}

/** A turn cannot be committed before its first roll (§2.1). */
export function canCommit(state: GameState): boolean {
  return state.phase === 'awaitingCommit';
}

/** Indices of the dice a roll would actually change — used to animate only those faces. */
export function rerollIndices(state: GameState): number[] {
  return state.held.flatMap((held, index) => (held ? [] : [index]));
}

export function rollDice(state: GameState, rng: () => number = Math.random): GameState {
  if (!canRoll(state)) return state;
  return {
    ...state,
    dice: roll(state.dice, state.held, rng),
    rollsUsed: (state.rollsUsed + 1) as GameState['rollsUsed'],
    phase: 'awaitingCommit',
  };
}

/** Holds are re-chosen freely before every reroll; nothing is locked (§2, rule 3). */
export function toggleHold(state: GameState, index: number): GameState {
  if (state.phase !== 'awaitingCommit') return state;
  const held = state.held.map((value, i) => (i === index ? !value : value)) as unknown as Held;
  return { ...state, held };
}

export function commit(state: GameState, category: Category): GameState {
  if (!canCommit(state)) return state;
  if (!isOpen(state.scorecard, category)) return state;
  if (!isLegalCategory(category, state.dice, state.scorecard)) return state;

  // Both reads must happen against the pre-commit scorecard.
  const value = scoreFor(category, state.dice, state.scorecard);
  const bonusAwarded = earnsBonus(state.dice, state.scorecard);

  const scorecard: Scorecard = {
    scores: { ...state.scorecard.scores, [category]: value },
    bonusCount: state.scorecard.bonusCount + (bonusAwarded ? 1 : 0),
  };

  const complete = ALL_CATEGORIES.every((key) => scorecard.scores[key] !== null);

  return {
    dice: UNROLLED_DICE,
    held: NOTHING_HELD,
    rollsUsed: 0,
    round: complete ? TOTAL_ROUNDS : Math.min(state.round + 1, TOTAL_ROUNDS),
    scorecard,
    phase: complete ? 'gameOver' : 'rolling',
  };
}
