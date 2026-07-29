/**
 * Test vectors from docs/RULES.md §7. Expected values are hand-computed from §3;
 * do not "fix" one by reading it off the implementation.
 */

import { describe, expect, it } from 'vitest';
import {
  bonusPoints,
  earnsBonus,
  grandTotal,
  isWildTurn,
  legalCategories,
  lowerTotal,
  roll,
  scoreFor,
  upperBonus,
  upperSubtotal,
} from './scoring';
import { emptyScorecard } from './game';
import {
  ALL_CATEGORIES,
  type Category,
  type Dice,
  type Scorecard,
  type UpperCategory,
} from './types';

const OPEN = emptyScorecard();

function card(overrides: Partial<Record<Category, number | null>>, bonusCount = 0): Scorecard {
  return { scores: { ...OPEN.scores, ...overrides }, bonusCount };
}

/** Everything filled with 0 except `open`; `fiveOfAKind` forced to `fiveValue` (§4.1). */
function onlyOpen(fiveValue: number, open: readonly Category[]): Scorecard {
  const scores = {} as Record<Category, number | null>;
  for (const category of ALL_CATEGORIES) scores[category] = open.includes(category) ? null : 0;
  scores.fiveOfAKind = fiveValue;
  return { scores, bonusCount: 0 };
}

const sorted = (categories: Category[]): Category[] => [...categories].sort();

describe('§7.1 upper section', () => {
  const cases: Array<[Dice, UpperCategory, number, string]> = [
    [[1, 1, 3, 4, 1], 'ones', 3, 'three 1s'],
    [[2, 2, 2, 2, 2], 'twos', 10, ''],
    [[6, 6, 6, 5, 5], 'threes', 0, 'no 3s'],
    [[4, 4, 1, 4, 6], 'fours', 12, 'other faces ignored'],
    [[5, 3, 5, 2, 5], 'fives', 15, ''],
    [[6, 6, 6, 6, 6], 'sixes', 30, ''],
  ];

  it.each(cases)('%j in %s = %i %s', (dice, category, expected) => {
    expect(scoreFor(category, dice, OPEN)).toBe(expected);
  });
});

describe('§7.2 lower section — qualifying', () => {
  const cases: Array<[Dice, Category, number, string]> = [
    [[5, 5, 5, 2, 1], 'threeOfAKind', 18, 'sum of all five (ruling A)'],
    [[6, 6, 6, 6, 6], 'threeOfAKind', 30, 'five satisfies three (ruling B)'],
    [[2, 2, 2, 2, 6], 'fourOfAKind', 14, 'sum of all five'],
    [[3, 3, 3, 3, 3], 'fourOfAKind', 15, 'five satisfies four (ruling B)'],
    [[3, 3, 3, 5, 5], 'fullHouse', 25, 'fixed'],
    [[1, 2, 3, 4, 6], 'smallStraight', 30, '1-2-3-4'],
    [[1, 2, 3, 4, 4], 'smallStraight', 30, 'duplicate outside run (ruling D)'],
    [[2, 3, 4, 5, 5], 'smallStraight', 30, 'ruling D'],
    [[3, 1, 2, 4, 6], 'smallStraight', 30, 'unordered (ruling D)'],
    [[1, 2, 3, 4, 5], 'smallStraight', 30, 'large also satisfies small (ruling C)'],
    [[1, 2, 3, 4, 5], 'largeStraight', 40, ''],
    [[2, 3, 4, 5, 6], 'largeStraight', 40, ''],
    [[4, 4, 4, 4, 4], 'fiveOfAKind', 50, ''],
    [[1, 3, 2, 6, 5], 'chance', 17, 'always legal'],
    [[6, 6, 6, 6, 6], 'chance', 30, ''],
  ];

  it.each(cases)('%j in %s = %i %s', (dice, category, expected) => {
    expect(scoreFor(category, dice, OPEN)).toBe(expected);
  });
});

