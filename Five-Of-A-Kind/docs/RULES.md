# Five of a Kind — Rules & Scoring Specification

> **Status:** authoritative. This document is the source of truth for game logic. Where the UI and this document disagree, this document wins. Where the code and this document disagree, it's a bug in the code.

This game is based on the traditional five-dice scoring game commonly known as Yahtzee (a Hasbro trademark, not used in this project). All terminology here is generic; the 50-point all-matching category is called **Five of a Kind**.

**Scope:** local solo play — one player, one scorecard, thirteen rounds. Multiplayer, AI opponents, and persistence are out of scope for this spec.

---

## 1. Overview

The player rolls five dice, up to three times per turn, keeping the dice they like and rerolling the rest. At the end of each turn they commit their dice to exactly one of thirteen scoring categories. Each category may be used only once.

After thirteen turns every category is filled and the game ends. The player's score is the grand total (§3.4). There is no opponent and no failure state — a game always completes.

---

## 2. Turn structure

A turn proceeds as follows:

1. **Roll 1** — all five dice are rolled. Mandatory; a turn cannot be taken without at least one roll.
2. **Hold / release** — the player marks any subset of the five dice (0 to 5) as held.
3. **Roll 2** — all non-held dice are rerolled. Optional.
4. **Hold / release** — the held set may be freely revised. A die held after roll 1 may be released before roll 3, and a die previously rerolled may now be held.
5. **Roll 3** — all non-held dice are rerolled. Optional.
6. **Commit** — the player selects one open category and scores the current dice into it.

Rules that follow from this:

- **Maximum three rolls per turn.** No exceptions, no extra rolls from any source.
- **The player may stop early.** Committing after roll 1 or roll 2 is legal at any time.
- **Holds are not sticky across rolls.** The held set is re-chosen from scratch before each reroll; there is no notion of a die being "locked".
- **Every turn ends with exactly one category committed.** The player cannot skip a turn, bank dice, or carry dice into the next turn.
- **Dice are unordered.** `[3,1,3,5,3]` and `[3,3,3,5,1]` are the same hand for all scoring purposes.
- Thirteen turns are played. The game ends when all thirteen categories are filled.

---

## 3. Scoring

The scorecard has an **upper section** of six categories and a **lower section** of seven categories — thirteen in total.

### 3.1 Upper section

Each upper category scores **the sum of the dice showing that face, and only that face.** Dice showing other faces contribute nothing.

| Category | Score |
|---|---|
| Ones | 1 × (count of 1s) |
| Twos | 2 × (count of 2s) |
| Threes | 3 × (count of 3s) |
| Fours | 4 × (count of 4s) |
| Fives | 5 × (count of 5s) |
| Sixes | 6 × (count of 6s) |

Example: `[4,4,1,4,6]` scores **12** in Fours, **1** in Ones, **6** in Sixes, and **0** in Twos, Threes, and Fives.

### 3.2 Upper bonus

**If the six upper categories total 63 or more, add a bonus of 35 points.** Below 63, the bonus is 0. There is no partial bonus.

63 is the threshold because it is what three of each face yields (3+6+9+12+15+18). The bonus is a property of the final upper subtotal; a UI may display progress toward it live, but only the end-of-game subtotal determines whether it is awarded.

### 3.3 Lower section

| Category | Requirement | Score |
|---|---|---|
| Three of a Kind | at least 3 dice share a face | **sum of all five dice** |
| Four of a Kind | at least 4 dice share a face | **sum of all five dice** |
| Full House | 3 of one face **and** 2 of a different face | **25** (fixed) |
| Small Straight | 4 consecutive distinct faces present | **30** (fixed) |
| Large Straight | 5 consecutive faces: `1-2-3-4-5` or `2-3-4-5-6` | **40** (fixed) |
| Five of a Kind | all five dice share a face | **50** |
| Chance | none — any five dice | **sum of all five dice** |

If the requirement is not met, the category scores **0**.

Note the two shapes of lower-section scoring: Three of a Kind, Four of a Kind, and Chance are **sum-based** (the score depends on the dice); Full House, Small Straight, Large Straight, and Five of a Kind are **fixed-value** (the score is the same for any qualifying hand).

The three qualifying straights for Small Straight are `1-2-3-4`, `2-3-4-5`, and `3-4-5-6`.

### 3.4 Grand total

```
upperSubtotal  = sum of the six upper categories
upperBonus     = 35 if upperSubtotal >= 63, else 0
lowerTotal     = sum of the seven lower categories
bonusPoints    = 100 × bonusCount        (see §4)

grandTotal     = upperSubtotal + upperBonus + lowerTotal + bonusPoints
```

---

