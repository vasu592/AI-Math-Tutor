import { InlineMath, BlockMath } from 'react-katex';

function renderMathText(text) {
  if (!text) return null;
  // Split on $...$ for inline and $$...$$ for block math
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const math = part.slice(2, -2);
      return <BlockMath key={i} math={math} errorColor="#f75f5f" />;
    }
    if (part.startsWith('$') && part.endsWith('$')) {
      const math = part.slice(1, -1);
      return <InlineMath key={i} math={math} errorColor="#f75f5f" />;
    }
    return <span key={i}>{part}</span>;
  });
}

const DIFFICULTY_BADGE = {
  easy: { label: 'Easy', color: 'var(--green)', bg: 'var(--green-bg)' },
  medium: { label: 'Medium', color: 'var(--amber)', bg: 'var(--amber-bg)' },
  hard: { label: 'Hard', color: 'var(--red)', bg: 'var(--red-bg)' },
};

export default function QuestionCard({ question, conceptKey, attemptNumber, hint }) {
  if (!question) return null;
  const diff = DIFFICULTY_BADGE[question.difficulty] || DIFFICULTY_BADGE.medium;

  return (
    <div className="card fade-in" style={{ borderLeft: '3px solid var(--accent)' }}>
      <div className="flex items-center justify-between mb-1" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="flex items-center gap-1" style={{ gap: '0.5rem' }}>
          {conceptKey && (
            <span className="concept-pill">
              {conceptKey.replace(/_/g, ' ')}
            </span>
          )}
          <span
            className="badge"
            style={{ background: diff.bg, color: diff.color }}
          >
            {diff.label}
          </span>
        </div>
        {attemptNumber > 1 && (
          <span className="badge badge-amber">Attempt {attemptNumber}</span>
        )}
      </div>

      <div style={{ fontSize: '1.05rem', lineHeight: 1.65, color: 'var(--text)' }}>
        {renderMathText(question.question || question)}
      </div>

      {hint && attemptNumber >= 2 && (
        <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.9rem', background: 'var(--bg-card2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-bright)' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            💡 Hint: {hint}
          </p>
        </div>
      )}
    </div>
  );
}
