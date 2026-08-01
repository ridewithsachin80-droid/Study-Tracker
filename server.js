'use strict';
// ════════════════════════════════════════════════════════════════
//  StudyTracker API  –  Node.js / Express  +  PostgreSQL
//  AUTO-INIT: On startup, creates tables and seeds syllabus data
//  automatically if the database is empty. No manual shell needed.
// ════════════════════════════════════════════════════════════════
const express  = require('express');
const cors     = require('cors');
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const path     = require('path');
const fs       = require('fs');
require('dotenv').config();

const app  = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_prod';
const PORT       = process.env.PORT || 3000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '6mb' })); // raised for base64-encoded voice-doubt audio clips

// ════════════════════════════════════════════════════════════════
//  AUTO-INIT  –  runs on every startup, safe to re-run
// ════════════════════════════════════════════════════════════════
async function autoInit() {
  try {
    console.log('🔧 Running DB auto-init...');

    // 1. Create all tables (IF NOT EXISTS = safe to run multiple times)
    const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✅ Schema ready');

    // 2. Seed only if subjects table is empty (first boot only)
    const { rows } = await pool.query('SELECT COUNT(*) AS c FROM subjects');
    if (parseInt(rows[0].c) === 0) {
      console.log('📚 Subjects table empty – seeding syllabus data...');
      const { seedDatabase } = require('./db/seed');
      await seedDatabase(pool);
    } else {
      console.log(`📚 Syllabus already loaded (${rows[0].c} subjects) – skipping seed`);
    }
  } catch (e) {
    console.error('❌ Auto-init error:', e.message);
    // Non-fatal: app still starts, but DB may not work until fixed
  }
}

// ── auth middleware ───────────────────────────────────────────────
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

// ── role gate (looked up fresh from DB, not trusted from JWT) ──────
function requireRole(role) {
  return async (req, res, next) => {
    try {
      const { rows } = await pool.query('SELECT role FROM users WHERE id=$1', [req.user.id]);
      if (!rows.length || rows[0].role !== role) return res.status(403).json({ error: 'Forbidden' });
      next();
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
  };
}

// ── parent must be linked to the child they're requesting ─────────
async function requireLinkedChild(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT 1 FROM parent_links WHERE parent_id=$1 AND student_id=$2',
      [req.user.id, req.params.studentId]
    );
    if (!rows.length) return res.status(403).json({ error: 'Not linked to this student' });
    next();
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
}

function genLinkCode() {
  // avoids ambiguous chars (0/O, 1/I) since a parent types this by hand
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// ── activity log helper (drives the parent "all activity" feed) ────
async function logActivity(userId, eventType, meta = {}) {
  try {
    await pool.query('INSERT INTO activity_log(user_id,event_type,event_meta) VALUES($1,$2,$3)', [userId, eventType, meta]);
  } catch (e) { console.error('logActivity failed:', e.message); }
}

// ── AI doubt-solver: Groq primary, Gemini fallback ──────────────────
const GROQ_MODEL   = process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

async function askGroq(systemPrompt, question) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role:'system', content:systemPrompt }, { role:'user', content:question }],
      max_tokens: 700, temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq: empty response');
  return text;
}

