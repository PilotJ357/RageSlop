import type { CSSProperties } from 'react';
import type { DieValue } from '../game/types';
import { color } from './theme';

/** Pip positions on a 3×3 grid, transcribed from the design file. */
const PATTERNS: Record<DieValue, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

interface DieProps {
  value: DieValue;
  held: boolean;
  /** True before the turn's first roll — the face renders empty. */
  blank: boolean;
  rolling: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export function Die({ value, held, blank, rolling, disabled, onToggle }: DieProps) {
  const pips = blank ? [] : PATTERNS[value];
  const pipColor = held ? color.heldInk : color.ink;

  const face: CSSProperties = {
    width: 46,
    height: 46,
    border: `2px solid ${held ? color.heldBorder : color.dieBorder}`,
    borderRadius: 4,
    background: held
      ? 'linear-gradient(180deg,#fff7d6 0%,#ffe27a 45%,#f0b429 100%)'
      : 'linear-gradient(180deg,#fff 0%,#dbeeff 100%)',
    boxShadow: '1px 1px 0 #7a9cc0',
    display: 'grid',
    gridTemplateColumns: 'repeat(3,1fr)',
    gridTemplateRows: 'repeat(3,1fr)',
    // Gap keeps adjacent pips from fusing into a bar on 6 (and the columns of 4/5).
    gap: 3,
    padding: 6,
    boxSizing: 'border-box',
    ...(rolling ? { animation: 'dieFlip .38s ease' } : {}),
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={held}
      aria-label={`Die showing ${blank ? 'nothing' : value}${held ? ', held' : ''}`}
      style={{
        appearance: 'none',
        background: 'none',
        border: 'none',
        padding: 0,
        font: 'inherit',
        cursor: disabled ? 'default' : 'pointer',
        userSelect: 'none',
      }}
    >
      <div style={face}>
        {CELLS.map((cell) => (
          <span
            key={cell}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              borderRadius: '50%',
              background: pips.includes(cell) ? pipColor : 'transparent',
            }}
          />
        ))}
      </div>
      <div
        style={{
          textAlign: 'center',
          fontSize: 9,
          fontWeight: 700,
          color: color.heldLabel,
          marginTop: 3,
          height: 10,
        }}
      >
        {held ? 'Held' : ''}
      </div>
    </button>
  );
}
