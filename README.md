# CBSE AI Math Tutor

A full-stack, mastery-based AI tutoring system for CBSE Mathematics (Class 10, 11, 12).

## Features

- 🎥 **Video-first learning** — watch chapter videos, replay weak concept segments automatically
- 🤖 **GPT-4o evaluation** — AI reads your answer, finds the exact gap, explains it clearly
- 🎙️ **Voice input** — speak answers via Whisper STT with automatic math symbol conversion
- 📈 **Spaced repetition** — concepts scheduled for review at 3 / 7 / 14 / 30 day intervals
- 🔄 **Two flows** — First-Time (video → intro → questions) and Revision (straight to weakest concept)
- 🔒 **JWT auth** — secure login/register for students
- ⏱️ **Server-enforced 45-minute session timer**
- 📱 **Mobile-first** — works on phone browsers

---

## Quick Start (Docker — Recommended)

### 1. Configure environment

```bash
cd mathtutor
cp .env.example .env
```

Edit `.env` and fill in:

```env
OPENAI_API_KEY=sk-your-openai-key-here
VIDEO_BASE_URL=https://your-bucket.s3.amazonaws.com
JWT_SECRET=some-long-random-string
ADMIN_PASSWORD=your-admin-password
```

### 2. Start everything

```bash
docker-compose up --build
```

| Service   | URL                              |
|-----------|----------------------------------|
| Frontend  | http://localhost:3000            |
| Backend   | http://localhost:8000            |
| API Docs  | http://localhost:8000/docs       |

---

## Local Development Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Make sure PostgreSQL and Redis are running (or use docker-compose for just those)
docker-compose up postgres redis -d

uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:3000

---

## Adding Your S3 Videos

Set `VIDEO_BASE_URL=https://your-bucket.s3.amazonaws.com` in `.env`.

Upload videos to S3 using the naming convention:

```
s3://your-bucket/videos/{chapter-slug}.mp4
```

Examples:
```
s3://your-bucket/videos/quadratic-equations.mp4
s3://your-bucket/videos/trigonometry.mp4
s3://your-bucket/videos/matrices.mp4
```

Chapter slugs match the list in `backend/config/chapters.py`. Make sure your S3 bucket has public read access (or use signed URLs).

---

## Adding Video Segments (Admin UI)

Video segments control which part of the chapter video is replayed when a student struggles with a specific concept.

1. Go to **http://localhost:3000/admin/segments**
2. Enter your `ADMIN_PASSWORD` from `.env`
3. Select a chapter from the dropdown
4. Add concept keys (snake_case) with start and end timestamps in **seconds**
5. Click **Save**

Changes are saved to `backend/config/video_segments.json` immediately.

**Example:**
- Chapter: `quadratic-equations`
- Concept: `discriminant` → Start: `86`, End: `210`

This means when a student scores < 80% on "discriminant", the video will replay from 1:26 to 3:30.

---

## Project Structure

```
mathtutor/
├── .env.example
├── docker-compose.yml
├── README.md
├── backend/
│   ├── main.py                      # FastAPI app entry point
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── config/
│   │   ├── chapters.py              # All 38 CBSE chapters (hardcoded)
│   │   ├── settings.py              # Env-based configuration
│   │   └── video_segments.json      # Segment timestamps (editable via admin UI)
│   ├── models/
│   │   └── database.py              # SQLAlchemy async models (4 tables)
│   ├── services/
│   │   ├── ai_service.py            # All GPT-4o / GPT-4o-mini / Whisper calls
│   │   ├── session_service.py       # Redis session state management
│   │   ├── mastery_service.py       # Mastery scoring + spaced repetition
│   │   └── video_service.py         # Segment JSON lookup
│   └── routers/
│       ├── auth.py                  # JWT register + login
│       ├── chapters.py              # Chapter list + mastery summary
│       ├── sessions.py              # Full session + evaluation engine
│       ├── voice.py                 # Whisper transcription endpoint
│       ├── recap.py                 # Daily recap data
│       └── admin.py                 # Admin segment editor API
└── frontend/
    ├── pages/
    │   ├── index.js                 # Landing page
    │   ├── dashboard.js             # Chapter grid + daily recap
    │   ├── auth/
    │   │   ├── login.js
    │   │   └── register.js
    │   ├── chapter/[slug].js        # Session page (both flows)
    │   ├── summary/[session_id].js  # Post-session summary
    │   └── admin/segments.js        # Admin video segment editor
    ├── components/
    │   ├── VideoPlayer.js           # HTML5 player with segment seek
    │   ├── VoiceInput.js            # MediaRecorder mic button
    │   ├── QuestionCard.js          # KaTeX math rendering
    │   ├── MasteryBar.js            # Animated mastery progress bar
    │   ├── ChapterGrid.js           # Chapter selection grid
    │   └── RecapCard.js             # Daily recap display
    ├── hooks/useAuth.js             # Auth state hook
    ├── lib/api.js                   # All API calls (axios)
    └── styles/globals.css           # Dark theme, mobile-first CSS
```