async function askGemini(systemPrompt, question) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({
      contents: [{ parts:[{ text:`${systemPrompt}\n\nStudent's question: ${question}` }] }],
      generationConfig: { maxOutputTokens:700, temperature:0.4 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini: empty response');
  return text;
}

async function askAI(systemPrompt, question) {
  try { return { text: await askGroq(systemPrompt, question), provider:'groq' }; }
  catch (e1) {
    console.error('Groq failed, falling back to Gemini:', e1.message);
    try { return { text: await askGemini(systemPrompt, question), provider:'gemini' }; }
    catch (e2) {
      console.error('Gemini also failed:', e2.message);
      throw new Error('AI doubt-solver is temporarily unavailable. Please try again shortly.');
    }
  }
}

// ── voice input: transcribe a recorded doubt via Groq Whisper ──────
async function transcribeAudio(base64Audio, mimeType) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
  const buffer = Buffer.from(base64Audio, 'base64');
  const blob = new Blob([buffer], { type: mimeType || 'audio/webm' });
  const form = new FormData();
  form.append('file', blob, 'doubt.webm');
  form.append('model', 'whisper-large-v3');
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Groq transcription HTTP ${res.status}`);
  const data = await res.json();
  if (!data.text) throw new Error('Transcription returned no text — try speaking again');
  return data.text.trim();
}

// ── XP helpers ────────────────────────────────────────────────────
const XP_MAP = { 0:0, 1:10, 2:50, 3:30 };
const LVL_T  = [0,200,500,1000,2000,3500,5500,8000,11000,15000];
const calcLvl = xp => { let l=1; LVL_T.forEach((t,i)=>{ if(xp>=t) l=i+1; }); return Math.min(l,LVL_T.length); };

// ── badge defs ────────────────────────────────────────────────────
const BADGES = [
  { id:'first_chapter',  label:'First Step',      emoji:'🎯', desc:'Complete your first chapter',           check:s=>s.completed>=1 },
  { id:'ten_chapters',   label:'Getting Started',  emoji:'🌟', desc:'Complete 10 chapters',                 check:s=>s.completed>=10 },
  { id:'fifty_chapters', label:'Scholar',          emoji:'📚', desc:'Complete 50 chapters',                 check:s=>s.completed>=50 },
  { id:'streak_3',       label:'3-Day Warrior',    emoji:'🔥', desc:'3-day study streak',                   check:s=>s.streak>=3 },
  { id:'streak_7',       label:'Week Champion',    emoji:'⚡', desc:'7-day study streak',                   check:s=>s.streak>=7 },
  { id:'streak_30',      label:'Month Master',     emoji:'🏆', desc:'30-day study streak',                  check:s=>s.streak>=30 },
  { id:'first_test',     label:'Test Taker',       emoji:'📝', desc:'Log your first test',                 check:s=>s.tests>=1 },
  { id:'ten_tests',      label:'Exam Ready',       emoji:'🎓', desc:'Log 10 tests',                        check:s=>s.tests>=10 },
  { id:'perfect_score',  label:'Perfect Score',    emoji:'💯', desc:'Score 100% in a test',                 check:s=>s.perfectTests>=1 },
  { id:'subject_master', label:'Subject Master',   emoji:'🥇', desc:'Complete all chapters in a subject',  check:s=>s.subjectMastered>=1 },
  { id:'ten_revised',    label:'Revision Pro',     emoji:'🔄', desc:'Revise 10 chapters',                  check:s=>s.revised>=10 },
  { id:'level_5',        label:'Rising Star',      emoji:'⭐', desc:'Reach level 5',                       check:s=>s.level>=5 },
];

async function awardBadges(client, uid) {
  const [p,t,u,b] = await Promise.all([
    client.query('SELECT status, COUNT(*) c FROM chapter_progress WHERE user_id=$1 GROUP BY status',[uid]),
    client.query('SELECT COUNT(*) total, COUNT(CASE WHEN score/NULLIF(max_score,0)*100>=100 THEN 1 END) perf FROM test_results WHERE user_id=$1',[uid]),
    client.query('SELECT streak,level FROM users WHERE id=$1',[uid]),
    client.query('SELECT badge_id FROM user_badges WHERE user_id=$1',[uid]),
  ]);
  const earned = new Set(b.rows.map(r=>r.badge_id));
  const pg = Object.fromEntries(p.rows.map(r=>[r.status,parseInt(r.c)]));
  const mr = await client.query(`SELECT s.id FROM subjects s JOIN chapters ch ON ch.subject_id=s.id LEFT JOIN chapter_progress cp ON cp.chapter_id=ch.id AND cp.user_id=$1 GROUP BY s.id HAVING COUNT(ch.id)=COUNT(CASE WHEN cp.status>=2 THEN 1 END) AND COUNT(ch.id)>0`,[uid]);
  const stats = { completed:pg[2]||0, revised:pg[3]||0, tests:parseInt(t.rows[0].total), perfectTests:parseInt(t.rows[0].perf), streak:parseInt(u.rows[0].streak), level:parseInt(u.rows[0].level), subjectMastered:mr.rows.length };
  const newB = [];
  for (const bd of BADGES) {
    if (!earned.has(bd.id) && bd.check(stats)) {
      await client.query('INSERT INTO user_badges(user_id,badge_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[uid,bd.id]);
      newB.push(bd);
    }
  }
  return newB;
}

// ════════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════════
app.post('/api/auth/register', async (req,res) => {
  const { name,email,password,board,classNum,stream,schoolName } = req.body;
  const role = req.body.role === 'parent' ? 'parent' : 'student';

  if (!name||!email||!password) return res.status(400).json({error:'Missing fields'});
  if (password.length < 6) return res.status(400).json({error:'Password must be at least 6 characters'});

  if (role === 'student') {
    if (!board||!classNum) return res.status(400).json({error:'Missing fields'});
    if (!['cbse','icse','karnataka'].includes(board)) return res.status(400).json({error:'Invalid board'});
    const cls = parseInt(classNum);
    if (cls<1||cls>12) return res.status(400).json({error:'Invalid class'});
  }

  try {
    const hash = await bcrypt.hash(password,10);
    const cls = role==='student' ? parseInt(classNum) : null;
    const {rows:[user]} = await pool.query(
      `INSERT INTO users(name,email,password_hash,board,class_num,stream,school_name,role)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,name,email,board,class_num,stream,role,xp,level,streak`,
      [name.trim(),email.toLowerCase().trim(),hash,role==='student'?board:null,cls,role==='student'?(stream||null):null,role==='student'?(schoolName||null):null,role]
    );
    if (role === 'student') {
      await pool.query(`INSERT INTO planner(user_id,data) VALUES($1,'{}') ON CONFLICT DO NOTHING`,[user.id]);
    }
    const token = jwt.sign({id:user.id,email:user.email,role:user.role},JWT_SECRET,{expiresIn:'30d'});
    res.status(201).json({token,user});
  } catch(e) {
    if (e.code==='23505') return res.status(409).json({error:'Email already registered'});
    console.error(e); res.status(500).json({error:'Server error'});
  }
});

app.post('/api/auth/login', async (req,res) => {
  const {email,password} = req.body;
  try {
    const {rows} = await pool.query('SELECT * FROM users WHERE email=$1',[email?.toLowerCase().trim()]);
    if (!rows.length) return res.status(401).json({error:'Invalid credentials'});
    const user = rows[0];
    if (!(await bcrypt.compare(password,user.password_hash))) return res.status(401).json({error:'Invalid credentials'});
    const today = new Date().toISOString().slice(0,10);
    const yest  = new Date(Date.now()-86400000).toISOString().slice(0,10);
    const lastV = user.last_visit?.toISOString?.().slice(0,10);
    let streak  = user.streak;
    if (lastV===yest) streak++; else if (lastV!==today) streak=1;
    await pool.query('UPDATE users SET streak=$1,last_visit=$2 WHERE id=$3',[streak,today,user.id]);
    const token = jwt.sign({id:user.id,email:user.email,role:user.role},JWT_SECRET,{expiresIn:'30d'});
    const {password_hash,...safe} = {...user,streak};
    res.json({token,user:safe});
  } catch(e) { console.error(e); res.status(500).json({error:'Server error'}); }
});

app.get('/api/me', auth, async (req,res) => {
  const {rows} = await pool.query(`SELECT id,name,email,board,class_num,stream,school_name,role,xp,level,streak,last_visit,avatar_color,created_at FROM users WHERE id=$1`,[req.user.id]);
  if (!rows.length) return res.status(404).json({error:'Not found'});
  res.json(rows[0]);
});

// ════════════════════════════════════════════════════════════════
//  SYLLABUS
// ════════════════════════════════════════════════════════════════
app.get('/api/syllabus', auth, async (req,res) => {
  const {rows:[u]} = await pool.query('SELECT board,class_num,stream FROM users WHERE id=$1',[req.user.id]);
  if (!u) return res.status(404).json({error:'Not found'});
  const {rows:subs} = await pool.query(
    `SELECT * FROM subjects WHERE board=$1 AND class_num=$2 AND (stream IS NULL OR stream=$3) ORDER BY sort_order`,
    [u.board,u.class_num,u.stream||'general']
  );
  const result = await Promise.all(subs.map(async s => {
    const {rows:chs} = await pool.query('SELECT id,name,ch_type,sort_order FROM chapters WHERE subject_id=$1 ORDER BY sort_order',[s.id]);
    return {...s,chapters:chs};
  }));
  res.json(result);
});

// ════════════════════════════════════════════════════════════════
//  PROGRESS
// ════════════════════════════════════════════════════════════════
app.get('/api/progress', auth, async (req,res) => {
  const {rows} = await pool.query('SELECT chapter_id,status,updated_at FROM chapter_progress WHERE user_id=$1',[req.user.id]);
  const map = {}; rows.forEach(r=>{ map[r.chapter_id]={status:r.status,updated_at:r.updated_at}; });
  res.json(map);
});

app.post('/api/progress', auth, async (req,res) => {
  const {chapterId,status} = req.body;
  if (status<0||status>3) return res.status(400).json({error:'Invalid status'});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const old = await client.query('SELECT status FROM chapter_progress WHERE user_id=$1 AND chapter_id=$2',[req.user.id,chapterId]);
    const oldSt = old.rows[0]?.status??0;
    await client.query(
      `INSERT INTO chapter_progress(user_id,chapter_id,status,updated_at) VALUES($1,$2,$3,NOW())
       ON CONFLICT(user_id,chapter_id) DO UPDATE SET status=$3,updated_at=NOW()`,
      [req.user.id,chapterId,status]
    );
    let xpEarned=0;
    if (status>oldSt) {
      xpEarned=XP_MAP[status]||0;
      if (xpEarned>0) {
        await client.query('UPDATE users SET xp=xp+$1 WHERE id=$2',[xpEarned,req.user.id]);
        const {rows:[{xp}]} = await client.query('SELECT xp FROM users WHERE id=$1',[req.user.id]);
        await client.query('UPDATE users SET level=$1 WHERE id=$2',[calcLvl(xp),req.user.id]);
      }
    }
    const newBadges = await awardBadges(client,req.user.id);
    await client.query('COMMIT');
    logActivity(req.user.id, 'progress_updated', { chapterId, status });
    const {rows:[u]} = await client.query('SELECT xp,level,streak FROM users WHERE id=$1',[req.user.id]);
    res.json({ok:true,xpEarned,newBadges,...u});
  } catch(e) { await client.query('ROLLBACK'); console.error(e); res.status(500).json({error:'Server error'}); }
  finally { client.release(); }
});

// ════════════════════════════════════════════════════════════════
//  TESTS
// ════════════════════════════════════════════════════════════════
app.get('/api/tests', auth, async (req,res) => {
  const {rows} = await pool.query('SELECT * FROM test_results WHERE user_id=$1 ORDER BY test_date DESC,created_at DESC',[req.user.id]);
  res.json(rows);
});

app.post('/api/tests', auth, async (req,res) => {
  const {subjectName,testType,score,maxScore,testDate,notes,difficultyTier,classRank,classSize} = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {rows:[u]} = await client.query('SELECT class_num FROM users WHERE id=$1',[req.user.id]);
    const {rows:[t]} = await client.query(
      `INSERT INTO test_results(user_id,subject_name,test_type,score,max_score,test_date,notes,difficulty_tier,class_rank,class_size,class_num_at_test)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.user.id,subjectName,testType,score,maxScore||100,testDate||new Date(),notes,difficultyTier||null,classRank||null,classSize||null,u?.class_num||null]
    );
    await client.query('UPDATE users SET xp=xp+20 WHERE id=$1',[req.user.id]);
    const {rows:[{xp}]} = await client.query('SELECT xp FROM users WHERE id=$1',[req.user.id]);
    await client.query('UPDATE users SET level=$1 WHERE id=$2',[calcLvl(xp),req.user.id]);
    const newBadges = await awardBadges(client,req.user.id);
    await client.query('COMMIT');
    logActivity(req.user.id, 'test_logged', { subjectName, testType, score, maxScore: maxScore||100 });
    res.json({test:t,newBadges,xpEarned:20});
  } catch(e) { await client.query('ROLLBACK'); console.error(e); res.status(500).json({error:'Server error'}); }
  finally { client.release(); }
});

