import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { startSession, getQuestions, submitAnswer, endSession } from '../../lib/api';
import VideoPlayer from '../../components/VideoPlayer';
import QuestionCard from '../../components/QuestionCard';
import VoiceInput from '../../components/VoiceInput';
import MasteryBar from '../../components/MasteryBar';

// ─── Timer ───────────────────────────────────────────────────────────────────
function SessionTimer({ onExpire }) {
  const [seconds, setSeconds] = useState(2700);
  useEffect(() => {
    const t = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(t); onExpire?.(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const urgent = seconds < 300;
  return (
    <div className={`session-timer ${urgent ? 'urgent' : ''}`}>
      {urgent && '⚠ '}{m}:{s.toString().padStart(2, '0')} remaining
    </div>
  );
}

// ─── Evaluation feedback ─────────────────────────────────────────────────────
function EvaluationFeedback({ evaluation, nextAction, onNext }) {
  const [count, setCount] = useState(0);
  const target = evaluation?.score ?? 0;

  useEffect(() => {
    if (!target) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 700, 1);
      setCount(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);

  const isCorrect = evaluation?.is_correct;
  const actionType = nextAction?.type;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div className="flex items-center" style={{ gap: '1rem' }}>
        <div style={{
          width: 70, height: 70, borderRadius: '50%', flexShrink: 0,
          background: isCorrect ? 'var(--green-bg)' : 'var(--amber-bg)',
          border: `3px solid ${isCorrect ? 'var(--green)' : 'var(--amber)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '1.2rem', color: isCorrect ? 'var(--green)' : 'var(--amber)' }}>
            {count}
          </span>
        </div>
        <div>
          <p style={{ fontWeight: 700, color: isCorrect ? 'var(--green)' : 'var(--amber)' }}>
            {isCorrect ? '✓ Correct!' : 'Keep going!'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Score: {target}/100</p>
        </div>
      </div>

      {evaluation?.what_student_got_right && (
        <div className="feedback-box feedback-correct">
          <strong>✓ What you got right:</strong> {evaluation.what_student_got_right}
        </div>
      )}

      {!isCorrect && evaluation?.gap_identified && (
        <div className="feedback-box feedback-wrong">
          <strong>⚠ Gap:</strong> {evaluation.gap_identified}
        </div>
      )}

      {!isCorrect && evaluation?.explanation && (
        <div className="feedback-box feedback-reteach">
          <strong>📖 Explanation:</strong> {evaluation.explanation}
        </div>
      )}

      {(nextAction?.explanation || nextAction?.explanation) && (
        <div className="feedback-box feedback-reteach" style={{ borderColor: 'var(--accent)' }}>
          <strong style={{ color: 'var(--accent)' }}>
            {actionType === 'worked_example' ? '📐 Worked Example' : '💡 Let me explain differently'}
          </strong>
          <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-line' }}>
            {nextAction.explanation}
          </p>
        </div>
      )}

      {actionType === 'session_complete' ? (
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          <p style={{ color: 'var(--green)', fontWeight: 700, marginBottom: '0.75rem' }}>🎉 All concepts done!</p>
          <button className="btn btn-green" onClick={onNext}>View Summary →</button>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={onNext}>
          {isCorrect ? 'Next →' : actionType === 'replay_segment' ? '▶ Watch again' : 'Try Again →'}
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ChapterSessionPage() {
  const router = useRouter();
  const { slug } = router.query;
  const { student, loading: authLoading } = useAuth();

  const [sessionData, setSessionData] = useState(null);
  // phases: loading | video | intro | questions | feedback | done
  const [phase, setPhase] = useState('loading');
  const [question, setQuestion] = useState(null);  // { question, expected_answer, concept_key, difficulty, hint }
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [nextAction, setNextAction] = useState(null);
  const [sessionScores, setSessionScores] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [canContinue, setCanContinue] = useState(false);
  const [replaySegment, setReplaySegment] = useState(null);
  const [introContent, setIntroContent] = useState(null);
  const sessionIdRef = useRef(null);

  // ── Start session on load ──────────────────────────────────────────────────
  useEffect(() => {
    if (!slug || !student) return;
    startSession(slug)
      .then(data => {
        sessionIdRef.current = data.session_id;
        setSessionData(data);

        if (data.flow_type === 'first_time') {
          // "content" key from backend
          setIntroContent(data.content || data.introduction || null);
          setPhase('video');
        } else {
          // Revision: backend returns question_data as data.question (full object)
          if (data.question) {
            setQuestion(normalizeQuestion(data.question));
          }
          setPhase('questions');
        }
      })
      .catch(err => {
        setError(err.response?.data?.detail || 'Failed to start session.');
        setPhase('error');
      });
  }, [slug, student]);

  // Normalize question shapes from backend
  const normalizeQuestion = (q) => {
    if (!q) return null;
    // Sometimes the backend wraps it, sometimes it's flat
    if (typeof q.question === 'string') return q;  // already has .question field
    return q;
  };

  const handleCanContinue = useCallback(() => setCanContinue(true), []);

  const handleSegmentEnd = useCallback(() => {
    setReplaySegment(null);
  }, []);

  // ── After video: show intro or go straight to questions ───────────────────
  const handleVideoPhaseNext = () => {
    if (introContent) setPhase('intro');
    else loadFirstQuestion();
  };

  const loadFirstQuestion = async () => {
    setPhase('loading');
    try {
      const data = await getQuestions(sessionIdRef.current);
      // Backend returns { questions: [...], first_question: {...} }
      const firstQ = data.first_question || (data.questions && data.questions[0]);
      if (firstQ) {
        setQuestion(normalizeQuestion(firstQ));
        setPhase('questions');
      } else {
        setError('No questions available. Please try again.');
        setPhase('questions');
      }
    } catch (err) {
      setError('Failed to load questions. Please try again.');
      setPhase('questions');
    }
  };

  // ── Submit answer ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await submitAnswer(sessionIdRef.current, answer.trim());
      const evalData = result.evaluation;
      const action = result.next_action;

      setEvaluation(evalData);
      setNextAction(action);

      // Update mastery progress bar
      const conceptKey = question?.concept_key;
      if (conceptKey && result.score != null) {
        setSessionScores(prev => ({ ...prev, [conceptKey]: result.mastery_score || result.score }));
      }

      // If segment replay — set it up so VideoPlayer shows
      if (action?.type === 'replay_segment' && action.segment) {
        setReplaySegment(action.segment);
      }

      setPhase('feedback');
      setAnswer('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── After feedback: route to next step ───────────────────────────────────
  const handleNextAfterFeedback = async () => {
    const action = nextAction;
    setEvaluation(null);
    setNextAction(null);

    if (action?.type === 'session_complete') {
      await doEndSession();
      return;
    }

    // next_question: action.question is the full question object
    if (action?.type === 'next_question' && action.question) {
      setQuestion(normalizeQuestion(action.question));
      setPhase('questions');
      return;
    }

    // replay_segment: new question is in action.new_question (string)
    if (action?.type === 'replay_segment') {
      if (action.new_question) {
        setQuestion(prev => ({ ...prev, question: action.new_question }));
      }
      setPhase('questions');
      return;
    }

    // text_explanation / worked_example: new question string in action.new_question
    if (action?.new_question) {
      setQuestion(prev => ({ ...prev, question: action.new_question }));
    }
    setPhase('questions');
  };

  const doEndSession = async () => {
    try {
      await endSession(sessionIdRef.current);
    } catch (_) {}
    router.push(`/summary/${sessionIdRef.current}`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (authLoading || !student || phase === 'loading') {
    return (
      <div className="page-loading">
        <span className="spinner spinner-lg" />
        <span>Setting up your session...</span>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="page-loading">
        <p style={{ color: 'var(--red)' }}>{error}</p>
        <Link href="/dashboard" className="btn btn-ghost">← Dashboard</Link>
      </div>
    );
  }

  const chapterName = sessionData?.chapter?.name || String(slug || '').replace(/-/g, ' ');
  const concepts = sessionData?.concepts || [];
  const videoUrl = sessionData?.video_url || '';
  const isRevision = sessionData?.flow_type === 'revision';

  return (
    <div className="page-wrapper">
      {/* Top nav */}
      <nav className="nav">
        <div className="container nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <Link href="/dashboard" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', flexShrink: 0 }}>← Dashboard</Link>
            <span style={{ color: 'var(--border)' }}>|</span>
            <h1 style={{
              fontSize: '0.95rem', fontWeight: 700, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{chapterName}</h1>
            {isRevision && <span className="badge badge-blue" style={{ flexShrink: 0 }}>Revision</span>}
          </div>
          <div className="flex items-center" style={{ gap: '0.75rem', flexShrink: 0 }}>
            <SessionTimer onExpire={doEndSession} />
            <button
              className="btn btn-ghost"
              onClick={doEndSession}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
            >End</button>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '1.5rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* ── VIDEO PHASE ─────────────────────────────────────────────── */}
          {(phase === 'video' || replaySegment) && (
            <div className="fade-in">
              <VideoPlayer
                src={videoUrl}
                startTime={replaySegment?.start ?? null}
                endTime={replaySegment?.end ?? null}
                onCanContinue={handleCanContinue}
                onSegmentEnd={handleSegmentEnd}
              />
              {!replaySegment && phase === 'video' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    className="btn btn-primary"
                    disabled={!canContinue}
                    onClick={handleVideoPhaseNext}
                    title={!canContinue ? 'Watch at least 60 seconds first' : ''}
                  >
                    {canContinue ? 'Continue to Questions →' : 'Watch more to unlock...'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── INTRO PHASE ─────────────────────────────────────────────── */}
          {phase === 'intro' && introContent && (
            <div className="card fade-in">
              <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{chapterName}</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.7 }}>
                {introContent.introduction}
              </p>
              {(introContent.sections || []).map((s, i) => (
                <div key={i} style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.35rem', color: 'var(--accent)' }}>
                    {s.title}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                    {s.explanation}
                  </p>
                  {s.key_terms?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                      {s.key_terms.map(t => <span key={t} className="concept-pill">{t}</span>)}
                    </div>
                  )}
                </div>
              ))}
              <button className="btn btn-primary" onClick={loadFirstQuestion} style={{ marginTop: '0.75rem' }}>
                Start Questions →
              </button>
            </div>
          )}

          {/* ── QUESTIONS / FEEDBACK PHASE ──────────────────────────────── */}
          {(phase === 'questions' || phase === 'feedback') && (
            <>
              {/* Mastery progress */}
              {concepts.length > 0 && (
                <div className="card">
                  <MasteryBar concepts={concepts} sessionScores={sessionScores} />
                </div>
              )}

              {/* Active question */}
              {question && phase === 'questions' && (
                <div>
                  <QuestionCard
                    question={question}
                    conceptKey={question.concept_key}
                    attemptNumber={sessionScores[question.concept_key] !== undefined ? 2 : 1}
                    hint={question.hint}
                  />

                  <div className="card" style={{ marginTop: '1rem' }}>
                    <label className="form-label" style={{ display: 'block', marginBottom: '0.75rem' }}>
                      Your Answer
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <VoiceInput
                        onTranscript={t => setAnswer(prev => prev ? prev + ' ' + t : t)}
                        disabled={submitting}
                      />
                      <div style={{ flex: 1 }}>
                        <textarea
                          value={answer}
                          onChange={e => setAnswer(e.target.value)}
                          placeholder="Type your answer... (use $...$ for math, e.g. $x^2 + 2x = 0$)"
                          rows={4}
                          disabled={submitting}
                          style={{ resize: 'vertical' }}
                          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                          Ctrl+Enter to submit
                        </p>
                      </div>
                    </div>
                    {error && <p className="form-error" style={{ marginTop: '0.5rem' }}>{error}</p>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.85rem' }}>
                      <button
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={submitting || !answer.trim()}
                      >
                        {submitting
                          ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Evaluating...</>
                          : 'Submit Answer →'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback after answer */}
              {phase === 'feedback' && evaluation && (
                <div className="card fade-in">
                  <EvaluationFeedback
                    evaluation={evaluation}
                    nextAction={nextAction}
                    onNext={handleNextAfterFeedback}
                  />
                </div>
              )}
            </>
          )}

          {/* ── ALL MASTERED ────────────────────────────────────────────── */}
          {phase === 'done' && (
            <div className="card fade-in" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
              <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>All Concepts Mastered!</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                You have mastered all concepts in this chapter.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn btn-green" onClick={doEndSession}>View Summary</button>
                <Link href="/dashboard" className="btn btn-ghost">← Dashboard</Link>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
