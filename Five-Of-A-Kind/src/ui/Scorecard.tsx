import type React from 'react';
import type { CSSProperties } from 'react';
import {
  bonusPoints,
  grandTotal,
  legalCategories,
  scoreFor,
  upperBonus,
  upperSubtotal,
} from '../game/scoring';
import { canCommit } from '../game/game';
import {
  LOWER_CATEGORIES,
  UPPER_CATEGORIES,
  UPPER_BONUS_THRESHOLD,
  type Category,
  type GameState,
} from '../game/types';
import { color, panel, panelHeader } from './theme';

const LABELS: Record<Category, string> = {
  ones: 'Ones',
  twos: 'Twos',
  threes: 'Threes',
  fours: 'Fours',
  fives: 'Fives',
  sixes: 'Sixes',
  threeOfAKind: 'Three of a Kind',
  fourOfAKind: 'Four of a Kind',
  fullHouse: 'Full House',
  smallStraight: 'Small Straight',
  largeStraight: 'Large Straight',
  fiveOfAKind: 'Five of a Kind',
  chance: 'Chance',
};

interface Cell {
  label: string;
  /** Only the derived Bonus row carries one; scoring categories are a single line. */
  hint?: string | undefined;
  display: string;
  /** Undefined when the cell cannot be committed to right now. */
  onClick?: (() => void) | undefined;
  background: string;
  labelColor: string;
  valueColor: string;
  /** Filled categories get the sunken "already used" treatment. */
  done: boolean;
  title?: string | undefined;
}

const labelCell: CSSProperties = {
  padding: '10px 8px',
  borderBottom: `1px solid ${color.hairline}`,
};
const valueCell: CSSProperties = { ...labelCell, textAlign: 'right', width: 42 };

interface ScorecardProps {
  state: GameState;
  onCommit: (category: Category) => void;
}

export function Scorecard({ state, onCommit }: ScorecardProps) {
  const { scorecard, dice } = state;
  const committable = canCommit(state);
  const legal = committable ? new Set(legalCategories(dice, scorecard)) : new Set<Category>();

  const toCell = (category: Category): Cell => {
    const label = LABELS[category];
    const value = scorecard.scores[category];

    if (value !== null) {
      return {
        label,
        display: String(value),
        background: color.doneFill,
        labelColor: color.doneInk,
        valueColor: color.ink,
        done: true,
      };
    }
    if (!committable) {
      return {
        label,
        display: '—',
        background: '#fff',
        labelColor: color.ink,
        valueColor: color.ink,
        done: false,
      };
    }
    if (!legal.has(category)) {
      return {
        label,
        display: String(scoreFor(category, dice, scorecard)),
        background: '#f4f4ee',
        labelColor: color.muted,
        valueColor: color.muted,
        done: false,
        title: 'Blocked by the wild rules this turn',
      };
    }
    return {
      label,
      display: String(scoreFor(category, dice, scorecard)),
      onClick: () => onCommit(category),
      background: '#f3f8ff',
      labelColor: color.ink,
      valueColor: color.accent,
      done: false,
    };
  };

  const bonus = upperBonus(scorecard);
  const subtotal = upperSubtotal(scorecard);
  const upperComplete = UPPER_CATEGORIES.every((c) => scorecard.scores[c] !== null);
  const pointsToBonus = UPPER_BONUS_THRESHOLD - subtotal;

  // Show the gap to 63 while it is still reachable; once earned or lost, show the award.
  const bonusCell: Cell =
    bonus > 0
      ? {
          label: 'Bonus',
          hint: 'Earned',
          display: String(bonus),
          background: '#eaf6e2',
          labelColor: '#2e6b10',
          valueColor: '#2e6b10',
          done: false,
        }
      : upperComplete
        ? {
            label: 'Bonus',
            hint: 'Missed',
            display: '0',
            background: color.doneFill,
            labelColor: color.doneInk,
            valueColor: color.doneInk,
            done: true,
          }
        : {
            label: 'Bonus',
            hint: `to ${UPPER_BONUS_THRESHOLD}`,
            display: String(pointsToBonus),
            background: '#fff',
            labelColor: color.ink,
            valueColor: color.muted,
            done: false,
          };

  const left = [...UPPER_CATEGORIES.map(toCell), bonusCell];
  const right = LOWER_CATEGORIES.map(toCell);
  const rows = left.map((leftCell, i) => ({ left: leftCell, right: right[i] }));

  const renderPair = (cell: Cell | undefined, withDivider: boolean) => {
    if (!cell) return null;
    const clickable = Boolean(cell.onClick);
    const shared: CSSProperties = {
      background: cell.background,
      cursor: clickable ? 'pointer' : 'default',
      // Hard (unblurred) top line reads as sunken without bleeding onto the seam
      // between the label and value cells of the same row.
      ...(cell.done ? { boxShadow: 'inset 0 2px 0 rgba(10,36,106,.12)' } : {}),
    };
    // The label cell is the keyboard stop for the category; the value cell is mouse-only
    // so each row contributes a single tab stop.
    const keyboard = clickable
      ? {
          role: 'button',
          tabIndex: 0,
          'aria-label': `Score ${cell.display} in ${cell.label}`,
          onKeyDown: (event: React.KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              cell.onClick?.();
            }
          },
        }
      : {};
    return (
      <>
        <td
          {...keyboard}
          style={{
            ...labelCell,
            ...shared,
            ...(withDivider ? { borderLeft: `2px solid ${color.ink}` } : {}),
          }}
          onClick={cell.onClick}
          title={cell.title}
        >
          <div
            style={{
              font: '700 11px Tahoma',
              color: cell.labelColor,
              textTransform: 'uppercase',
              textDecoration: cell.done ? 'line-through' : 'none',
              textDecorationColor: 'rgba(10,36,106,.35)',
            }}
          >
            {cell.label}
            {cell.hint && (
              <span style={{ fontWeight: 400, fontSize: 9, color: color.muted, marginLeft: 5 }}>
                {cell.hint}
              </span>
            )}
          </div>
        </td>
        <td
          style={{
            ...valueCell,
            ...shared,
            fontWeight: 700,
            fontFamily: 'Tahoma',
            color: cell.valueColor,
          }}
          onClick={cell.onClick}
          title={cell.title}
        >
          {cell.display}
        </td>
      </>
    );
  };

  return (
    <div style={panel}>
      <div style={panelHeader}>Scorecard</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed' }}>
        <tbody>
          {rows.map((row) => (
            <tr key={row.left.label}>
              {renderPair(row.left, false)}
              {renderPair(row.right, true)}
            </tr>
          ))}
          <tr style={{ borderTop: `2px solid ${color.ink}` }}>
            <td colSpan={2} style={{ font: '700 13px Tahoma', color: color.ink, padding: 8 }}>
              Subtotal{' '}
              <span style={{ fontWeight: 400, fontSize: 10, color: color.muted }}>{subtotal}</span>
            </td>
            <td colSpan={2} style={{ textAlign: 'right', padding: 8 }}>
              <div style={{ font: '700 15px Tahoma', color: color.accent }}>
                TOTAL {grandTotal(scorecard)}
              </div>
              <div style={{ fontSize: 9, color: color.muted }}>
                Five of a Kind bonus ★{scorecard.bonusCount} = {bonusPoints(scorecard)}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
