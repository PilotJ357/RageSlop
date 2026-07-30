import { useRef } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
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
  // Holds run off the pointer sequence instead of `click`, because a click is the least
  // reliable way to hear about a tap: the browser drops it when press and release land on
  // different elements (a fingertip or mouse drifting a few pixels), and it withholds it
  // while deciding whether a quick second tap is a double-tap zoom. Tapping fast hits both
  // cases, which is why holds felt like they went missing.
  const pointerDown = useRef(false);
  const swallowClick = useRef(false);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    // Secondary mouse buttons never activate a button.
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerDown.current = true;
    swallowClick.current = true;
    // Capturing retargets the release to this die even if the pointer has drifted off it.
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  // Guarding on `pointerDown` also collapses multi-touch: a second finger on the same die
  // finds the flag already cleared and toggles nothing.
  const handlePointerUp = () => {
    if (!pointerDown.current) return;
    pointerDown.current = false;
    onToggle();
  };

  // The browser cancels the sequence once it claims the gesture for a scroll or a pinch.
  // That is a page scroll the player happened to start on a die, not a hold.
  const handlePointerCancel = () => {
    pointerDown.current = false;
  };

  // Enter/Space arrive as a click with no pointer sequence behind it, so clear the guard
  // first — otherwise a keyboard press could be eaten by a stale flag.
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') swallowClick.current = false;
  };

  const handleClick = () => {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    onToggle();
  };

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
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={held}
      aria-label={`Die showing ${blank ? 'nothing' : value}${held ? ', held' : ''}`}
      style={{
        appearance: 'none',
        background: 'none',
        border: 'none',
        // The padding is the gap between faces, so the tap target covers the whole space a
        // die occupies rather than just its 46px face.
        padding: 3,
        font: 'inherit',
        cursor: disabled ? 'default' : 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // Opts out of double-tap-to-zoom, which is what makes a browser sit on a tap.
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
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
