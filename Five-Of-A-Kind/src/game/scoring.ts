/**
 * Scoring engine. Implements docs/RULES.md §3, §4 and §5.
 *
 * The §4.3 wild placement precedence chain lives in `legalCategories` and nowhere
 * else — the UI must not re-derive it.
 */

import {
  ALL_CATEGORIES,
  FIVE_OF_A_KIND_POINTS,
  LOWER_CATEGORIES,
  UPPER_BONUS_POINTS,
  UPPER_BONUS_THRESHOLD,
  UPPER_CATEGORIES,
  WILD_BONUS_POINTS,
  isUpperCategory,
  type Category,
  type Dice,
  type DieValue,
  type Scorecard,
  type UpperCategory,
} from './types';

const FACES: readonly DieValue[] = [1, 2, 3, 4, 5, 6];

type FaceCounts = Readonly<Record<DieValue, number>>;

function faceCounts(dice: Dice): FaceCounts {
  const counts: Record<DieValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const die of dice) counts[die] += 1;
  return counts;
}

function sum(dice: Dice): number {
  return dice.reduce<number>((total, die) => total + die, 0);
}

function hasNOfAKind(counts: FaceCounts, n: number): boolean {
  return FACES.some((face) => counts[face] >= n);
}

/** Four or five *consecutive distinct faces* present — duplicates outside the run are fine (ruling D). */
function hasRun(counts: FaceCounts, length: 4 | 5): boolean {
  const starts: readonly DieValue[] = length === 4 ? [1, 2, 3] : [1, 2];
  return starts.some((start) => {
    for (let offset = 0; offset < length; offset += 1) {
      if (counts[(start + offset) as DieValue] === 0) return false;
    }
    return true;
  });
}

/** 3 of one face and 2 of a *different* face. Five of a kind is not a natural full house (ruling E). */
function isNaturalFullHouse(counts: FaceCounts): boolean {
  return FACES.some((face) => counts[face] === 3) && FACES.some((face) => counts[face] === 2);
}

/** The face all five dice show, or `null` if they are not five of a kind. */
export function fiveOfAKindFace(dice: Dice): DieValue | null {
  const counts = faceCounts(dice);
  return FACES.find((face) => counts[face] === 5) ?? null;
}

export function isFiveOfAKind(dice: Dice): boolean {
  return fiveOfAKindFace(dice) !== null;
}

/** The upper category that a face scores into — `4` → `'fours'`. */
export function upperCategoryForFace(face: DieValue): UpperCategory {
  const category = UPPER_CATEGORIES[face - 1];
  /* c8 ignore next */
  if (!category) throw new Error(`no upper category for face ${face}`);
  return category;
}

/** True when §4.1 applies — five of a kind AND the category already filled. */
export function isWildTurn(dice: Dice, scorecard: Scorecard): boolean {
  return isFiveOfAKind(dice) && scorecard.scores.fiveOfAKind !== null;
}

/** True when a wild turn also earns +100 — i.e. fiveOfAKind holds exactly 50 (§4.2). */
export function earnsBonus(dice: Dice, scorecard: Scorecard): boolean {
  return isWildTurn(dice, scorecard) && scorecard.scores.fiveOfAKind === FIVE_OF_A_KIND_POINTS;
}

export function isOpen(scorecard: Scorecard, category: Category): boolean {
  return scorecard.scores[category] === null;
}

/**
 * Score `dice` in `category`, given the current scorecard.
 * The scorecard is required because wild rules (§4.3) change the value of
 * fullHouse / smallStraight / largeStraight for non-qualifying dice.
 * Returns 0 for a non-qualifying, non-wild hand. Does not mutate.
 */
export function scoreFor(category: Category, dice: Dice, scorecard: Scorecard): number {
  const counts = faceCounts(dice);
  const total = sum(dice);
  const wild = isWildTurn(dice, scorecard);

  if (isUpperCategory(category)) {
    const face = (UPPER_CATEGORIES.indexOf(category) + 1) as DieValue;
    return counts[face] * face;
  }

  switch (category) {
    // Sum of all five dice, not just the matching ones (ruling A).
    case 'threeOfAKind':
      return hasNOfAKind(counts, 3) ? total : 0;
    case 'fourOfAKind':
      return hasNOfAKind(counts, 4) ? total : 0;
    case 'fullHouse':
      return isNaturalFullHouse(counts) || wild ? 25 : 0;
    case 'smallStraight':
      return hasRun(counts, 4) || wild ? 30 : 0;
    case 'largeStraight':
      return hasRun(counts, 5) || wild ? 40 : 0;
    case 'fiveOfAKind':
      return hasNOfAKind(counts, 5) ? FIVE_OF_A_KIND_POINTS : 0;
    case 'chance':
      return total;
  }
}

/**
 * The categories the player is permitted to commit to this turn.
 * On an ordinary turn: every open category.
 * On a wild turn (§4.1): exactly the set allowed by the §4.3 step that applies.
 * Never returns an empty array while the game is in progress (ruling H).
 */
export function legalCategories(dice: Dice, scorecard: Scorecard): Category[] {
  const open = ALL_CATEGORIES.filter((category) => isOpen(scorecard, category));
  if (!isWildTurn(dice, scorecard)) return open;

  const face = fiveOfAKindFace(dice);
  /* c8 ignore next */
  if (face === null) return open;

  // Step 1 — the matching upper box, if open, is forced.
  const matchingUpper = upperCategoryForFace(face);
  if (isOpen(scorecard, matchingUpper)) return [matchingUpper];

  // Step 2 — otherwise any open lower box, player's choice.
  const openLower = LOWER_CATEGORIES.filter((category) => isOpen(scorecard, category));
  if (openLower.length > 0) return openLower;

  // Step 3 — otherwise a forced zero in any open upper box.
  return UPPER_CATEGORIES.filter((category) => isOpen(scorecard, category));
}

export function isLegalCategory(
  category: Category,
  dice: Dice,
  scorecard: Scorecard,
): boolean {
  return legalCategories(dice, scorecard).includes(category);
}

function totalOf(scorecard: Scorecard, categories: readonly Category[]): number {
  return categories.reduce<number>(
    (total, category) => total + (scorecard.scores[category] ?? 0),
    0,
  );
}

export function upperSubtotal(scorecard: Scorecard): number {
  return totalOf(scorecard, UPPER_CATEGORIES);
}

/** 35 or 0 — never partial, never scaled (§3.2). */
export function upperBonus(scorecard: Scorecard): number {
  return upperSubtotal(scorecard) >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_POINTS : 0;
}

export function lowerTotal(scorecard: Scorecard): number {
  return totalOf(scorecard, LOWER_CATEGORIES);
}

export function bonusPoints(scorecard: Scorecard): number {
  return scorecard.bonusCount * WILD_BONUS_POINTS;
}

export function grandTotal(scorecard: Scorecard): number {
  return (
    upperSubtotal(scorecard) + upperBonus(scorecard) + lowerTotal(scorecard) + bonusPoints(scorecard)
  );
}

function rollDie(rng: () => number): DieValue {
  return (Math.min(6, 1 + Math.floor(rng() * 6)) || 1) as DieValue;
}

/**
 * Reroll every die not marked held.
 * `rng` is injected so scoring and turn logic are deterministically testable.
 */
export function roll(dice: Dice, held: readonly boolean[], rng: () => number): Dice {
  return dice.map((die, index) => (held[index] ? die : rollDie(rng))) as unknown as Dice;
}
