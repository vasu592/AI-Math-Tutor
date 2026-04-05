import { useRouter } from 'next/router';

export default function RecapCard({ recap, studentName }) {
  const router = useRouter();

  if (!recap) return null;

  if (!recap.has_history) {
    return (
      <div className="card fade-in" style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, #141820 100%)', border: '1px solid var(--accent)', marginBottom: '2rem' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>👋</span>
          <h2 style={{ fontWeight: 700, fontSize: '1.2rem' }}>Welcome, {studentName}!</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          You're all set to start your CBSE Maths journey. Pick a chapter below and let's begin!
        </p>
      </div>
    );
  }

  const mastered = recap.mastered_concepts || [];
  const weak = recap.weak_concepts || [];
  const dueChapters = recap.due_for_review_chapters || [];

  return (
    <div className="card fade-in" style={{ marginBottom: '2rem' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '1.3rem' }}>📊</span>
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Your Progress Recap</h2>
        </div>
        {dueChapters.length > 0 && (
          <span className="badge badge-amber">
            {dueChapters.length} chapter{dueChapters.length > 1 ? 's' : ''} due for review
          </span>
        )}
      </div>

      {recap.last_chapter_slug && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Last studied: <strong style={{ color: 'var(--text)' }}>{recap.last_chapter_slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</strong>
          {recap.last_session_score != null && (
            <> · Score: <strong style={{ color: recap.last_session_score >= 80 ? 'var(--green)' : 'var(--amber)' }}>{recap.last_session_score.toFixed(0)}%</strong></>
          )}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: mastered.length > 0 || weak.length > 0 ? '1rem' : '0' }}>
        {mastered.map(c => (
          <span key={c} className="concept-pill mastered">✓ {c.replace(/_/g, ' ')}</span>
        ))}
        {weak.map(c => (
          <span key={c} className="concept-pill weak">⚠ {c.replace(/_/g, ' ')}</span>
        ))}
      </div>

      {recap.last_chapter_slug && (
        <button
          className="btn btn-primary"
          onClick={() => router.push(`/chapter/${recap.last_chapter_slug}`)}
          style={{ marginTop: '0.5rem' }}
        >
          Continue where you left off →
        </button>
      )}
    </div>
  );
}
