import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Cookies from 'js-cookie';

const HERO_BG = {
  background: 'linear-gradient(135deg, #FFF9E6 0%, #E8F5E9 50%, #E3F2FD 100%)',
  position: 'relative' as const,
  overflow: 'hidden',
};

const FLOATING_ICONS = ['🔢', '➕', '➖', '✖️', '➗', '📐', '📏', '🔵', '⬛', '⭐', '🎯', '🏆'];

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    if (Cookies.get('token')) router.replace('/dashboard');
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
        <div className="container nav-inner">
          <div className="nav-logo" style={{ fontSize: '1.5rem' }}>🧮 Math<span style={{ color: 'var(--accent)' }}>Tutor</span></div>
          <div className="flex gap-1">
            <Link href="/auth/login" className="btn btn-ghost" style={{ padding: '0.55rem 1.1rem' }}>Login</Link>
            <Link href="/auth/register" className="btn btn-primary" style={{ padding: '0.55rem 1.1rem', background: 'linear-gradient(135deg, #FF9800, #FFC107)', border: 'none' }}>Start Learning</Link>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        {/* Hero */}
        <section style={{ ...HERO_BG, padding: '5rem 0 4rem', textAlign: 'center' }}>
          {FLOATING_ICONS.map((icon, i) => (
            <span key={i} style={{
              position: 'absolute',
              fontSize: `${1.5 + Math.random() * 1.5}rem`,
              opacity: 0.15,
              top: `${10 + Math.random() * 80}%`,
              left: `${5 + Math.random() * 90}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}>
              {icon}
            </span>
          ))}
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0) rotate(0deg); }
              50% { transform: translateY(-20px) rotate(10deg); }
            }
          `}</style>
          <div className="container">
            <div style={{ 
              display: 'inline-flex', 
              marginBottom: '1.5rem',
              background: 'linear-gradient(135deg, #4CAF50, #8BC34A)',
              padding: '0.5rem 1.25rem',
              borderRadius: '50px',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.9rem',
              boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
            }}>
              📚 CBSE Class 4 · 5 · 6 · 7
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, lineHeight: 1.15, marginBottom: '1.25rem' }}>
              Learn Math the<br />
              <span style={{ color: '#FF9800', textShadow: '2px 2px 0 #FFE082' }}>Fun Way! 🌟</span>
            </h1>
            <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', maxWidth: 540, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
              Watch fun videos, practice with AI, and become a math star! 🚀<br/>
              Available in English and Telugu!
            </p>
            <div className="flex justify-center gap-1" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <Link href="/auth/register" className="btn btn-primary" style={{ 
                fontSize: '1rem', 
                padding: '0.9rem 2rem',
                background: 'linear-gradient(135deg, #FF9800, #FFC107)',
                border: 'none',
                borderRadius: '50px',
                boxShadow: '0 4px 15px rgba(255, 152, 0, 0.4)',
              }}>
                Start Learning Free 🎉
              </Link>
              <Link href="/auth/login" className="btn btn-ghost" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }}>
                I have an account
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: '3rem 0', background: '#FAFAFA' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {[
                { icon: '🎥', title: 'Fun Video Lessons', desc: 'Watch colorful videos for every chapter. Learn at your own pace!' },
                { icon: '🤖', title: 'AI Learning Buddy', desc: 'Smart AI helps you understand. Ask questions anytime!' },
                { icon: '🎙️', title: 'Speak or Type', desc: 'Answer in your own words. Talk or type - whatever you prefer!' },
                { icon: '📈', title: 'Track Your Progress', desc: 'See how much you\'ve learned. Earn stars for solving problems!' },
              ].map((f) => (
                <div key={f.title} className="card fade-in" style={{ borderRadius: '16px', border: '2px solid #E8F5E9' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                  <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#2E7D32' }}>{f.title}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Chapters */}
        <section style={{ padding: '2rem 0 4rem' }}>
          <div className="container">
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem', borderRadius: '20px', background: 'linear-gradient(135deg, #E8F5E9 0%, #FFF9E6 100%)' }}>
              <h2 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '1.75rem' }}>📖 58 Chapters to Explore!</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Math topics for Class 4, 5, 6, and 7 - all aligned with CBSE</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                {['Shapes', 'Numbers', 'Fractions', 'Time', 'Measurement', 'Patterns', 'Data', 'Angles', 'Area', 'Algebra'].map(ch => (
                  <span key={ch} style={{ 
                    background: 'white', 
                    padding: '0.4rem 0.8rem', 
                    borderRadius: '20px', 
                    fontSize: '0.85rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    fontWeight: 500,
                  }}>{ch}</span>
                ))}
                <span style={{ 
                  background: '#4CAF50', 
                  color: 'white',
                  padding: '0.4rem 0.8rem', 
                  borderRadius: '20px', 
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}>+48 more</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>🧮 MathTutor · Built for CBSE Students</p>
      </footer>
    </div>
  );
}