describe('§7.3 lower section — zero cases', () => {
  const cases: Array<[Dice, Category, number, string]> = [
    [[5, 5, 2, 3, 1], 'threeOfAKind', 0, 'only a pair'],
    [[5, 5, 5, 3, 1], 'fourOfAKind', 0, 'only three'],
    [[3, 3, 4, 4, 5], 'fullHouse', 0, 'two pairs, not a full house'],
    [[3, 3, 3, 3, 4], 'fullHouse', 0, '4+1 is not 3+2'],
    [[3, 3, 3, 3, 3], 'fullHouse', 0, 'ordinary turn — ruling E'],
    [[1, 2, 3, 5, 6], 'smallStraight', 0, 'gap at 4'],
    [[1, 2, 3, 4, 6], 'largeStraight', 0, 'not five consecutive'],
    [[1, 1, 1, 1, 2], 'fiveOfAKind', 0, ''],
  ];

  it.each(cases)('%j in %s = %i %s', (dice, category, expected) => {
    expect(scoreFor(category, dice, OPEN)).toBe(expected);
  });
});

describe('§7.4 upper bonus boundary', () => {
  const at = (subtotal: number): Scorecard => {
    switch (subtotal) {
      case 62:
        return card({ ones: 2, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 });
      case 63:
        return card({ ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 });
      case 64:
        return card({ ones: 4, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 });
      case 105:
        return card({ ones: 5, twos: 10, threes: 15, fours: 20, fives: 25, sixes: 30 });
      default:
        return card({ ones: 0, twos: 0, threes: 0, fours: 0, fives: 0, sixes: 0 });
    }
  };

  it.each([
    [62, 0],
    [63, 35],
    [64, 35],
    [0, 0],
    [105, 35],
  ])('subtotal %i → bonus %i', (subtotal, expected) => {
    const scorecard = at(subtotal);
    expect(upperSubtotal(scorecard)).toBe(subtotal);
    expect(upperBonus(scorecard)).toBe(expected);
  });
});

describe('§7.5 wild rules — precedence branches', () => {
  const WILD: Dice = [4, 4, 4, 4, 4];

  it('step 1 — matching upper box open forces it', () => {
    const scorecard = onlyOpen(50, ['fours', 'chance', 'fullHouse']);
    expect(isWildTurn(WILD, scorecard)).toBe(true);
    expect(earnsBonus(WILD, scorecard)).toBe(true);
    expect(legalCategories(WILD, scorecard)).toEqual(['fours']);
  });

  it('step 2 — matching upper filled, any open lower', () => {
    const scorecard = onlyOpen(50, ['chance', 'fullHouse', 'largeStraight']);
    expect(earnsBonus(WILD, scorecard)).toBe(true);
    expect(sorted(legalCategories(WILD, scorecard))).toEqual(
      sorted(['chance', 'fullHouse', 'largeStraight']),
    );
  });

  it('step 3 — nothing lower open, forced zero in the upper section', () => {
    const scorecard = onlyOpen(50, ['ones', 'twos']);
    expect(earnsBonus(WILD, scorecard)).toBe(true);
    expect(sorted(legalCategories(WILD, scorecard))).toEqual(sorted(['ones', 'twos']));
    expect(scoreFor('ones', WILD, scorecard)).toBe(0);
    expect(scoreFor('twos', WILD, scorecard)).toBe(0);
  });

  it('step 1 with a scratched five of a kind — no bonus', () => {
    const scorecard = onlyOpen(0, ['fours', 'chance']);
    expect(isWildTurn(WILD, scorecard)).toBe(true);
    expect(earnsBonus(WILD, scorecard)).toBe(false);
    expect(legalCategories(WILD, scorecard)).toEqual(['fours']);
  });

  it('step 2 with a scratched five of a kind — no bonus', () => {
    const scorecard = onlyOpen(0, ['chance', 'smallStraight']);
    expect(earnsBonus(WILD, scorecard)).toBe(false);
    expect(sorted(legalCategories(WILD, scorecard))).toEqual(sorted(['chance', 'smallStraight']));
  });

  describe('scores within a wild turn', () => {
    const scorecard = card({ fiveOfAKind: 50 });
    const cases: Array<[Category, number, string]> = [
      ['fours', 20, 'step 1: 5 × 4'],
      ['fullHouse', 25, 'wild override — contrast §7.3 (ruling E)'],
      ['smallStraight', 30, 'wild override'],
      ['largeStraight', 40, 'wild override'],
      ['threeOfAKind', 20, 'sum of all five'],
      ['chance', 20, ''],
      ['ones', 0, 'step 3 forced zero'],
    ];

    it.each(cases)('[4,4,4,4,4] in %s = %i %s', (category, expected) => {
      expect(scoreFor(category, WILD, scorecard)).toBe(expected);
    });
  });
});

