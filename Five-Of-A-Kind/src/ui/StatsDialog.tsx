import { summarize, type HistoryEntry } from '../history';
import { color, greyButton, titleBar, titleBarText } from './theme';

interface StatsDialogProps {
  history: readonly HistoryEntry[];
  onClose: () => void;
}

export function StatsDialog({ history, onClose }: StatsDialogProps) {
  const { highScore, gamesPlayed, averageScore } = summarize(history);

  const stat = (label: string, value: number) => (
    <div>
      <div style={{ fontSize: 10, color: color.muted, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ font: '700 20px Tahoma', color: color.ink }}>{value}</div>
    </div>
  );

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.4)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 10,
      }}
    >
      <div
        role="dialog"
        aria-label="Score history"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(380px,92vw)',
          border: `2px solid ${color.ink}`,
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,.4)',
        }}
      >
        <div style={{ ...titleBar, padding: '8px 12px' }}>
          <span style={{ ...titleBarText, fontSize: 13 }}>Score History</span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 20,
              height: 18,
              padding: 0,
              background: 'linear-gradient(180deg,#f56a6a,#c81c1c)',
              border: '1px solid #6a0a0a',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          />
        </div>
        <div style={{ background: color.desktop, padding: 16 }}>
          <div style={{ display: 'flex', gap: 18, marginBottom: 12 }}>
            {stat('High Score', highScore)}
            {stat('Games Played', gamesPlayed)}
            {stat('Average', averageScore)}
          </div>
          <div
            style={{
              background: '#fff',
              border: `1px solid ${color.panelBorder}`,
              borderRadius: 4,
              padding: 6,
              maxHeight: 200,
              overflow: 'auto',
            }}
          >
            {history.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  {history.map((entry, index) => (
                    <tr key={`${entry.date}-${index}`}>
                      <td
                        style={{ padding: '5px 8px', color: '#5a5a52', borderBottom: '1px solid #eee' }}
                      >
                        {entry.date}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          padding: '5px 8px',
                          fontWeight: 700,
                          color: color.ink,
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        {entry.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ fontSize: 12, color: color.muted, padding: 8, margin: 0 }}>
                No completed games yet.
              </p>
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ ...greyButton, width: '100%', fontSize: 13, padding: '12px 16px', minHeight: 44 }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
