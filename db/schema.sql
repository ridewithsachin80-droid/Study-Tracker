-- ═══════════════════════════════════════════════════════════
--  StudyTracker SaaS – PostgreSQL Schema
--  Multi-tenant: one user = one student account
--  Boards: cbse | icse | karnataka
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  UNIQUE NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  board         VARCHAR(20)   NOT NULL CHECK (board IN ('cbse','icse','karnataka')),
  class_num     INTEGER       NOT NULL CHECK (class_num BETWEEN 1 AND 12),
  stream        VARCHAR(20)   CHECK (stream IN ('science','commerce','arts','general')),
  school_name   VARCHAR(200),
  avatar_color  VARCHAR(20)   DEFAULT '#22d3ee',
  -- gamification
  xp            INTEGER       DEFAULT 0,
  level         INTEGER       DEFAULT 1,
  streak        INTEGER       DEFAULT 0,
  last_visit    DATE,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- ── subjects (shared / board+class specific) ─────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id          SERIAL PRIMARY KEY,
  board       VARCHAR(20)   NOT NULL,
  class_num   INTEGER       NOT NULL,
  stream      VARCHAR(20),          -- NULL = all streams
  name        VARCHAR(100)  NOT NULL,
  icon        VARCHAR(10)   NOT NULL DEFAULT '📚',
  color       VARCHAR(20)   NOT NULL DEFAULT '#22d3ee',
  is_compet   BOOLEAN       DEFAULT false,  -- NEET/JEE relevant
  sort_order  INTEGER       DEFAULT 0
);

-- ── chapters per subject ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS chapters (
  id          SERIAL PRIMARY KEY,
  subject_id  INTEGER       REFERENCES subjects(id) ON DELETE CASCADE,
  name        VARCHAR(300)  NOT NULL,
  ch_type     VARCHAR(20)   DEFAULT 'regular', -- regular | neet | jee | extra
  sort_order  INTEGER       DEFAULT 0
);

-- ── per-student chapter progress ─────────────────────────────
CREATE TABLE IF NOT EXISTS chapter_progress (
  id          SERIAL PRIMARY KEY,
  user_id     UUID          REFERENCES users(id) ON DELETE CASCADE,
  chapter_id  INTEGER       REFERENCES chapters(id) ON DELETE CASCADE,
  status      SMALLINT      DEFAULT 0, -- 0=not started 1=in-progress 2=done 3=revised
  updated_at  TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (user_id, chapter_id)
);

-- ── test results ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_results (
  id           SERIAL PRIMARY KEY,
  user_id      UUID         REFERENCES users(id) ON DELETE CASCADE,
  subject_name VARCHAR(100),
  test_type    VARCHAR(50),
  score        NUMERIC(6,2),
  max_score    NUMERIC(6,2) DEFAULT 100,
  test_date    DATE         DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ── weekly planner (stored as JSON per user) ──────────────────
CREATE TABLE IF NOT EXISTS planner (
  user_id     UUID    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data        JSONB   NOT NULL DEFAULT '{}'::jsonb,  -- { Mon:[{subject,topic,mins}], ... }
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── badges earned ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_badges (
  id          SERIAL PRIMARY KEY,
  user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
  badge_id    VARCHAR(50) NOT NULL,
  earned_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

-- ── indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_progress_user    ON chapter_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_tests_user       ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_subj_board_class ON subjects(board, class_num);
CREATE INDEX IF NOT EXISTS idx_chap_subject     ON chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_badges_user      ON user_badges(user_id);

-- ═══════════════════════════════════════════════════════════
--  Parent Monitoring – migration (safe to re-run)
--  Adds a 'role' to users (student|parent) and lets a parent
--  account link to one or more student accounts read-only.
-- ═══════════════════════════════════════════════════════════

-- students already have NOT NULL board/class_num; parent accounts
-- don't have a board/class, so those columns must become nullable.
ALTER TABLE users ALTER COLUMN board     DROP NOT NULL;
ALTER TABLE users ALTER COLUMN class_num DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(10) NOT NULL DEFAULT 'student';

-- ── parent ↔ student links ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS parent_links (
  id          SERIAL PRIMARY KEY,
  parent_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (parent_id, student_id)
);

-- ── short-lived codes a student generates so a parent can link ─
CREATE TABLE IF NOT EXISTS link_codes (
  id          SERIAL PRIMARY KEY,
  student_id  UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  code        VARCHAR(8) UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_links_parent  ON parent_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_student ON parent_links(student_id);
CREATE INDEX IF NOT EXISTS idx_link_codes_code      ON link_codes(code);

-- ═══════════════════════════════════════════════════════════
--  Study Content + Practice Papers – migration (safe to re-run)
--  Chapter notes, a tagged question bank (neet | cbse format),
--  scored paper attempts, and a granular activity feed for parents.
-- ═══════════════════════════════════════════════════════════

-- ── study notes per chapter (written/reviewed content, not raw PDFs) ─
CREATE TABLE IF NOT EXISTS chapter_content (
  id          SERIAL PRIMARY KEY,
  chapter_id  INTEGER UNIQUE REFERENCES chapters(id) ON DELETE CASCADE,
  body        TEXT NOT NULL DEFAULT '',      -- markdown
  status      VARCHAR(10) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── question bank, tagged per exam format ───────────────────────────
CREATE TABLE IF NOT EXISTS question_bank (
  id             SERIAL PRIMARY KEY,
  chapter_id     INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
  exam_tag       VARCHAR(10) NOT NULL CHECK (exam_tag IN ('neet','cbse')),
  question_type  VARCHAR(20) NOT NULL DEFAULT 'mcq' CHECK (question_type IN ('mcq')), -- more types later
  question_text  TEXT NOT NULL,
  options        JSONB NOT NULL,             -- ["opt A","opt B","opt C","opt D"]
  correct_index  SMALLINT NOT NULL,           -- 0-based index into options
  marks          NUMERIC(4,1) NOT NULL DEFAULT 4,
  negative_marks NUMERIC(4,1) NOT NULL DEFAULT 0,
  difficulty     VARCHAR(10) DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  status         VARCHAR(10) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── scored practice-paper attempts (also mirrored into test_results) ─
CREATE TABLE IF NOT EXISTS paper_attempts (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  chapter_id  INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
  exam_tag    VARCHAR(10) NOT NULL,
  total_qs    INTEGER NOT NULL,
  correct_ct  INTEGER NOT NULL,
  wrong_ct    INTEGER NOT NULL,
  skipped_ct  INTEGER NOT NULL,
  score       NUMERIC(6,2) NOT NULL,
  max_score   NUMERIC(6,2) NOT NULL,
  answers     JSONB NOT NULL,                -- [{questionId,selectedIndex,correctIndex,isCorrect}]
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── granular activity feed (drives the parent "all activity" view) ──
CREATE TABLE IF NOT EXISTS activity_log (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type  VARCHAR(30) NOT NULL,          -- chapter_opened | progress_updated | test_logged | paper_attempted
  event_meta  JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qbank_chapter_exam ON question_bank(chapter_id, exam_tag);
CREATE INDEX IF NOT EXISTS idx_paper_attempts_user ON paper_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_time   ON activity_log(user_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════
--  Doubt Clarification – migration (safe to re-run)
--  Chapter-scoped AI doubt chat, logged for revision + parent view.
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS doubts (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  chapter_id  INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  provider    VARCHAR(20),                   -- groq | gemini | error
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doubts_user_time ON doubts(user_id, created_at DESC);