app.delete('/api/tests/:id', auth, async (req,res) => {
  await pool.query('DELETE FROM test_results WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);
  res.json({ok:true});
});

// ════════════════════════════════════════════════════════════════
//  PLANNER
// ════════════════════════════════════════════════════════════════
app.get('/api/planner', auth, async (req,res) => {
  const {rows} = await pool.query('SELECT data FROM planner WHERE user_id=$1',[req.user.id]);
  res.json(rows[0]?.data||{});
});

app.put('/api/planner', auth, async (req,res) => {
  await pool.query(
    `INSERT INTO planner(user_id,data,updated_at) VALUES($1,$2,NOW())
     ON CONFLICT(user_id) DO UPDATE SET data=$2,updated_at=NOW()`,
    [req.user.id,JSON.stringify(req.body)]
  );
  res.json({ok:true});
});

// ════════════════════════════════════════════════════════════════
//  BADGES & STATS
// ════════════════════════════════════════════════════════════════
app.get('/api/badges', auth, async (req,res) => {
  const {rows} = await pool.query('SELECT badge_id,earned_at FROM user_badges WHERE user_id=$1 ORDER BY earned_at',[req.user.id]);
  const em = Object.fromEntries(rows.map(r=>[r.badge_id,r.earned_at]));
  res.json(BADGES.map(b=>({...b,earned:!!em[b.id],earned_at:em[b.id]||null})));
});

app.get('/api/stats', auth, async (req,res) => {
  const [user,prog,tests] = await Promise.all([
    pool.query('SELECT xp,level,streak,last_visit FROM users WHERE id=$1',[req.user.id]),
    pool.query('SELECT status,COUNT(*) c FROM chapter_progress WHERE user_id=$1 GROUP BY status',[req.user.id]),
    pool.query('SELECT COUNT(*) total,AVG(score/NULLIF(max_score,0)*100) avg_score FROM test_results WHERE user_id=$1',[req.user.id]),
  ]);
  const pm = Object.fromEntries(prog.rows.map(r=>[r.status,parseInt(r.c)]));
  res.json({...user.rows[0],nextLvlXp:LVL_T[Math.min(parseInt(user.rows[0].level),LVL_T.length-1)],levelThresholds:LVL_T,progress:pm,totalTests:parseInt(tests.rows[0].total),avgScore:parseFloat(tests.rows[0].avg_score||0).toFixed(1)});
});

// ════════════════════════════════════════════════════════════════
//  STUDY CONTENT  (chapter notes, written/reviewed — not raw PDFs)
// ════════════════════════════════════════════════════════════════
app.get('/api/chapter/:id/content', auth, async (req,res) => {
  const {rows} = await pool.query(`SELECT body,updated_at FROM chapter_content WHERE chapter_id=$1 AND status='published'`,[req.params.id]);
  if (!rows.length) return res.json({available:false});
  logActivity(req.user.id, 'chapter_opened', { chapterId: parseInt(req.params.id) });
  res.json({available:true, body:rows[0].body, updatedAt:rows[0].updated_at});
});

// tells the frontend which practice-paper formats have questions ready
app.get('/api/chapter/:id/paper-info', auth, async (req,res) => {
  const {rows} = await pool.query(
    `SELECT exam_tag,COUNT(*) c FROM question_bank WHERE chapter_id=$1 AND status='published' GROUP BY exam_tag`,
    [req.params.id]
  );
  const counts = { neet:0, cbse:0 };
  rows.forEach(r => { counts[r.exam_tag] = parseInt(r.c); });
  res.json(counts);
});

// ── admin content authoring (protected by SETUP_KEY, same pattern as /api/setup) ──
function requireSetupKey(req,res,next) {
  if (req.headers['x-setup-key'] !== process.env.SETUP_KEY) return res.status(403).json({error:'Forbidden'});
  next();
}

app.post('/api/admin/chapter-content', requireSetupKey, async (req,res) => {
  const { chapterId, body, status } = req.body;
  if (!chapterId||!body) return res.status(400).json({error:'Missing fields'});
  try {
    const {rows:[row]} = await pool.query(
      `INSERT INTO chapter_content(chapter_id,body,status,updated_at) VALUES($1,$2,$3,NOW())
       ON CONFLICT(chapter_id) DO UPDATE SET body=$2,status=$3,updated_at=NOW() RETURNING *`,
      [chapterId, body, status==='published'?'published':'draft']
    );
    res.json(row);
  } catch(e) { console.error(e); res.status(500).json({error:'Server error'}); }
});

app.post('/api/admin/questions/bulk', requireSetupKey, async (req,res) => {
  const { chapterId, examTag, questions } = req.body;
  if (!chapterId||!['neet','cbse'].includes(examTag)||!Array.isArray(questions)||!questions.length)
    return res.status(400).json({error:'Missing/invalid fields'});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = [];
    for (const q of questions) {
      if (!q.text||!Array.isArray(q.options)||q.options.length<2||q.correctIndex==null) continue;
      const {rows:[row]} = await client.query(
        `INSERT INTO question_bank(chapter_id,exam_tag,question_text,options,correct_index,marks,negative_marks,difficulty,status)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [chapterId, examTag, q.text, JSON.stringify(q.options), q.correctIndex,
         q.marks ?? (examTag==='neet'?4:1), q.negativeMarks ?? (examTag==='neet'?1:0),
         q.difficulty||'medium', q.status==='draft'?'draft':'published']
      );
      inserted.push(row.id);
    }
    await client.query('COMMIT');
    res.json({ok:true,insertedCount:inserted.length});
  } catch(e) { await client.query('ROLLBACK'); console.error(e); res.status(500).json({error:'Server error'}); }
  finally { client.release(); }
});

app.delete('/api/admin/questions/:id', requireSetupKey, async (req,res) => {
  await pool.query('DELETE FROM question_bank WHERE id=$1',[req.params.id]);
  res.json({ok:true});
});

// ════════════════════════════════════════════════════════════════
//  PRACTICE PAPERS  (NEET-format +4/-1 · CBSE-format per-question marks)
// ════════════════════════════════════════════════════════════════
const PAPER_SIZE = 15; // questions per generated practice paper

app.post('/api/papers/generate', auth, async (req,res) => {
  const { chapterId, examTag } = req.body;
  if (!chapterId||!['neet','cbse'].includes(examTag)) return res.status(400).json({error:'Missing/invalid fields'});
  const {rows} = await pool.query(
    `SELECT id,question_text,options,marks,negative_marks FROM question_bank
     WHERE chapter_id=$1 AND exam_tag=$2 AND status='published'
     ORDER BY RANDOM() LIMIT $3`,
    [chapterId, examTag, PAPER_SIZE]
  );
  if (!rows.length) return res.status(404).json({error:'No practice questions available for this chapter yet'});
  res.json({
    examTag,
    markingNote: examTag==='neet' ? '+4 for correct, −1 for incorrect, 0 if skipped' : 'Marks per question, no negative marking',
    questions: rows.map(r => ({ id:r.id, text:r.question_text, options:r.options, marks:r.marks, negativeMarks:r.negative_marks })),
  });
});

app.post('/api/papers/submit', auth, async (req,res) => {
  const { chapterId, examTag, answers } = req.body; // answers: [{questionId, selectedIndex}]
  if (!chapterId||!['neet','cbse'].includes(examTag)||!Array.isArray(answers)||!answers.length)
    return res.status(400).json({error:'Missing/invalid fields'});
  const ids = answers.map(a => a.questionId);
  const {rows:qs} = await pool.query(`SELECT id,correct_index,marks,negative_marks FROM question_bank WHERE id = ANY($1::int[])`,[ids]);
  const qMap = Object.fromEntries(qs.map(q => [q.id,q]));

  let score=0, maxScore=0, correctCt=0, wrongCt=0, skippedCt=0;
  const graded = answers.map(a => {
    const q = qMap[a.questionId];
    if (!q) return null;
    maxScore += parseFloat(q.marks);
    const answered = a.selectedIndex!=null && a.selectedIndex>=0;
    const isCorrect = answered && a.selectedIndex===q.correct_index;
    if (!answered) skippedCt++;
    else if (isCorrect) { correctCt++; score+=parseFloat(q.marks); }
    else { wrongCt++; score-=parseFloat(q.negative_marks); }
    return { questionId:a.questionId, selectedIndex: answered?a.selectedIndex:null, correctIndex:q.correct_index, isCorrect };
  }).filter(Boolean);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO paper_attempts(user_id,chapter_id,exam_tag,total_qs,correct_ct,wrong_ct,skipped_ct,score,max_score,answers)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [req.user.id, chapterId, examTag, graded.length, correctCt, wrongCt, skippedCt, score, maxScore, JSON.stringify(graded)]
    );
    // mirror into test_results so it feeds existing stats/XP/badges/parent views
    const {rows:[ch]} = await client.query(`SELECT s.name AS subject_name FROM chapters c JOIN subjects s ON s.id=c.subject_id WHERE c.id=$1`,[chapterId]);
    await client.query(
      `INSERT INTO test_results(user_id,subject_name,test_type,score,max_score,notes)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [req.user.id, ch?.subject_name||'Practice', examTag==='neet'?'NEET Practice Paper':'CBSE Practice Paper', score, maxScore, `${correctCt} correct, ${wrongCt} wrong, ${skippedCt} skipped`]
    );
    await client.query('UPDATE users SET xp=xp+20 WHERE id=$1',[req.user.id]);
    const {rows:[{xp}]} = await client.query('SELECT xp FROM users WHERE id=$1',[req.user.id]);
    await client.query('UPDATE users SET level=$1 WHERE id=$2',[calcLvl(xp),req.user.id]);
    const newBadges = await awardBadges(client, req.user.id);
    await client.query('COMMIT');
    logActivity(req.user.id, 'paper_attempted', { chapterId, examTag, score, maxScore, correctCt, wrongCt, skippedCt });
    res.json({ score, maxScore, correctCt, wrongCt, skippedCt, graded, xpEarned:20, newBadges });
  } catch(e) { await client.query('ROLLBACK'); console.error(e); res.status(500).json({error:'Server error'}); }
  finally { client.release(); }
});

// ════════════════════════════════════════════════════════════════
//  DOUBT CLARIFICATION  (chapter-scoped AI chat)
// ════════════════════════════════════════════════════════════════
app.post('/api/doubts/ask', auth, async (req,res) => {
  const { chapterId, question } = req.body;
  if (!question || !question.trim()) return res.status(400).json({error:'Enter your doubt'});
  if (question.length > 1000) return res.status(400).json({error:'Question is too long'});

  try {
    const {rows:[u]} = await pool.query('SELECT board,class_num,stream FROM users WHERE id=$1',[req.user.id]);

    let chapterCtx = '';
    if (chapterId) {
      const {rows:[ch]} = await pool.query(
        `SELECT c.name AS chapter_name, s.name AS subject_name, cc.body AS content
         FROM chapters c JOIN subjects s ON s.id=c.subject_id
         LEFT JOIN chapter_content cc ON cc.chapter_id=c.id AND cc.status='published'
         WHERE c.id=$1`,[chapterId]
      );
      if (ch) {
        chapterCtx = `The student is currently studying "${ch.chapter_name}" in ${ch.subject_name}.`;
        if (ch.content) chapterCtx += ` Here are the chapter notes for reference:\n${ch.content.slice(0,3000)}`;
      }
    }

    const systemPrompt =
      `You are a patient, encouraging tutor for an Indian school student in Class ${u?.class_num||'-'} ` +
      `(${(u?.board||'').toUpperCase()} board${u?.stream?`, ${u.stream} stream`:''}). ` +
      `${chapterCtx} ` +
      `Explain clearly and simply, step by step, using examples where useful. ` +
      `If this looks like NEET-level content, you may add slightly more depth; for CBSE-level, keep it exam-appropriate for the student's class. ` +
      `Keep the answer focused and not overly long. Never solve in a way that skips reasoning — show the "why", not just the final answer.`;

    const { text, provider } = await askAI(systemPrompt, question.trim());

    await pool.query(
      `INSERT INTO doubts(user_id,chapter_id,question,answer,provider) VALUES($1,$2,$3,$4,$5)`,
      [req.user.id, chapterId||null, question.trim(), text, provider]
    );
    logActivity(req.user.id, 'doubt_asked', { chapterId: chapterId||null, question: question.trim().slice(0,140) });
    res.json({ answer:text, provider });
  } catch(e) {
    console.error(e);
    res.status(503).json({error: e.message || 'AI doubt-solver is temporarily unavailable'});
  }
});

app.get('/api/doubts', auth, async (req,res) => {
  const params = [req.user.id];
  let where = 'user_id=$1';
  if (req.query.chapterId) { params.push(req.query.chapterId); where += ` AND chapter_id=$${params.length}`; }
  const {rows} = await pool.query(`SELECT id,chapter_id,question,answer,created_at FROM doubts WHERE ${where} ORDER BY created_at DESC LIMIT 100`,params);
  res.json(rows);
});

// voice input: student records a doubt, this turns it into text for the box above
app.post('/api/doubts/transcribe', auth, async (req,res) => {
  const { audioBase64, mimeType } = req.body;
  if (!audioBase64) return res.status(400).json({error:'No audio received'});
  try {
    const text = await transcribeAudio(audioBase64, mimeType);
    res.json({ text });
  } catch(e) {
    console.error(e);
    res.status(503).json({error: e.message || 'Voice transcription is temporarily unavailable — please type instead'});
  }
});

// ════════════════════════════════════════════════════════════════
//  NEET TRAJECTORY ANALYSIS
// ════════════════════════════════════════════════════════════════
app.post('/api/analysis/neet-projection', auth, requireRole('student'), async (req,res) => {
  const {rows:[u]} = await pool.query('SELECT name,board,class_num,stream FROM users WHERE id=$1',[req.user.id]);
  const {rows:tests} = await pool.query(
    `SELECT subject_name,test_type,score,max_score,test_date,notes,difficulty_tier,class_rank,class_size,class_num_at_test
     FROM test_results WHERE user_id=$1 ORDER BY test_date ASC`,[req.user.id]
  );
  if (!tests.length) return res.status(400).json({error:'Log at least one test before requesting a trajectory analysis'});

  const summary = tests.map(t => {
    const pct = Math.round(t.score/t.max_score*100);
    const rankPart = t.class_rank && t.class_size ? `, rank ${t.class_rank}/${t.class_size} in class` : '';
    const diffPart = t.difficulty_tier ? `, paper difficulty: ${t.difficulty_tier}` : '';
    const dateStr = t.test_date instanceof Date ? t.test_date.toISOString().slice(0,10) : (t.test_date||'');
    return `- Class ${t.class_num_at_test||'?'}, ${dateStr}: ${t.subject_name} ${t.test_type} — ${t.score}/${t.max_score} (${pct}%)${rankPart}${diffPart}${t.notes?`. Notes: ${t.notes}`:''}`;
  }).join('\n');

  const systemPrompt =
    `You are an experienced NEET coaching mentor analysing a student's academic trajectory for their parent. ` +
    `Student: Class ${u.class_num} (${(u.board||'').toUpperCase()} board${u.stream?`, ${u.stream}`:''}), aiming for NEET. ` +
    `Here is their full test history so far, oldest to newest:\n${summary}\n\n` +
    `Project a realistic NEET score range (out of 720) they might achieve in Class 12 IF their current trend continues. Follow these rules strictly:\n` +
    `1. Normalize each score by its stated paper difficulty — a 60% on a "very_hard" paper is a stronger signal than 60% on a "standard" one.\n` +
    `2. Weight class rank/percentile more heavily than raw percentage when both are available, since rank is cohort-relative and raw % is paper-dependent.\n` +
    `3. Be honest about uncertainty: give a WIDE range, not false precision, and state confidence as low/moderate/high based on how much data exists and how many years remain until Class 12.\n` +
    `4. Name 1-2 specific subjects that are the strongest lever for improvement, and briefly say why.\n` +
    `5. Never sound alarmist or falsely certain — this guides effort, it does not predict fate.\n` +
    `Start your reply with exactly this format on the first two lines: "PROJECTED_RANGE: <min>-<max>" then "CONFIDENCE: low|moderate|high", then a blank line, then a clear, warm, honest 150-250 word analysis.`;

  try {
    const { text, provider } = await askAI(systemPrompt, 'Please analyse this trajectory now.');
    const rangeMatch = text.match(/PROJECTED_RANGE:\s*(\d+)\s*-\s*(\d+)/i);
    const confMatch  = text.match(/CONFIDENCE:\s*(low|moderate|high)/i);
    const narrative  = text.replace(/PROJECTED_RANGE:.*\n?/i,'').replace(/CONFIDENCE:.*\n?/i,'').trim();

    const {rows:[row]} = await pool.query(
      `INSERT INTO neet_projections(user_id,projection_text,projected_min,projected_max,confidence,based_on_test_count,provider)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, narrative, rangeMatch?.[1]||null, rangeMatch?.[2]||null, confMatch?.[1]?.toLowerCase()||null, tests.length, provider]
    );
    logActivity(req.user.id, 'trajectory_analyzed', { testCount: tests.length, projectedMin: row.projected_min, projectedMax: row.projected_max });
    res.json(row);
  } catch(e) {
    console.error(e);
    res.status(503).json({error: e.message || 'Trajectory analysis is temporarily unavailable'});
  }
});

app.get('/api/analysis/neet-projection/latest', auth, async (req,res) => {
  const {rows} = await pool.query('SELECT * FROM neet_projections WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',[req.user.id]);
  res.json(rows[0]||null);
});

// ════════════════════════════════════════════════════════════════
//  PARENT MONITORING
// ════════════════════════════════════════════════════════════════

// ── student: generate / fetch a link code for a parent to use ─────
app.post('/api/student/link-code', auth, requireRole('student'), async (req,res) => {
  try {
    const code = genLinkCode();
    const expiresAt = new Date(Date.now() + 24*60*60*1000); // 24h
    const {rows:[row]} = await pool.query(
      `INSERT INTO link_codes(student_id,code,expires_at) VALUES($1,$2,$3)
       ON CONFLICT(student_id) DO UPDATE SET code=$2,expires_at=$3,created_at=NOW()
       RETURNING code,expires_at`,
      [req.user.id,code,expiresAt]
    );
    res.json(row);
  } catch(e) { console.error(e); res.status(500).json({error:'Server error'}); }
});

app.get('/api/student/link-code', auth, requireRole('student'), async (req,res) => {
  const {rows} = await pool.query('SELECT code,expires_at FROM link_codes WHERE student_id=$1 AND expires_at>NOW()',[req.user.id]);
  res.json(rows[0]||null);
});

// ── student: see (and revoke) which parents are watching this account ─
app.get('/api/student/parents', auth, requireRole('student'), async (req,res) => {
  const {rows} = await pool.query(
    `SELECT u.id,u.name,u.email,pl.created_at AS linked_at
     FROM parent_links pl JOIN users u ON u.id=pl.parent_id
     WHERE pl.student_id=$1 ORDER BY pl.created_at`,
    [req.user.id]
  );
  res.json(rows);
});

app.delete('/api/student/parents/:parentId', auth, requireRole('student'), async (req,res) => {
  await pool.query('DELETE FROM parent_links WHERE parent_id=$1 AND student_id=$2',[req.params.parentId,req.user.id]);
  res.json({ok:true});
});

// ── parent: link to a child using their code ───────────────────────
app.post('/api/parent/link', auth, requireRole('parent'), async (req,res) => {
  const code = (req.body.code||'').toUpperCase().trim();
  if (!code) return res.status(400).json({error:'Enter a code'});
  try {
    const {rows} = await pool.query('SELECT student_id FROM link_codes WHERE code=$1 AND expires_at>NOW()',[code]);
    if (!rows.length) return res.status(400).json({error:'Invalid or expired code'});
    const studentId = rows[0].student_id;
    await pool.query('INSERT INTO parent_links(parent_id,student_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.user.id,studentId]);
    const {rows:[student]} = await pool.query(
      `SELECT id,name,board,class_num,stream,avatar_color,xp,level,streak FROM users WHERE id=$1`,[studentId]
    );
    res.json({ok:true,child:student});
  } catch(e) { console.error(e); res.status(500).json({error:'Server error'}); }
});

// ── parent: list linked children ───────────────────────────────────
app.get('/api/parent/children', auth, requireRole('parent'), async (req,res) => {
  const {rows} = await pool.query(
    `SELECT u.id,u.name,u.board,u.class_num,u.stream,u.school_name,u.avatar_color,u.xp,u.level,u.streak
     FROM parent_links pl JOIN users u ON u.id=pl.student_id
     WHERE pl.parent_id=$1 ORDER BY u.name`,
    [req.user.id]
  );
  res.json(rows);
});

app.delete('/api/parent/children/:studentId', auth, requireRole('parent'), async (req,res) => {
  await pool.query('DELETE FROM parent_links WHERE parent_id=$1 AND student_id=$2',[req.user.id,req.params.studentId]);
  res.json({ok:true});
});

// ── parent: read-only views of a linked child's data ───────────────
app.get('/api/parent/child/:studentId/stats', auth, requireRole('parent'), requireLinkedChild, async (req,res) => {
  const sid = req.params.studentId;
  const [user,prog,tests] = await Promise.all([
    pool.query('SELECT name,xp,level,streak,last_visit FROM users WHERE id=$1',[sid]),
    pool.query('SELECT status,COUNT(*) c FROM chapter_progress WHERE user_id=$1 GROUP BY status',[sid]),
    pool.query('SELECT COUNT(*) total,AVG(score/NULLIF(max_score,0)*100) avg_score FROM test_results WHERE user_id=$1',[sid]),
  ]);
  if (!user.rows.length) return res.status(404).json({error:'Not found'});
  const pm = Object.fromEntries(prog.rows.map(r=>[r.status,parseInt(r.c)]));
  res.json({...user.rows[0],nextLvlXp:LVL_T[Math.min(parseInt(user.rows[0].level),LVL_T.length-1)],levelThresholds:LVL_T,progress:pm,totalTests:parseInt(tests.rows[0].total),avgScore:parseFloat(tests.rows[0].avg_score||0).toFixed(1)});
});

app.get('/api/parent/child/:studentId/syllabus-progress', auth, requireRole('parent'), requireLinkedChild, async (req,res) => {
  const sid = req.params.studentId;
  const {rows:[u]} = await pool.query('SELECT board,class_num,stream FROM users WHERE id=$1',[sid]);
  if (!u) return res.status(404).json({error:'Not found'});
  const {rows:subs} = await pool.query(
    `SELECT * FROM subjects WHERE board=$1 AND class_num=$2 AND (stream IS NULL OR stream=$3) ORDER BY sort_order`,
    [u.board,u.class_num,u.stream||'general']
  );
  const {rows:progRows} = await pool.query('SELECT chapter_id,status FROM chapter_progress WHERE user_id=$1',[sid]);
  const progMap = Object.fromEntries(progRows.map(r=>[r.chapter_id,r.status]));
  const result = await Promise.all(subs.map(async s => {
    const {rows:chs} = await pool.query('SELECT id,name,ch_type,sort_order FROM chapters WHERE subject_id=$1 ORDER BY sort_order',[s.id]);
    const total = chs.length;
    const done = chs.filter(ch => (progMap[ch.id]||0) >= 2).length;
    return {...s, totalChapters:total, doneChapters:done, pct: total?Math.round(done/total*100):0};
  }));
  res.json(result);
});

app.get('/api/parent/child/:studentId/tests', auth, requireRole('parent'), requireLinkedChild, async (req,res) => {
  const {rows} = await pool.query('SELECT * FROM test_results WHERE user_id=$1 ORDER BY test_date DESC,created_at DESC',[req.params.studentId]);
  res.json(rows);
});

app.get('/api/parent/child/:studentId/planner', auth, requireRole('parent'), requireLinkedChild, async (req,res) => {
  const {rows} = await pool.query('SELECT data FROM planner WHERE user_id=$1',[req.params.studentId]);
  res.json(rows[0]?.data||{});
});

app.get('/api/parent/child/:studentId/badges', auth, requireRole('parent'), requireLinkedChild, async (req,res) => {
  const {rows} = await pool.query('SELECT badge_id,earned_at FROM user_badges WHERE user_id=$1 ORDER BY earned_at',[req.params.studentId]);
  const em = Object.fromEntries(rows.map(r=>[r.badge_id,r.earned_at]));
  res.json(BADGES.map(b=>({...b,earned:!!em[b.id],earned_at:em[b.id]||null})));
});

// granular "all activity" feed — chapter opens, progress changes, tests, practice papers
app.get('/api/parent/child/:studentId/activity', auth, requireRole('parent'), requireLinkedChild, async (req,res) => {
  const limit = Math.min(parseInt(req.query.limit)||50, 200);
  const {rows} = await pool.query(
    `SELECT event_type,event_meta,created_at FROM activity_log WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [req.params.studentId, limit]
  );
  res.json(rows);
});

// so a parent can see exactly what concepts their child is stuck on
app.get('/api/parent/child/:studentId/doubts', auth, requireRole('parent'), requireLinkedChild, async (req,res) => {
  const {rows} = await pool.query(
    `SELECT id,chapter_id,question,answer,created_at FROM doubts WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
    [req.params.studentId]
  );
  res.json(rows);
});

// latest NEET trajectory projection, read-only
app.get('/api/parent/child/:studentId/neet-projection', auth, requireRole('parent'), requireLinkedChild, async (req,res) => {
  const {rows} = await pool.query('SELECT * FROM neet_projections WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',[req.params.studentId]);
  res.json(rows[0]||null);
});

// ════════════════════════════════════════════════════════════════
//  HEALTH  +  MANUAL RESEED  (protected)
// ════════════════════════════════════════════════════════════════
app.get('/api/health', (_,res) => res.json({ok:true,ts:new Date()}));

// Force reseed (e.g. to update chapters): POST /api/reseed with header x-setup-key
app.post('/api/reseed', async (req,res) => {
  if (req.headers['x-setup-key']!==process.env.SETUP_KEY)
    return res.status(403).json({error:'Forbidden'});
  try {
    const { seedDatabase } = require('./db/seed');
    await seedDatabase(pool);
    res.json({ok:true,msg:'Reseed complete'});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ════════════════════════════════════════════════════════════════
//  SERVE FRONTEND (production build)
// ════════════════════════════════════════════════════════════════
const DIST = path.join(__dirname,'frontend','dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^(?!\/api).*/, (_,res) => res.sendFile(path.join(DIST,'index.html')));
}

// ════════════════════════════════════════════════════════════════
//  START
// ════════════════════════════════════════════════════════════════
autoInit().then(() => {
  app.listen(PORT, () => console.log(`StudyTracker API  →  http://localhost:${PORT}`));
});
