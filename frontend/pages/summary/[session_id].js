import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { getSessionSummary } from '../../lib/api';

function ScoreCircle({ score, size = 90 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!score) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 900, 1);
      setDisplay(Math.floor(p * score));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [score]);

  const color = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: score >= 80 ? 'var(--green-bg)' : score >= 50 ? 'var(--amber-bg)' : 'var(--red-bg)',
      border: `3px solid ${color}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: size > 70 ? '1.4rem' : '1rem', color }}>
        {display}
      </span>
      <span style={{ fontSize: '0.7rem', color, fontWeight: 600 }}>/ 100</span>
    </div>
  );
}

export default function SummaryPage() {
  const router = useRouter();
  const { session_id } = router.query;
  const { student, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session_id || !student) return;
    getSessionSummary(session_id)
      .then(setSummary)
      .catch(err => setError(err.response?.data?.detail || 'Failed to load summary.'))
      .finally(() => setLoading(false));
  }, [session_id, student]);

  if (authLoading || loading) {
    return (
      <div className="page-loading">
        <span className="spinner spinner-lg" />
        <span>Loading your summary...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-loading">
        <p style={{ color: 'var(--red)' }}>{error}</p>
        <Link href="/dashboard" className="btn btn-ghost">← Back to Dashboard</Link>
      </div>
    );
  }

  if (!summary) return null;

  const chapterName = summary.chapter_slug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const masteredConcepts = summary.concepts?.filter(c => c.mastery_score >= 80) || [];
  const weakConcepts = summary.concepts?.filter(c => c.mastery_score < 80) || [];

  return (
    <div className="page-wrapper">
      <nav className="nav">
        <div className="container nav-inner">
          <div className="nav-logo">⚡ Math<span>AI</span></div>
          <Link href="/dashboard" className="btn btn-ghost" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
            ← Dashboard
          </Link>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '2rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: 680 }}>
          {/* Header */}
          <div className="card fade-in" style={{ textAlign: 'center', marginBottom: '1.25rem', padding: '2.5rem 1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
              {summary.nodes_mastered === summary.nodes_attempted && summary.nodes_mastered > 0 ? '🏆' :
               summary.nodes_mastered > summary.nodes_attempted / 2 ? '⭐' : '📚'}
            </div>
            <h1 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              Session Complete!
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {chapterName} · {summary.flow_type === 'revision' ? 'Revision' : 'First Time'} · {summary.duration_minutes} min
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <ScoreCircle score={summary.total_score} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Overall Score</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--green)' }}>
                    {summary.nodes_mastered}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Concepts mastered</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent)' }}>
                    {summary.nodes_attempted}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Questions attempted</div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Summary text */}
          {summary.summary_text && (
            <div className="card fade-in" style={{ marginBottom: '1.25rem', borderLeft: '3px solid var(--accent)' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--accent)' }}>
                🤖 AI Tutor Summary
              </h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {summary.summary_text}
              </p>
            </div>
          )}

          {/* Concept breakdown */}
          {summary.concepts?.length > 0 && (
            <div className="card fade-in" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>Concept Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {summary.concepts.map(c => {
                  const pct = c.mastery_score;
                  const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
                  return (
                    <div key={c.concept_key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>
                          {c.concept_key.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem', fontWeight: 700, color }}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weak concepts callout */}
          {weakConcepts.length > 0 && (
            <div className="card fade-in feedback-wrong" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                📌 Focus next time on:
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {weakConcepts.map(c => (
                  <span key={c.concept_key} className="concept-pill weak">
                    {c.concept_key.replace(/_/g, ' ')} ({c.mastery_score.toFixed(0)}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-2" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => router.push(`/chapter/${summary.chapter_slug}`)}
            >
              Continue this chapter
            </button>
            <Link href="/dashboard" className="btn btn-ghost">
              ← Choose another chapter
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
