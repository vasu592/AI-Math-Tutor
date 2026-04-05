import { useRef, useEffect, useState, useCallback } from 'react';

export default function VideoPlayer({ src, startTime = null, endTime = null, onSegmentEnd, onCanContinue }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [canContinue, setCanContinue] = useState(false);
  const [error, setError] = useState(false);
  const watchedRef = useRef(0);
  const segmentMode = startTime !== null && endTime !== null;

  // Seek to segment start when startTime changes
  useEffect(() => {
    if (startTime !== null && videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play().catch(() => {});
    }
  }, [startTime]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const t = video.currentTime;
    setCurrentTime(t);

    // Track watch time for can-continue gate
    if (!segmentMode) {
      watchedRef.current += 0.25; // called ~4x per second
      const ws = Math.floor(watchedRef.current);
      setWatchedSeconds(ws);
      if (ws >= 60 && !canContinue) {
        setCanContinue(true);
        onCanContinue?.();
      }
    }

    // Segment end detection
    if (segmentMode && endTime !== null && t >= endTime) {
      video.pause();
      onSegmentEnd?.();
    }
  }, [segmentMode, endTime, canContinue, onCanContinue, onSegmentEnd]);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    if (!canContinue) {
      setCanContinue(true);
      onCanContinue?.();
    }
    if (segmentMode) onSegmentEnd?.();
  }, [canContinue, segmentMode, onCanContinue, onSegmentEnd]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const target = pct * duration;
    // In segment mode, clamp to segment bounds
    if (segmentMode) {
      video.currentTime = Math.max(startTime, Math.min(endTime, target));
    } else {
      video.currentTime = target;
    }
  };

  const progressPct = segmentMode
    ? duration > 0 ? ((currentTime - (startTime || 0)) / ((endTime || duration) - (startTime || 0))) * 100 : 0
    : duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-container" style={{ position: 'relative' }}>
      {segmentMode && (
        <div style={{
          position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 10,
          background: 'rgba(245,166,35,0.9)', color: '#0a0c10',
          borderRadius: '100px', padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 700,
        }}>
          📌 Reviewing concept segment
        </div>
      )}

      {error ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ fontSize: '2.5rem' }}>📹</span>
          <p>Video not available</p>
          <p style={{ fontSize: '0.82rem' }}>Make sure the video is uploaded to your S3 bucket</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setError(true)}
          style={{ width: '100%', height: '100%', cursor: 'pointer' }}
          onClick={togglePlay}
          playsInline
        />
      )}

      {/* Custom controls */}
      {!error && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
          padding: '2rem 1rem 0.75rem',
        }}>
          {/* Progress bar */}
          <div
            onClick={handleSeek}
            style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '100px', cursor: 'pointer', marginBottom: '0.6rem' }}
          >
            <div style={{ width: `${Math.min(100, progressPct)}%`, height: '100%', background: 'var(--accent)', borderRadius: '100px', transition: 'width 0.25s' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={togglePlay} style={{ background: 'none', color: '#fff', fontSize: '1.2rem', lineHeight: 1 }}>
              {playing ? '⏸' : '▶'}
            </button>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', fontFamily: 'var(--mono)' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            {!segmentMode && !canContinue && (
              <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>
                Watch {Math.max(0, 60 - watchedSeconds)}s more to continue
              </span>
            )}
            {!segmentMode && canContinue && (
              <span style={{ marginLeft: 'auto', color: 'var(--green)', fontSize: '0.78rem', fontWeight: 600 }}>
                ✓ Ready to continue
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