## 4. Bonus Five of a Kind and Wild Rules

This section governs what happens when the player rolls five matching dice **after the Five of a Kind category has already been filled**. It is the most error-prone part of the game; implement it exactly as written.

### 4.1 When this section applies

Wild Rules apply when **all three** of the following hold:

1. The current dice are five of a kind, **and**
2. The Five of a Kind category is **already filled** — with either 50 or 0, **and**
3. The player is committing this turn.

If the Five of a Kind category is still **open**, this section does not apply. The turn is ordinary: the player has free choice of any open category (and would normally take the 50). See §5, ruling F.

### 4.2 The 100-point bonus

**If the Five of a Kind category holds 50, award +100 bonus points.** Increment `bonusCount` by one. Each additional five-of-a-kind rolled in the same game awards another 100; there is no cap.

**If the Five of a Kind category holds 0, award nothing.** The player forfeited the bonus when they scratched the category.

The bonus is awarded *in addition to* whatever the dice score in the category chosen below — it does not replace it.

### 4.3 Wild placement precedence — strict

The player does **not** have free choice of category on a wild turn. Placement is forced in this order:

**Step 1 — matching upper box.**
If the upper category matching the rolled face is open (all 4s → Fours, all 6s → Sixes, and so on), the player **must** score there. The score is the sum of all five dice — i.e. 5 × face.

**Step 2 — any open lower box.**
Otherwise, if any lower category is open, the player **must** score in one of them. Which one is the player's choice, but it must be a lower category. On a wild turn the dice act as a joker and satisfy every lower category regardless of their actual shape:

| Category | Score on a wild turn |
|---|---|
| Three of a Kind | sum of all five dice |
| Four of a Kind | sum of all five dice |
| Full House | **25** |
| Small Straight | **30** |
| Large Straight | **40** |
| Chance | sum of all five dice |

(Five of a Kind is by definition already filled, or §4.1 would not apply.)

**Step 3 — forced zero in the upper section.**
Otherwise — the matching upper box is filled and every lower category is filled — the player **must** enter **0** in any open upper category. Which one is the player's choice.

These steps are exhaustive and mutually exclusive. Exactly one applies to any wild turn.

### 4.4 Worked examples

| Situation | Result |
|---|---|
| Roll `[4,4,4,4,4]`; Five of a Kind = 50; Fours open | +100 bonus. Must score 20 in Fours. |
| Roll `[4,4,4,4,4]`; Five of a Kind = 50; Fours filled; Large Straight open | +100 bonus. May score 40 in Large Straight (step 2). |
| Roll `[4,4,4,4,4]`; Five of a Kind = 0; Fours filled; Full House open | **No bonus.** Must still score in a lower box — Full House for 25 (step 2). |
| Roll `[4,4,4,4,4]`; Five of a Kind = 50; Fours filled; all lower filled; Ones open | +100 bonus. Must enter 0 in Ones (step 3). |
| Roll `[4,4,4,4,4]`; Five of a Kind **open** | Not a wild turn. Free choice — normally 50 in Five of a Kind. |

---

## 5. Edge-case adjudications

Decided rulings. Each of these is a real fork where implementations commonly diverge; treat any deviation as a bug, not a preference.

**A. Three of a Kind and Four of a Kind score the sum of *all five* dice.**
Not the sum of the matching dice only. `[5,5,5,2,1]` scores **18** in Three of a Kind, not 15. This is the single most common implementation error.

**B. Five of a kind satisfies Three of a Kind and Four of a Kind.**
Five matching dice trivially contain three matching and four matching. `[6,6,6,6,6]` scores 30 in either.

**C. A large straight also satisfies Small Straight.**
`[1,2,3,4,5]` contains `1-2-3-4`, so it scores **30** in Small Straight. Never 0.

**D. Small Straight tolerates duplicates and gaps outside the run.**
The requirement is that four consecutive distinct faces are *present*, not that the hand is exactly a run. `[1,2,3,4,4]`, `[2,3,4,5,5]`, and `[3,1,2,4,6]` all qualify for 30.

**E. Five of a kind is NOT a Full House under normal rules — but IS worth 25 under Wild Rules.**
Full House requires 3 of one face and 2 of a *different* face, so `[3,3,3,3,3]` scores **0** in Full House on an ordinary turn. On a wild turn (§4.3 step 2) the same dice score **25**. This pair looks like a contradiction and will be "fixed" as a bug if you don't know it's deliberate. It is deliberate: the wild rules override the shape requirement, ordinary rules do not.

**F. Rolling five of a kind while the Five of a Kind box is open is an ordinary turn.**
No bonus, no forced placement, free choice of any open category. The player is permitted to score those dice elsewhere (in Sixes, in Chance, anywhere) — it is usually a bad idea, but it is legal.

