import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getChapters, getTodayRecap } from '../lib/api';
import RecapCard from '../components/RecapCard';
import ChapterGrid from '../components/ChapterGrid';

export default function Dashboard() {
  const { student, loading, logout } = useAuth();
  const [chapters, setChapters] = useState([]);
  const [recap, setRecap] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    Promise.all([getChapters(), getTodayRecap()])
      .then(([chs, rc]) => {
        setChapters(chs);
        setRecap(rc);
      })
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, [student]);

  if (loading || !student) {
    return (
      <div className="page-loading">
        <span className="spinner spinner-lg" />
        <span>Loading your dashboard...</span>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ background: 'linear-gradient(180deg, #FFF9E6 0%, #E8F5E9 50%, #E3F2FD 100%)', minHeight: '100vh' }}>
      <nav className="nav">
        <div className="container nav-inner">
          <div className="nav-logo" style={{ fontSize: '1.3rem' }}>🧮 Math<span style={{ color: 'var(--accent)' }}>Tutor</span></div>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Class {student.grade} · {student.name}
            </span>
            <button className="btn btn-ghost" onClick={logout} style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '2rem 0 4rem' }}>
        <div className="container">
          {dataLoading ? (
            <div className="page-loading" style={{ minHeight: '40vh' }}>
              <span className="spinner spinner-lg" />
              <span>Loading your progress...</span>
            </div>
          ) : (
            <>
              <RecapCard recap={recap} studentName={student.name} />

              <div className="flex items-center justify-between mb-2" style={{ marginBottom: '1.25rem' }}>
                <h2 style={{ fontWeight: 700, fontSize: '1.2rem' }}>All Chapters</h2>
                <span className="text-muted text-sm">
                  {chapters.filter(c => c.status === 'mastered').length} / {chapters.length} mastered
                </span>
              </div>

              <ChapterGrid chapters={chapters} studentGrade={student.grade} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
