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