describe('§7.6 not-a-wild-turn control (ruling F)', () => {
  it('five of a kind while the box is open is an ordinary turn', () => {
    const dice: Dice = [4, 4, 4, 4, 4];
    expect(isWildTurn(dice, OPEN)).toBe(false);
    expect(earnsBonus(dice, OPEN)).toBe(false);
    expect(sorted(legalCategories(dice, OPEN))).toEqual(sorted([...ALL_CATEGORIES]));
  });

  it('four of a kind with the box filled is an ordinary turn', () => {
    const dice: Dice = [4, 4, 4, 4, 3];
    const scorecard = card({ fiveOfAKind: 50 });
    expect(isWildTurn(dice, scorecard)).toBe(false);
    expect(sorted(legalCategories(dice, scorecard))).toEqual(
      sorted(ALL_CATEGORIES.filter((c) => c !== 'fiveOfAKind')),
    );
  });
});

describe('§7.7 coverage — remaining upper scoring and zero cases', () => {
  it.each([
    [[3, 3, 3, 1, 2] as Dice, 'threes' as Category, 9],
    [[2, 2, 4, 4, 6] as Dice, 'ones' as Category, 0],
    [[1, 1, 3, 4, 5] as Dice, 'twos' as Category, 0],
    [[1, 2, 3, 5, 6] as Dice, 'fours' as Category, 0],
    [[1, 2, 3, 4, 6] as Dice, 'fives' as Category, 0],
    [[1, 2, 3, 4, 5] as Dice, 'sixes' as Category, 0],
  ])('%j in %s = %i', (dice, category, expected) => {
    expect(scoreFor(category, dice, OPEN)).toBe(expected);
  });

  it('chance has no zero case — five dice always sum to at least 5', () => {
    expect(scoreFor('chance', [1, 1, 1, 1, 1], OPEN)).toBe(5);
  });
});

describe('§3.4 grand total', () => {
  it('sums upper, bonus, lower and wild bonuses', () => {
    const scorecard = card(
      {
        ones: 3,
        twos: 6,
        threes: 9,
        fours: 12,
        fives: 15,
        sixes: 18, // 63 → +35
        threeOfAKind: 22,
        fourOfAKind: 0,
        fullHouse: 25,
        smallStraight: 30,
        largeStraight: 40,
        fiveOfAKind: 50,
        chance: 21,
      },
      2,
    );
    expect(upperSubtotal(scorecard)).toBe(63);
    expect(upperBonus(scorecard)).toBe(35);
    expect(lowerTotal(scorecard)).toBe(188);
    expect(bonusPoints(scorecard)).toBe(200);
    expect(grandTotal(scorecard)).toBe(63 + 35 + 188 + 200);
  });

  it('treats open categories as 0 without conflating them (ruling I)', () => {
    expect(grandTotal(OPEN)).toBe(0);
    expect(OPEN.scores.chance).toBeNull();
  });
});

describe('roll', () => {
  const dice: Dice = [1, 2, 3, 4, 5];

  it('leaves held dice untouched and rerolls the rest', () => {
    const rng = () => 5 / 6; // → face 6
    expect(roll(dice, [true, false, true, false, true], rng)).toEqual([1, 6, 3, 6, 5]);
  });

  it('maps rng output across the full 1–6 range', () => {
    const values = [0, 0.17, 0.34, 0.5, 0.67, 0.99, 0.999999];
    const faces = values.map((v) => roll(dice, [], () => v)[0]);
    expect(faces).toEqual([1, 2, 3, 4, 5, 6, 6]);
  });

  it('rerolls nothing when everything is held', () => {
    expect(roll(dice, [true, true, true, true, true], () => 0)).toEqual(dice);
  });
});
