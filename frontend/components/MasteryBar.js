import { useEffect, useState } from 'react';

function ScoreCounter({ target, duration = 600 }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);

  return <>{value}</>;
}

export default function MasteryBar({ concepts, sessionScores = {} }) {
  if (!concepts || concepts.length === 0) return null;
  const mastered = concepts.filter(c => (sessionScores[c] ?? 0) >= 80).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '0.25rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>Session Progress</h3>
        <span style={{ fontSize: '0.85rem', color: mastered === concepts.length ? 'var(--green)' : 'var(--text-muted)', fontWeight: 600 }}>
          {mastered}/{concepts.length} mastered
        </span>
      </div>
      {concepts.map(concept => {
        const score = sessionScores[concept] ?? null;
        const pct = score ?? 0;
        const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : pct > 0 ? 'var(--red)' : 'var(--border-bright)';

        return (
          <div key={concept}>
            <div className="mastery-label">
              <span>{concept.replace(/_/g, ' ')}</span>
              <span style={{ color, fontWeight: 600, fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>
                {score !== null ? <><ScoreCounter target={Math.round(pct)} />%</> : '—'}
              </span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${pct}%`, background: color, transition: 'width 0.6s ease' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
