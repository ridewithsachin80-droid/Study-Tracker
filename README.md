# StudyTracker SaaS

Multi-tenant study tracker for **CBSE · ICSE · Karnataka State Board** — Classes 1 to 12.

Students register with their board, class, and stream. The app automatically loads the correct syllabus and tracks their chapter progress, test scores, weekly plan, and badges.

---

## File Structure

```
studytracker/
│
├── server.js               ← Express API (all routes)
├── package.json            ← Backend deps + build script
├── railway.toml            ← Railway deploy config
├── .env.example            ← Copy to .env and fill in
├── .gitignore
│
├── db/
│   ├── schema.sql          ← PostgreSQL tables (run once)
│   └── seed.js             ← Loads all board/class/subject/chapter data
│
└── frontend/
    ├── index.html          ← Vite HTML shell
    ├── package.json        ← React + Vite + Recharts deps
    ├── vite.config.js      ← Dev proxy + build config
    ├── .env.example
    └── src/
        ├── main.jsx        ← React entry point
        └── App.jsx         ← Full SPA (auth, dashboard, subjects, tests, planner, badges, analytics)
```

---

## Deploy on Railway (step by step)

### Step 1 – Push to GitHub
```bash
git init
git add .
git commit -m "StudyTracker v2 – multi-tenant"
# Create repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/studytracker.git
git push -u origin main
```

### Step 2 – Create Railway project
1. Go to [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → select your repo
3. Railway auto-detects Node.js and runs `npm install && npm run build` then `node server.js`

### Step 3 – Add PostgreSQL
1. Inside your Railway project → **+ New** → **Database** → **PostgreSQL**
2. Click the Postgres service → **Variables** tab → copy the `DATABASE_URL`

### Step 4 – Set environment variables
In Railway → your Node service → **Variables** tab, add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | *(paste from Postgres service)* |
| `JWT_SECRET` | *(run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)* |
| `NODE_ENV` | `production` |
| `SETUP_KEY` | *(any private string, e.g. `mysetup123`)* |

### Step 5 – Create tables (once)
After the first deploy succeeds, run this in a terminal:
```bash
curl -X POST https://YOUR-APP.railway.app/api/setup \
  -H "x-setup-key: mysetup123"
# → {"ok":true,"msg":"Schema applied"}
```

### Step 6 – Seed syllabus data (once)
In Railway → your Node service → **Shell** tab:
```bash
node db/seed.js
# → ✅ Seeded 120 subjects, 1800+ chapters
```

That's it — your app is live.

---

## Local Development

```bash
# Terminal 1 — backend
cp .env.example .env          # fill in DATABASE_URL and JWT_SECRET
npm install
npm run dev                   # starts on :3000

# Terminal 2 — frontend (Vite proxies /api → :3000 automatically)
cd frontend
npm install
npm run dev                   # starts on :5173 → open this URL
```

---

## Database (after seeding)

| Board | Classes | Subjects | Chapters |
|-------|---------|----------|----------|
| CBSE  | 1–12    | ~55      | ~850     |
| ICSE  | 6–10    | ~35      | ~350     |
| Karnataka | 1–12 | ~45     | ~650     |
| **Total** | | **~135** | **~1,850** |

---

## XP & Gamification

| Action | XP |
|--------|----|
| Mark chapter In Progress | +10 |
| Mark chapter Completed | +50 |
| Mark chapter Revised | +30 |
| Log a test result | +20 |

**10 Levels:** Spark → Scout → Scholar → Achiever → Champion → Expert → Master → Legend → Elite → Titan

**12 Badges:** First Step, Getting Started, Scholar, 3-Day Warrior, Week Champion, Month Master, Test Taker, Exam Ready, Perfect Score, Subject Master, Revision Pro, Rising Star

---

## API Reference

```
POST  /api/auth/register    body: { name, email, password, board, classNum, stream?, schoolName? }
POST  /api/auth/login       body: { email, password }
GET   /api/me               → current user profile
GET   /api/syllabus         → subjects + chapters for user's board/class
GET   /api/progress         → { chapterId: { status, updated_at } }
POST  /api/progress         body: { chapterId, status }  → XP + badge updates
GET   /api/tests            → array of test results
POST  /api/tests            body: { subjectName, testType, score, maxScore, testDate, notes }
DEL   /api/tests/:id
GET   /api/planner          → { Mon: [...], Tue: [...], ... }
PUT   /api/planner          body: { Mon: [...], ... }
GET   /api/badges           → array with earned status
GET   /api/stats            → XP, level, streak, chapter counts, test avg
GET   /api/health           → { ok: true }
POST  /api/setup            header: x-setup-key  → runs schema.sql
```

---

## Suggested Next Features

1. **Daily Challenge** – "Study 2 chapters today" with flame icon, resets at midnight
2. **Spaced Repetition Alerts** – Remind when completed chapters are due for revision (7 → 14 → 30 day cycle)
3. **Boss Battle Mode** – Before an exam, all uncompleted chapters appear as "enemies" to defeat
4. **AI Chapter Explainer** – Tap any chapter → 3-sentence AI summary + key formula
5. **Class Leaderboard** – Anonymous rank among users of same board + class
6. **Exam Countdown** – Set exam date → dashboard shows urgency timer
7. **Weak Topic Detector** – Highlights chapters where test score was below 60%
8. **Parent Dashboard** – Weekly email/SMS summary of child's progress
9. **Offline PWA** – Service worker + background sync for areas with poor connectivity
10. **Flashcard Generator** – Auto-generate 5 Q&As per chapter (AI powered)