---

## Database Tables

| Table             | Purpose                                        |
|-------------------|------------------------------------------------|
| `students`        | Student accounts (name, email, grade, password)|
| `sessions`        | Each study session (chapter, flow, score)      |
| `concept_mastery` | Per-student mastery score per concept          |
| `session_events`  | Every question/answer within a session         |

Tables are created automatically on first startup via SQLAlchemy.

---

## API Reference

| Method | Endpoint                        | Description                        |
|--------|---------------------------------|------------------------------------|
| POST   | `/api/auth/register`            | Create student account             |
| POST   | `/api/auth/login`               | Login, get JWT token               |
| GET    | `/api/auth/me`                  | Get current student info           |
| GET    | `/api/chapters`                 | List all chapters with mastery %   |
| GET    | `/api/chapters/{slug}/mastery`  | Mastery breakdown for one chapter  |
| POST   | `/api/session/start`            | Start session, returns flow type   |
| POST   | `/api/session/{id}/questions`   | Get comprehension questions        |
| POST   | `/api/session/{id}/answer`      | Submit answer, get evaluation      |
| POST   | `/api/session/{id}/end`         | End session, get summary           |
| GET    | `/api/session/{id}/summary`     | Fetch saved session summary        |
| GET    | `/api/session/{id}/state`       | Get live Redis session state       |
| POST   | `/api/voice/transcribe`         | Upload audio, get transcript       |
| GET    | `/api/recap/today`              | Today's recap for dashboard        |
| GET    | `/api/admin/segments`           | Get all video segments (admin)     |
| POST   | `/api/admin/segments`           | Save chapter segments (admin)      |

---

## Spaced Repetition Schedule

When a concept reaches ≥ 80% mastery:

| Mastery count | Next review |
|---------------|-------------|
| 1st time      | 3 days      |
| 2nd time      | 7 days      |
| 3rd time      | 14 days     |
| 4th+ time     | 30 days     |

A **"Review Due"** badge appears on the dashboard when any concept is past its review date.

---

## Re-teach Escalation Logic

When a student scores < 80% on a concept:

| Attempt | Action                                         |
|---------|------------------------------------------------|
| 1–2     | Replay the relevant video segment              |
| 3       | GPT-4o generates a fresh text analogy          |
| 4+      | GPT-4o generates a fully worked example        |

---

## Environment Variables

| Variable         | Description                                    |
|------------------|------------------------------------------------|
| `DATABASE_URL`   | PostgreSQL connection string (asyncpg)         |
| `REDIS_URL`      | Redis connection string                        |
| `OPENAI_API_KEY` | OpenAI API key (GPT-4o + Whisper)             |
| `VIDEO_BASE_URL` | Base URL of your S3 bucket                    |
| `JWT_SECRET`     | Secret for signing JWT tokens                  |
| `ADMIN_PASSWORD` | Password for `/admin/segments` page            |

---

## Troubleshooting

**Videos not playing?**
- Check `VIDEO_BASE_URL` in `.env`
- Ensure S3 bucket allows public reads or add CORS headers
- Video file must be named exactly `{chapter-slug}.mp4`

**OpenAI errors?**
- Verify `OPENAI_API_KEY` is set and has GPT-4o access
- Check the FastAPI logs: `docker-compose logs backend`

**Database connection errors?**
- Make sure PostgreSQL is running: `docker-compose up postgres`
- Check `DATABASE_URL` uses `postgresql+asyncpg://` not `postgresql://`

**Voice not working?**
- Browser must have microphone permission
- HTTPS required in production (use ngrok for local testing on mobile)
