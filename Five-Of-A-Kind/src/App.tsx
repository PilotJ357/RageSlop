import { useEffect, useRef, useState } from 'react';
import {
  canCommit,
  canRoll,
  commit,
  newGame,
  rerollIndices,
  rollDice,
  rollsLeft,
  toggleHold,
} from './game/game';
import {
  earnsBonus,
  fiveOfAKindFace,
  grandTotal,
  isOpen,
  isWildTurn,
  upperCategoryForFace,
} from './game/scoring';
import { LOWER_CATEGORIES, TOTAL_ROUNDS, type Category, type GameState } from './game/types';
import { appendScore, loadHistory, type HistoryEntry } from './history';
import { clearGame, loadGame, saveGame } from './game/persistence';
import { Die } from './ui/Die';
import { Scorecard } from './ui/Scorecard';
import { StatsDialog } from './ui/StatsDialog';
import {
  chromeButton,
  color,
  disabledButton,
  greenButton,
  greyButton,
  panel,
  titleBar,
  titleBarText,
} from './ui/theme';

const ROLL_ANIMATION_MS = 380;

/** Explains the §4.3 branch the player is being forced down, so the disabled rows make sense. */
function wildNotice(state: GameState): string | null {
  const { dice, scorecard } = state;
  if (!canCommit(state) || !isWildTurn(dice, scorecard)) return null;

  const face = fiveOfAKindFace(dice);
  if (face === null) return null;

  const bonus = earnsBonus(dice, scorecard)
    ? '+100 bonus.'
    : 'No bonus — Five of a Kind was scratched.';

  const matchingUpper = upperCategoryForFace(face);
  if (isOpen(scorecard, matchingUpper)) {
    return `Wild ${face}s! ${bonus} You must score in the matching upper box.`;
  }
  if (LOWER_CATEGORIES.some((category) => isOpen(scorecard, category))) {
    return `Wild ${face}s! ${bonus} The matching upper box is filled — take any open lower box; it scores as a joker.`;
  }
  return `Wild ${face}s! ${bonus} Nothing left below — you must take a zero in an open upper box.`;
}

export function App() {
  const [state, setState] = useState<GameState>(() => loadGame() ?? newGame());
  const [rollingIndices, setRollingIndices] = useState<readonly number[]>([]);
  const [statsOpen, setStatsOpen] = useState(false);
  const [history, setHistory] = useState<readonly HistoryEntry[]>([]);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setHistory(loadHistory());
    return () => clearTimeout(animationTimer.current);
  }, []);

  useEffect(() => { saveGame(state); }, [state]);

  // Handlers stay outside the state updaters: an updater must be pure, and StrictMode
  // double-invokes it — a reroll or a localStorage write in there would run twice.
  const handleRoll = () => {
    if (!canRoll(state)) return;
    setRollingIndices(rerollIndices(state));
    clearTimeout(animationTimer.current);
    animationTimer.current = setTimeout(() => setRollingIndices([]), ROLL_ANIMATION_MS);
    setState(rollDice(state));
  };

  // `toggleHold` is pure, so it can read the queued state rather than this render's copy —
  // taps that land faster than a re-render then stack instead of overwriting each other.
  const handleToggleHold = (index: number) => {
    setState((current) => toggleHold(current, index));
  };

  const handleCommit = (category: Category) => {
    const next = commit(state, category);
    if (next === state) return;
    setState(next);
    if (next.phase === 'gameOver') {
      setHistory(appendScore(history, grandTotal(next.scorecard)));
    }
  };

  const handleNewGame = () => {
    clearTimeout(animationTimer.current);
    clearGame();
    setRollingIndices([]);
    setState(newGame());
  };

  const gameOver = state.phase === 'gameOver';
  const remaining = rollsLeft(state);
  const rollDisabled = !canRoll(state);
  const notice = wildNotice(state);

  return (
    <div
      style={{
        background: color.desktop,
        color: color.ink,
        minHeight: '100vh',
        fontFamily: 'Tahoma,Verdana,Arial,sans-serif',
        padding: 12,
      }}
    >
      <div
        style={{
          maxWidth: 430,
          margin: '0 auto',
          border: `2px solid ${color.ink}`,
          borderRadius: 7,
          overflow: 'hidden',
          boxShadow: '0 6px 18px rgba(0,0,0,.35)',
        }}
      >
        <div style={titleBar}>
          <span style={titleBarText}>FiveOfAKind.exe</span>
          <span style={{ display: 'flex', gap: 3 }}>
            <span style={chromeButton('blue')} />
            <span style={chromeButton('blue')} />
            <span style={chromeButton('red')} />
          </span>
        </div>

        <div
          style={{
            background: 'linear-gradient(180deg,#fefefe,#ece9d8)',
            borderBottom: '1px solid #8a8a8a',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span style={{ font: '700 12px Tahoma', color: color.ink }}>
            Turn {state.round} / {TOTAL_ROUNDS}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" style={greyButton} onClick={() => setStatsOpen(true)}>
              Stats
            </button>
            <button type="button" style={greyButton} onClick={handleNewGame}>
              New
            </button>
          </div>
        </div>

        <div
          style={{
            background: color.desktop,
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <Scorecard state={state} onCommit={handleCommit} />

          <div
            style={{
              ...panel,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ font: '700 13px Tahoma', color: color.ink }}>The Roll</span>
              <span
                style={{
                  font: '700 11px Tahoma',
                  color: color.accent,
                  background: color.accentSoft,
                  border: `1px solid ${color.accentBorder}`,
                  borderRadius: 9,
                  padding: '2px 9px',
                }}
              >
                {remaining} roll{remaining === 1 ? '' : 's'} left
              </span>
            </div>

            {/* No gap: each Die pads itself out to the gap width so the space between
                faces belongs to a tap target instead of falling through to the panel. */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {state.dice.map((value, index) => (
                <Die
                  key={index}
                  value={value}
                  held={state.held[index] ?? false}
                  blank={state.rollsUsed === 0}
                  rolling={rollingIndices.includes(index)}
                  disabled={state.phase !== 'awaitingCommit'}
                  onToggle={() => handleToggleHold(index)}
                />
              ))}
            </div>

            {notice && (
              <div
                style={{
                  font: '700 11px Tahoma',
                  color: '#7d5411',
                  background: '#fff7d6',
                  border: `1px solid ${color.heldBorder}`,
                  borderRadius: 3,
                  padding: '7px 9px',
                  lineHeight: 1.4,
                }}
              >
                {notice}
              </div>
            )}

            <button
              type="button"
              style={rollDisabled ? disabledButton : greenButton}
              onClick={handleRoll}
              disabled={rollDisabled}
            >
              {state.rollsUsed === 0 ? 'Roll Dice' : 'Roll Again'}
            </button>
          </div>
        </div>

        {gameOver && (
          <div
            style={{
              margin: '0 14px 14px',
              background: '#fff',
              border: `2px solid ${color.accent}`,
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(180deg,#5aa7f5,#1349b8)',
                color: '#fff',
                font: '700 13px Tahoma',
                padding: '7px 14px',
              }}
            >
              FiveOfAKind.exe
            </div>
            <div style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ font: '700 16px Tahoma', color: color.ink }}>
                Game complete — final score {grandTotal(state.scorecard)}
              </div>
              <button
                type="button"
                style={{
                  ...greenButton,
                  marginTop: 10,
                  padding: '12px 20px',
                  minHeight: 44,
                }}
                onClick={handleNewGame}
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      {statsOpen && <StatsDialog history={history} onClose={() => setStatsOpen(false)} />}
    </div>
  );
}
