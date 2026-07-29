/** Style constants transcribed from the Yahtzee.dc.html design file. */

import type { CSSProperties } from 'react';

export const color = {
  desktop: '#ece9d8',
  ink: '#0a246a',
  accent: '#1349b8',
  accentSoft: '#e6f0fb',
  accentBorder: '#b8d0ec',
  panelBorder: '#8ba7c7',
  hairline: '#e2e2da',
  muted: '#8a8a80',
  /** Spent scorecard box — XP's disabled-control beige. */
  doneFill: '#dedcce',
  doneInk: '#6f6d62',
  dieBorder: '#6a8caf',
  heldBorder: '#c9a24a',
  heldInk: '#7d5411',
  heldLabel: '#a06f24',
} as const;

export const titleBar: CSSProperties = {
  background:
    'linear-gradient(180deg,#3b8cf0 0%,#1a5fd6 8%,#1349b8 50%,#0a3a9e 92%,#08307e 100%)',
  padding: '8px 10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

export const titleBarText: CSSProperties = {
  color: '#fff',
  font: '700 14px Tahoma',
  textShadow: '0 1px 1px rgba(0,0,0,.4)',
};

export const chromeButton = (variant: 'blue' | 'red'): CSSProperties => ({
  width: 18,
  height: 16,
  background:
    variant === 'blue'
      ? 'linear-gradient(180deg,#5aa7f5,#1a5fd6)'
      : 'linear-gradient(180deg,#f56a6a,#c81c1c)',
  border: `1px solid ${variant === 'blue' ? color.ink : '#6a0a0a'}`,
  borderRadius: 2,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.5)',
});

export const greyButton: CSSProperties = {
  font: '700 12px Tahoma',
  color: color.ink,
  background: 'linear-gradient(180deg,#fefefe,#dcdccb)',
  border: '1px solid #716f64',
  borderRadius: 3,
  padding: '10px 12px',
  minHeight: 36,
  cursor: 'pointer',
  boxShadow: '1px 1px 0 rgba(0,0,0,.15)',
};

export const greenButton: CSSProperties = {
  width: '100%',
  font: '700 13px Tahoma',
  color: '#fff',
  background: 'linear-gradient(180deg,#8fd35a 0%,#4a9420 100%)',
  border: '1px solid #2e6b10',
  borderRadius: 3,
  padding: 8,
  cursor: 'pointer',
  boxShadow: '1px 1px 0 rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.5)',
};

export const disabledButton: CSSProperties = {
  width: '100%',
  font: '700 13px Tahoma',
  color: color.muted,
  background: 'linear-gradient(180deg,#f2f2ea,#e0e0d6)',
  border: '1px solid #b8b8ac',
  borderRadius: 3,
  padding: 8,
  cursor: 'not-allowed',
};

export const panel: CSSProperties = {
  background: '#fff',
  border: `1px solid ${color.panelBorder}`,
  borderRadius: 4,
  overflow: 'hidden',
};

export const panelHeader: CSSProperties = {
  background: 'linear-gradient(180deg,#5aa7f5,#1349b8)',
  color: '#fff',
  font: '700 12px Tahoma',
  padding: '6px 12px',
  textShadow: '0 1px 1px rgba(0,0,0,.3)',
};
