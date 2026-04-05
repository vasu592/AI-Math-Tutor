import { useRouter } from 'next/router';

const STATUS_COLOR = {
  mastered: 'var(--green)',
  in_progress: 'var(--amber)',
  not_started: 'var(--text-dim)',
};

const STATUS_LABEL = {
  mastered: '✓ Mastered',
  in_progress: 'In Progress',
  not_started: 'New',
};

const CHAPTER_ICONS = {
  'shapes-sizes-4': '🟦',
  'place-value-4': '🔢',
  'add-subtract-4': '➕',
  'multiplication-4': '✖️',
  'division-4': '➗',
  'factors-multiples-4': '🔢',
  'fractions-4': '🍕',
  'decimals-4': '🔙',
  'money-4': '💰',
  'time-4': '⏰',
  'measurement-4': '📏',
  'perimeter-area-4': '📐',
  'patterns-4': '🎨',
  'data-handling-4': '📊',
  'fish-tale-5': '🐟',
  'shapes-angles-5': '📐',
  'how-many-squares-5': '⬜',
  'parts-wholes-5': '🍕',
  'look-same-5': '🪞',
  'be-my-multiple-5': '🔢',
  'create-it-5': '🎯',
  'mapping-way-5': '🗺️',
  'boxes-puzzles-5': '📦',
  'tenths-hundredths-5': '🔟',
  'area-boundary-5': '📐',
  'smart-charts-5': '📊',
  'ways-multiply-5': '✖️',
  'ways-divide-5': '➗',
  'big-heavy-5': '⚖️',
  'knowing-numbers-6': '🔢',
  'whole-numbers-6': '0️⃣',
  'playing-numbers-6': '🎮',
  'basic-geometry-6': '📐',
  'elementary-shapes-6': '⬛',
  'integers-6': '➖',
  'fractions-6': '🍕',
  'decimals-6': '🔙',
  'data-handling-6': '📊',
  'mensuration-6': '📏',
  'algebra-6': '❓',
  'ratio-proportion-6': '⚖️',
  'symmetry-6': '🪞',
  'practical-geometry-6': '📐',
  'integers-7': '➖',
  'fractions-decimals-7': '🍕',
  'data-handling-7': '📊',
  'simple-equations-7': '❓',
  'lines-angles-7': '📐',
  'triangle-properties-7': '🔺',
  'congruence-triangles-7': '🔷',
  'comparing-quantities-7': '⚖️',
  'rational-numbers-7': '🔢',
  'practical-geometry-7': '📐',
  'perimeter-area-7': '📐',
  'algebraic-expressions-7': '❓',
  'exponents-powers-7': '💪',
  'symmetry-7': '🪞',
  'solid-shapes-7': '📦',
};

function getChapterIcon(slug) {
  return CHAPTER_ICONS[slug] || '📚';
}

export default function ChapterGrid({ chapters, studentGrade }) {
  const router = useRouter();

  const filteredChapters = chapters.filter(c => c.class_num === studentGrade);

  return (
    <div>
      <div style={{ 
        marginBottom: '1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem',
        flexWrap: 'wrap'
      }}>
        <span style={{ 
          background: 'linear-gradient(135deg, #4CAF50, #8BC34A)', 
          color: 'white',
          padding: '0.4rem 1rem',
          borderRadius: '20px',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}>
          📚 Class {studentGrade}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {filteredChapters.length} chapters to explore!
        </span>
      </div>

      <div className="chapter-grid">
        {filteredChapters.map(ch => (
          <div
            key={ch.slug}
            className={`chapter-card ${ch.status}`}
            onClick={() => router.push(`/chapter-detail/${ch.slug}`)}
          >
            {ch.due_for_review && (
              <div style={{ position: 'absolute', top: '0.6rem', right: '0.6rem' }}>
                <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>Review Due</span>
              </div>
            )}
            <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>{getChapterIcon(ch.slug)}</div>
            <div className="chapter-card-title">{ch.name}</div>
            <div className="chapter-card-meta">
              <span style={{ color: STATUS_COLOR[ch.status], fontSize: '0.78rem', fontWeight: 600 }}>
                {STATUS_LABEL[ch.status]}
              </span>
              {ch.overall_mastery > 0 && (
                <span style={{ color: 'var(--text-muted)' }}>{ch.overall_mastery}%</span>
              )}
            </div>
            {ch.overall_mastery > 0 && (
              <div className="progress-track" style={{ marginTop: '0.6rem', height: '3px' }}>
                <div
                  className="progress-fill"
                  style={{ width: `${ch.overall_mastery}%`, background: ch.status === 'mastered' ? 'var(--green)' : ch.status === 'in_progress' ? 'var(--amber)' : 'var(--accent)' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