**G. The player may voluntarily score 0 in any open category.**
Scratching is always available, on any turn, in any open category, regardless of what the dice show. A player holding `[1,1,1,1,2]` may score 0 into Large Straight rather than waste a better category.

**H. The player is never stuck.**
At least one category is always open before the thirteenth commit, and every category accepts any dice — for a real score if the requirement is met, for 0 otherwise. There is no dead end and no pass.

**I. `null` and `0` are different scorecard states.**
`null` means the category is open and still playable. `0` means it has been used and scored zero. They must not be conflated; the difference drives both legality checks and the end-of-game condition.

---

## 6. Type contracts

These types are the intended shape of the engine. Lift them into `src/game/types.ts` at implementation time.

```ts
export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

/** Exactly five dice. Order is not meaningful. */
export type Dice = readonly [DieValue, DieValue, DieValue, DieValue, DieValue];

export type UpperCategory =
  | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes';

export type LowerCategory =
  | 'threeOfAKind' | 'fourOfAKind' | 'fullHouse'
  | 'smallStraight' | 'largeStraight' | 'fiveOfAKind' | 'chance';

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

export interface GameState {
  readonly dice: Dice;
  /** Parallel to `dice`; true = held, not rerolled. */
  readonly held: readonly [boolean, boolean, boolean, boolean, boolean];
  readonly rollsUsed: 0 | 1 | 2 | 3;
  /** 1..13 */
  readonly round: number;
  readonly scorecard: Scorecard;
  readonly phase: TurnPhase;
}
```

### 6.1 Function contracts

```ts
/**
 * Score `dice` in `category`, given the current scorecard.
 * The scorecard is required because wild rules (§4.3) change the value of
 * fullHouse / smallStraight / largeStraight for non-qualifying dice.
 * Returns 0 for a non-qualifying, non-wild hand. Does not mutate.
 */
export function scoreFor(
  category: Category, dice: Dice, scorecard: Scorecard,
): number;

/**
 * The categories the player is permitted to commit to this turn.
 * On an ordinary turn: every open category.
 * On a wild turn (§4.1): exactly the set allowed by the §4.3 step that applies.
 * Never returns an empty array while the game is in progress (ruling H).
 * The UI disables every category not in this set.
 */
export function legalCategories(dice: Dice, scorecard: Scorecard): Category[];

/** True when §4.1 applies — five of a kind AND the category already filled. */
export function isWildTurn(dice: Dice, scorecard: Scorecard): boolean;

/** True when a wild turn also earns +100 — i.e. fiveOfAKind holds exactly 50. */
export function earnsBonus(dice: Dice, scorecard: Scorecard): boolean;

export function upperSubtotal(scorecard: Scorecard): number;
export function upperBonus(scorecard: Scorecard): number;   // 35 or 0
export function lowerTotal(scorecard: Scorecard): number;
export function grandTotal(scorecard: Scorecard): number;

/**
 * Reroll every die not marked held.
 * `rng` is injected so scoring and turn logic are deterministically testable.
 */
export function roll(dice: Dice, held: readonly boolean[], rng: () => number): Dice;
```

**Design notes.**
`scoreFor` takes the scorecard rather than a boolean `isWild` flag so that callers cannot get the wild determination wrong independently of the scorer. `legalCategories` is the only place the §4.3 precedence chain is implemented — the UI must not re-derive it. `roll` takes an injected `rng` so every test below is reproducible.

---

## 7. Test vectors

Table-driven cases, ready to become `src/game/scoring.test.ts`. All expected values below are hand-computed from §3.

### 7.1 Upper section

| Dice | Category | Expected | Note |
|---|---|---|---|
| `[1,1,3,4,1]` | ones | 3 | three 1s |
| `[2,2,2,2,2]` | twos | 10 | |
| `[6,6,6,5,5]` | threes | 0 | no 3s |
| `[4,4,1,4,6]` | fours | 12 | other faces ignored |
| `[5,3,5,2,5]` | fives | 15 | |
| `[6,6,6,6,6]` | sixes | 30 | |

### 7.2 Lower section — qualifying

