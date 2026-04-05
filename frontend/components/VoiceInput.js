import { useRef, useState } from 'react';
import { transcribeAudio } from '../lib/api';

export default function VoiceInput({ onTranscript, disabled }) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size < 100) { setLoading(false); return; }
        setLoading(true);
        try {
          const result = await transcribeAudio(blob);
          onTranscript?.(result.transcript);
        } catch (err) {
          setError('Transcription failed. Please type your answer instead.');
        } finally {
          setLoading(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      setError('Microphone access denied. Please type your answer.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const toggle = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <button
        onClick={toggle}
        disabled={disabled || loading}
        title={recording ? 'Stop recording' : 'Speak your answer'}
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: recording ? 'var(--red)' : 'var(--bg-card2)',
          border: `2px solid ${recording ? 'var(--red)' : 'var(--border-bright)'}`,
          color: recording ? '#fff' : 'var(--text-muted)',
          fontSize: '1.3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          opacity: disabled || loading ? 0.5 : 1,
        }}
        className={recording ? 'recording' : ''}
      >
        {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : (recording ? '⏹' : '🎙')}
      </button>
      <span style={{ fontSize: '0.72rem', color: recording ? 'var(--red)' : 'var(--text-dim)', fontWeight: 600 }}>
        {loading ? 'Transcribing...' : recording ? 'Recording...' : 'Voice'}
      </span>
      {error && <p style={{ fontSize: '0.78rem', color: 'var(--red)', textAlign: 'center', maxWidth: 200 }}>{error}</p>}
    </div>
  );
}
