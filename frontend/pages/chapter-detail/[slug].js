import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { getChapterDetails } from '../../lib/api';

const AI_EXPLANATIONS = {
  "shapes-sizes-4": {
    "2d_shapes": {
      english: "2D shapes are flat shapes that you can draw on paper. They have only length and width, not height. Common 2D shapes include squares, rectangles, circles, and triangles. A square has 4 equal sides and 4 corners. A rectangle has 4 sides with opposite sides equal. A circle is round with no corners. A triangle has 3 sides and 3 corners.",
      telugu: "2D ఆకృతులు flat shapes. Paper pe draw cheyyavachunu. Length,width undi, height ledu. Square, rectangle, circle, triangle common 2D shapes. Square ku 4 equal sides, 4 corners. Rectangle ku 4 sides, opposite sides equal. Circle round, corners ledu. Triangle ku 3 sides, 3 corners."
    },
    "3d_shapes": {
      english: "3D shapes are solid objects that have length, width, and height. They take up space. A cube has 6 equal square faces, 8 corners, and 12 edges. A cuboid has 6 rectangular faces. A sphere is round like a ball with no corners. A cone has 1 circular face and 1 curved surface. A cylinder has 2 circular faces and 1 curved surface.",
      telugu: "3D shapes solid objects. Length, width, height undi. Space occupy chestadi. Cube ku 6 equal square faces, 8 corners, 12 edges. Cuboid ku 6 rectangular faces. Sphere ball vadina round, corners ledu. Cone ku 1 circular face, 1 curved surface. Cylinder ku 2 circular faces, 1 curved surface."
    }
  },
  "place-value-4": {
    "place_value_chart": {
      english: "Place value tells us how much each digit is worth in a number. In a 5-digit number like 52,378: the first digit (5) is in the ten thousands place and is worth 50,000. The second digit (2) is in the thousands place and is worth 2,000. The third digit (3) is in the hundreds place and is worth 300. The fourth digit (7) is in the tens place and is worth 70. The last digit (8) is in the ones place and is worth 8.",
      telugu: "Place value elani digit value entiante teliyistundi. 52,378 lo: first digit 5 ten thousands place, 50,000 worth. Second digit 2 thousands place, 2,000 worth. Third digit 3 hundreds place, 300 worth. Fourth digit 7 tens place, 70 worth. Last digit 8 ones place, 8 worth."
    },
    "rounding": {
      english: "Rounding makes numbers easier to work with. To round to the nearest 10, look at the ones digit. If it's 0-4, keep the tens digit same. If it's 5-9, add 1 to the tens digit. For example, 567 rounded to nearest 10 is 570 because 7 is more than 5. To round to nearest 100, look at the tens digit and follow the same rule.",
      telugu: "Rounding numbers easy ga make chesteundi. Nearest 10 ki round cheyataniki ones digit look cheyi. 0-4 unte tens digit same. 5-9 unte tens digit ki 1 add. Example: 567 nearest 10 ki 570, cause 7 > 5. Nearest 100 ki tens digit look cheyi."
    }
  }
};