| Dice | Category | Expected | Note |
|---|---|---|---|
| `[5,5,5,2,1]` | threeOfAKind | 18 | **sum of all five** (ruling A) |
| `[6,6,6,6,6]` | threeOfAKind | 30 | five satisfies three (ruling B) |
| `[2,2,2,2,6]` | fourOfAKind | 14 | sum of all five |
| `[3,3,3,3,3]` | fourOfAKind | 15 | five satisfies four (ruling B) |
| `[3,3,3,5,5]` | fullHouse | 25 | fixed |
| `[1,2,3,4,6]` | smallStraight | 30 | `1-2-3-4` |
| `[1,2,3,4,4]` | smallStraight | 30 | duplicate outside run (ruling D) |
| `[2,3,4,5,5]` | smallStraight | 30 | ruling D |
| `[3,1,2,4,6]` | smallStraight | 30 | unordered (ruling D) |
| `[1,2,3,4,5]` | smallStraight | 30 | large also satisfies small (ruling C) |
| `[1,2,3,4,5]` | largeStraight | 40 | |
| `[2,3,4,5,6]` | largeStraight | 40 | |
| `[4,4,4,4,4]` | fiveOfAKind | 50 | |
| `[1,3,2,6,5]` | chance | 17 | always legal |
| `[6,6,6,6,6]` | chance | 30 | |

### 7.3 Lower section — zero cases

| Dice | Category | Expected | Note |
|---|---|---|---|
| `[5,5,2,3,1]` | threeOfAKind | 0 | only a pair |
| `[5,5,5,3,1]` | fourOfAKind | 0 | only three |
| `[3,3,4,4,5]` | fullHouse | 0 | two pairs, not a full house |
| `[3,3,3,3,4]` | fullHouse | 0 | 4+1 is not 3+2 |
| `[3,3,3,3,3]` | fullHouse | 0 | **ordinary turn** — ruling E |
| `[1,2,3,5,6]` | smallStraight | 0 | gap at 4 |
| `[1,2,3,4,6]` | largeStraight | 0 | not five consecutive |
| `[1,1,1,1,2]` | fiveOfAKind | 0 | |

### 7.4 Upper bonus boundary

| Upper subtotal | `upperBonus` | Note |
|---|---|---|
| 62 | 0 | just under |
| 63 | 35 | threshold is inclusive |
| 64 | 35 | |
| 0 | 0 | |
| 105 | 35 | max upper; bonus does not scale |

### 7.5 Wild rules — all three precedence branches

Dice are `[4,4,4,4,4]` throughout. `fiveOfAKind` is filled in every case (§4.1).

| `fiveOfAKind` | Open categories | `earnsBonus` | `legalCategories` | Branch |
|---|---|---|---|---|
| 50 | fours, chance, fullHouse | true | `['fours']` only | §4.3 step 1 |
| 50 | chance, fullHouse, largeStraight | true | all three lower | §4.3 step 2 |
| 50 | ones, twos (no lower open) | true | `['ones','twos']`, score **0** | §4.3 step 3 |
| 0 | fours, chance | **false** | `['fours']` only | step 1, no bonus |
| 0 | chance, smallStraight | **false** | both lower | step 2, no bonus |

Scores within a wild turn:

| Dice | Category | Expected | Note |
|---|---|---|---|
| `[4,4,4,4,4]` | fours | 20 | step 1: 5 × 4 |
| `[4,4,4,4,4]` | fullHouse | **25** | wild override — contrast §7.3 (ruling E) |
| `[4,4,4,4,4]` | smallStraight | **30** | wild override |
| `[4,4,4,4,4]` | largeStraight | **40** | wild override |
| `[4,4,4,4,4]` | threeOfAKind | 20 | sum of all five |
| `[4,4,4,4,4]` | chance | 20 | |
| `[4,4,4,4,4]` | ones | 0 | step 3 forced zero |

### 7.6 Not-a-wild-turn control (ruling F)

| Dice | `fiveOfAKind` state | `isWildTurn` | `legalCategories` |
|---|---|---|---|
| `[4,4,4,4,4]` | `null` (open) | **false** | every open category |
| `[4,4,4,4,3]` | 50 | **false** | every open category |

### 7.7 Coverage requirements

The suite is complete when:

- Every one of the thirteen categories has at least one scoring case and one zero case.
- All three §4.3 precedence branches are exercised.
- Bonus is tested with `fiveOfAKind` at both 50 and 0.
- The ruling-E contradiction pair — `[3,3,3,3,3]` in Full House scoring 0 ordinarily and `[4,4,4,4,4]` in Full House scoring 25 while wild — both appear.
- The upper bonus is tested at 62, 63, and 64.

---

## 8. Sources

- [Yahtzee — Wikipedia](https://en.wikipedia.org/wiki/Yahtzee)
- [Official rules (PDF) — Winning Moves](https://winning-moves.com/images/YAHTZEERULES_2022.pdf)
- [Hasbro official support: scoring a second Yahtzee](https://hasbro-new.custhelp.com/app/answers/detail_uk/a_id/211)
- [Bonus and Joker rules breakdown](https://www.yahtzeemanifesto.com/blog/yahtzee-bonus-rules.php)
