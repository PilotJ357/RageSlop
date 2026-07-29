/**
 * Type contracts lifted from docs/RULES.md §6.
 * That document is authoritative; where this file disagrees with it, this file is wrong.
 */

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

/** Exactly five dice. Order is not meaningful. */
export type Dice = readonly [DieValue, DieValue, DieValue, DieValue, DieValue];

export type UpperCategory = 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes';

export type LowerCategory =
  | 'threeOfAKind'
  | 'fourOfAKind'
  | 'fullHouse'
  | 'smallStraight'
  | 'largeStraight'
  | 'fiveOfAKind'
  | 'chance';

export type Category = UpperCategory | LowerCategory;

/**
 * `null` = open and playable. A number (including 0) = filled, immutable.
 * See ruling I — this distinction is load-bearing.
 */
export type Scorecard = {
  readonly scores: Readonly<Record<Category, number | null>>;
  /** Count of bonus five-of-a-kinds awarded; 100 points each. */
  readonly bonusCount: number;
};

export type TurnPhase = 'rolling' | 'awaitingCommit' | 'gameOver';

export type Held = readonly [boolean, boolean, boolean, boolean, boolean];

export interface GameState {
  readonly dice: Dice;
  /** Parallel to `dice`; true = held, not rerolled. */
  readonly held: Held;
  readonly rollsUsed: 0 | 1 | 2 | 3;
  /** 1..13 */
  readonly round: number;
  readonly scorecard: Scorecard;
  readonly phase: TurnPhase;
}

/** Ordered as the scorecard displays them. */
export const UPPER_CATEGORIES: readonly UpperCategory[] = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
];

export const LOWER_CATEGORIES: readonly LowerCategory[] = [
  'threeOfAKind',
  'fourOfAKind',
  'fullHouse',
  'smallStraight',
  'largeStraight',
  'fiveOfAKind',
  'chance',
];

export const ALL_CATEGORIES: readonly Category[] = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES];

export const TOTAL_ROUNDS = 13;
export const MAX_ROLLS_PER_TURN = 3;
export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS_POINTS = 35;
export const FIVE_OF_A_KIND_POINTS = 50;
export const WILD_BONUS_POINTS = 100;

export function isUpperCategory(category: Category): category is UpperCategory {
  return (UPPER_CATEGORIES as readonly Category[]).includes(category);
}
