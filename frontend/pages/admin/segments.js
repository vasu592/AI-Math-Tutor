import { useState, useEffect } from 'react';
import { getAdminSegments, saveAdminSegments } from '../../lib/api';

export default function AdminSegmentsPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [segments, setSegments] = useState({});
  const [selectedChapter, setSelectedChapter] = useState('');
  const [chapterSegments, setChapterSegments] = useState({});
  const [newConcept, setNewConcept] = useState({ key: '', start: '', end: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await getAdminSegments(password);
      setChapters(data.chapters || []);
      setSegments(data.segments || {});
      setAuthenticated(true);
    } catch (err) {
      setError(err.response?.status === 403 ? 'Invalid admin password.' : 'Connection error.');
    }
  };

  useEffect(() => {
    if (!selectedChapter) { setChapterSegments({}); return; }
    setChapterSegments(segments[selectedChapter] || {});
  }, [selectedChapter, segments]);

  const handleAddConcept = () => {
    if (!newConcept.key || newConcept.start === '' || newConcept.end === '') return;
    setChapterSegments(prev => ({
      ...prev,
      [newConcept.key]: { start: parseInt(newConcept.start), end: parseInt(newConcept.end) },
    }));
    setNewConcept({ key: '', start: '', end: '' });
  };

  const handleUpdateSegment = (key, field, val) => {
    setChapterSegments(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: parseInt(val) || 0 },
    }));
  };

  const handleDeleteSegment = (key) => {
    setChapterSegments(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedChapter) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const segmentData = Object.entries(chapterSegments).reduce((acc, [k, v]) => {
        acc[k] = { start: v.start, end: v.end };
        return acc;
      }, {});
      await saveAdminSegments(password, { chapter_slug: selectedChapter, segments: segmentData });
      setSegments(prev => ({ ...prev, [selectedChapter]: chapterSegments }));
      setMessage('✓ Segments saved successfully!');
    } catch (err) {
      setError('Failed to save. Check admin password and try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!authenticated) {
    return (
      <div className="page-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="container-sm" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="nav-logo" style={{ justifyContent: 'center', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
              ⚙️ Admin
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Video Segment Editor</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.35rem' }}>Enter admin password to continue</p>
          </div>
          <div className="card">
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Admin Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter admin password from .env"
                  required
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn btn-primary btn-full">Enter →</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <nav className="nav">
        <div className="container nav-inner">
          <div className="nav-logo">⚙️ Admin — Video Segments</div>
          <button className="btn btn-ghost" onClick={() => setAuthenticated(false)} style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
            Logout
          </button>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '2rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Select Chapter</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
              Define concept segment timestamps (in seconds) for each chapter. These control which part of the video is replayed when a student struggles with a concept.
            </p>
            <select
              value={selectedChapter}
              onChange={e => setSelectedChapter(e.target.value)}
            >
              <option value="">— Select a chapter —</option>
              {chapters.map(ch => (
                <option key={ch.slug} value={ch.slug}>{ch.name}</option>
              ))}
            </select>
          </div>

          {selectedChapter && (
            <div className="card fade-in">
              <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>
                Segments for: <span style={{ color: 'var(--accent)' }}>{chapters.find(c => c.slug === selectedChapter)?.name}</span>
              </h3>

              {/* Existing segments */}
              {Object.keys(chapterSegments).length === 0 ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1rem' }}>No segments defined yet. Add one below.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 80px', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <span>Concept Key</span><span>Start (sec)</span><span>End (sec)</span><span></span>
                  </div>
                  {Object.entries(chapterSegments).map(([key, seg]) => (
                    <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 80px', gap: '0.5rem', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '0.88rem', color: 'var(--text)' }}>{key}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '0.5rem' }}>
                          ({formatTime(seg.start)} → {formatTime(seg.end)})
                        </span>
                      </div>
                      <input
                        type="number"
                        value={seg.start}
                        onChange={e => handleUpdateSegment(key, 'start', e.target.value)}
                        style={{ padding: '0.45rem 0.6rem', fontSize: '0.88rem' }}
                      />
                      <input
                        type="number"
                        value={seg.end}
                        onChange={e => handleUpdateSegment(key, 'end', e.target.value)}
                        style={{ padding: '0.45rem 0.6rem', fontSize: '0.88rem' }}
                      />
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteSegment(key)}
                        style={{ padding: '0.45rem 0.6rem', fontSize: '0.82rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new segment */}
              <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.25rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Add New Segment</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px auto', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="concept_key (snake_case)"
                    value={newConcept.key}
                    onChange={e => setNewConcept(p => ({ ...p, key: e.target.value.replace(/\s/g, '_').toLowerCase() }))}
                    style={{ padding: '0.55rem 0.7rem', fontSize: '0.88rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Start (sec)"
                    value={newConcept.start}
                    onChange={e => setNewConcept(p => ({ ...p, start: e.target.value }))}
                    style={{ padding: '0.55rem 0.7rem', fontSize: '0.88rem' }}
                  />
                  <input
                    type="number"
                    placeholder="End (sec)"
                    value={newConcept.end}
                    onChange={e => setNewConcept(p => ({ ...p, end: e.target.value }))}
                    style={{ padding: '0.55rem 0.7rem', fontSize: '0.88rem' }}
                  />
                  <button className="btn btn-ghost" onClick={handleAddConcept}>Add</button>
                </div>
              </div>

              {message && <p style={{ color: 'var(--green)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{message}</p>}
              {error && <p className="form-error" style={{ marginBottom: '0.75rem' }}>{error}</p>}

              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving...</> : `Save Segments for ${chapters.find(c => c.slug === selectedChapter)?.name}`}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