export default function ChapterDetailPage() {
  const router = useRouter();
  const { slug } = router.query;
  const { student, loading: authLoading } = useAuth();
  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [showTelugu, setShowTelugu] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  const speakText = (text, lang) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'telugu' ? 'te-IN' : 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (!slug || !student) return;
    getChapterDetails(slug)
      .then(data => {
        setChapter(data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [slug, student]);

  const getAIExplanation = (topicKey) => {
    const key = slug + "_" + topicKey;
    return AI_EXPLANATIONS[key] || AI_EXPLANATIONS["shapes-sizes-4"]["2d_shapes"];
  };

  if (authLoading || loading || !student) {
    return (
      <div className="page-loading">
        <span className="spinner spinner-lg" />
        <span>Loading chapter...</span>
      </div>
    );
  }

  if (!chapter || chapter.error) {
    return (
      <div className="page-wrapper">
        <nav className="nav">
          <div className="container nav-inner">
            <Link href="/dashboard" style={{ color: 'var(--text-muted)' }}>← Back</Link>
          </div>
        </nav>
        <main style={{ flex: 1, padding: '3rem 0', textAlign: 'center' }}>
          <div className="container">
            <h2>Chapter not found</h2>
            <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const bookContent = chapter.book_content || [];
  const sections = chapter.sections || [];
  const exercises = chapter.exercises || [];

  return (
    <div className="page-wrapper" style={{ background: '#f5f5f0', minHeight: '100vh' }}>
      <nav className="nav" style={{ background: '#1a5d1a', color: '#fff' }}>
        <div className="container nav-inner">
          <Link href="/dashboard" style={{ color: '#fff', fontSize: '0.9rem' }}>← Back to Dashboard</Link>
          <span style={{ color: '#90ee90', margin: '0 0.5rem' }}>|</span>
          <span style={{ fontWeight: 600 }}>NCERT Class {chapter.class_num} Mathematics</span>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '1.5rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: 900 }}>
          {bookContent.map((ch, chIdx) => (
            <div key={chIdx}>
              <div style={{ 
                background: '#fff', 
                border: '1px solid #ccc',
                padding: '1rem',
                marginBottom: '1.5rem',
                borderLeft: '5px solid #1a5d1a'
              }}>
                <span style={{ 
                  background: '#1a5d1a', 
                  color: '#fff', 
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.8rem',
                  borderRadius: 2
                }}>
                  Chapter {ch.number}
                </span>
                <h1 style={{ 
                  fontSize: '1.6rem', 
                  color: '#1a1a1a', 
                  marginTop: '0.75rem',
                  fontWeight: 700
                }}>
                  {ch.title}
                </h1>
              </div>

              {ch.sections && ch.sections.map((section, sIdx) => (
                <div 
                  key={sIdx}
                  style={{ 
                    background: '#fff', 
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    padding: '1.5rem',
                    marginBottom: '1rem'
                  }}
                >
                  <h2 style={{ 
                    fontSize: '1.15rem', 
                    color: '#1a5d1a', 
                    marginBottom: '1rem',
                    borderBottom: '2px solid #1a5d1a',
                    paddingBottom: '0.5rem'
                  }}>
                    {section.title}
                  </h2>
                  
                  <div style={{ whiteSpace: 'pre-line', lineHeight: 1.8, color: '#333', marginBottom: '1rem', fontSize: '0.95rem' }}>
                    {section.content}
                  </div>

                  {section.subsections && section.subsections.map((sub, subIdx) => (
                    <div key={subIdx} style={{ marginLeft: '1rem', marginBottom: '1rem', padding: '0.75rem', background: '#f9f9f9', borderRadius: 4 }}>
                      <h3 style={{ fontSize: '1rem', color: '#333', marginBottom: '0.5rem', fontWeight: 600 }}>
                        {sub.name || sub.title} 
                        {sub.telugu && (
                          <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: '0.5rem' }}>
                            ({sub.telugu})
                          </span>
                        )}
                      </h3>
                      
                      <p style={{ color: '#444', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                        {sub.definition || sub.description}
                      </p>
                      
                      {sub.telugu_definition && (
                        <div style={{ background: '#fffde7', padding: '0.5rem', borderRadius: 4, marginBottom: '0.5rem', fontSize: '0.85rem', color: '#333' }}>
                          <strong>Telugu: </strong> {sub.telugu_definition}
                        </div>
                      )}

                      {sub.properties && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#1a5d1a' }}>Properties: </strong>
                          <span style={{ fontSize: '0.85rem', color: '#444' }}>
                            {Array.isArray(sub.properties) ? sub.properties.join(", ") : sub.properties}
                          </span>
                        </div>
                      )}

                      {(sub.examples_telugu || sub.example) && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#1a5d1a' }}>Examples: </strong>
                          <span style={{ fontSize: '0.85rem', color: '#444' }}>
                            {Array.isArray(sub.examples_telugu) ? sub.examples_telugu.join(", ") : sub.example}
                          </span>
                        </div>
                      )}

                      <button
                        style={{
                          marginTop: '0.75rem',
                          background: '#2196F3',
                          color: '#fff',
                          border: 'none',
                          padding: '0.4rem 0.8rem',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                        onClick={() => {
                          const topicKey = (sub.name || sub.title || '').toLowerCase().replace(/[^a-z]/g, '_');
                          setSelectedTopic(sub.name || sub.title);
                          setAiExplanation(getAIExplanation(topicKey));
                          setShowTelugu(false);
                        }}
                      >
                        🎓 Explain in Detail (AI)
                      </button>
                    </div>
                  ))}

                  {section.telugu_content && (
                    <div style={{ background: '#e8f5e9', padding: '0.75rem', borderRadius: 4, marginTop: '0.75rem', borderLeft: '3px solid #4caf50' }}>
                      <strong style={{ color: '#2e7d32' }}>Telugu Explanation: </strong>
                      <span style={{ color: '#333', fontSize: '0.9rem' }}>{section.telugu_content}</span>
                    </div>
                  )}
                </div>
              ))}

              {ch.exercises && ch.exercises.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #ddd', padding: '1.5rem', marginBottom: '1rem', borderRadius: 4 }}>
                  <h2 style={{ fontSize: '1.1rem', color: '#1a5d1a', marginBottom: '1rem', borderBottom: '2px solid #1a5d1a', paddingBottom: '0.5rem' }}>
                    📝 Exercise
                  </h2>
                  {ch.exercises.map((ex, eIdx) => (
                    <div key={eIdx} style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px dashed #ddd' }}>
                      <p style={{ fontWeight: 600, color: '#333', fontSize: '0.95rem' }}>{eIdx + 1}. {ex.q}</p>
                      <div style={{ background: '#e3f2fd', padding: '0.3rem 0.6rem', borderRadius: 4, display: 'inline-block', marginTop: '0.25rem' }}>
                        <span style={{ color: '#1565c0', fontSize: '0.85rem' }}>Answer: {ex.a}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {sections.map((section, idx) => (
            <div key={`extra-${idx}`} style={{ marginTop: '1rem' }}>
              <h3 style={{ color: '#1a5d1a', fontSize: '1rem', marginBottom: '0.5rem' }}>{section.title}</h3>
              <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: 1.6 }}>{section.content}</div>
            </div>
          ))}

          {chapter.summary && (
            <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: 4, marginTop: '1rem', borderLeft: '4px solid #4caf50' }}>
              <h3 style={{ color: '#2e7d32', marginBottom: '0.5rem' }}>📋 Summary</h3>
              <p style={{ color: '#333' }}>{chapter.summary}</p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '2rem' }}>
            <button
              className="btn btn-primary"
              style={{ padding: '0.8rem 2rem', fontSize: '1rem', fontWeight: 600 }}
              onClick={() => router.push(`/chapter/${slug}`)}
            >
              📖 Start Practice Quiz →
            </button>
          </div>
        </div>
      </main>

      {aiExplanation && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          borderTop: '3px solid #1a5d1a',
          padding: '1.5rem',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          maxHeight: '60vh',
          overflowY: 'auto',
          zIndex: 1000
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: '#1a5d1a', margin: 0 }}>
              🤖 AI Explanation: {selectedTopic}
            </h3>
            <button 
              onClick={() => setAiExplanation(null)}
              style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setShowTelugu(false)}
              style={{ 
                background: showTelugu ? '#e0e0e0' : '#1a5d1a', 
                color: showTelugu ? '#333' : '#fff',
                border: 'none',
                padding: '0.4rem 1rem',
                borderRadius: '4px',
                marginRight: '0.5rem',
                cursor: 'pointer'
              }}
            >
              🇬🇧 English
            </button>
            <button 
              onClick={() => setShowTelugu(true)}
              style={{ 
                background: showTelugu ? '#1a5d1a' : '#e0e0e0', 
                color: showTelugu ? '#fff' : '#333',
                border: 'none',
                padding: '0.4rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🇮🇳 Telugu
            </button>
            <button 
              onClick={() => speakText(showTelugu ? aiExplanation.telugu : aiExplanation.english, showTelugu ? 'telugu' : 'english')}
              style={{ 
                background: isSpeaking ? '#f44336' : '#2196F3', 
                color: '#fff',
                border: 'none',
                padding: '0.4rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              {isSpeaking ? '⏹ Stop' : '🔊 Listen'}
            </button>
          </div>

          <div style={{ 
            background: showTelugu ? '#fffde7' : '#e3f2fd', 
            padding: '1rem', 
            borderRadius: 8, 
            lineHeight: 1.8,
            fontSize: '0.95rem'
          }}>
            {showTelugu ? aiExplanation.telugu : aiExplanation.english}
          </div>
        </div>
      )}
    </div>
  );
}