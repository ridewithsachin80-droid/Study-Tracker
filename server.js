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
app.use(express.json());

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
  if (!name||!email||!password||!board||!classNum) return res.status(400).json({error:'Missing fields'});
  if (!['cbse','icse','karnataka'].includes(board)) return res.status(400).json({error:'Invalid board'});
  const cls = parseInt(classNum);
  if (cls<1||cls>12) return res.status(400).json({error:'Invalid class'});
  try {
    const hash = await bcrypt.hash(password,10);
    const {rows:[user]} = await pool.query(
      `INSERT INTO users(name,email,password_hash,board,class_num,stream,school_name)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,name,email,board,class_num,stream,xp,level,streak`,
      [name.trim(),email.toLowerCase().trim(),hash,board,cls,stream||null,schoolName||null]
    );
    await pool.query(`INSERT INTO planner(user_id,data) VALUES($1,'{}') ON CONFLICT DO NOTHING`,[user.id]);
    const token = jwt.sign({id:user.id,email:user.email},JWT_SECRET,{expiresIn:'30d'});
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
    const token = jwt.sign({id:user.id,email:user.email},JWT_SECRET,{expiresIn:'30d'});
    const {password_hash,...safe} = {...user,streak};
    res.json({token,user:safe});
  } catch(e) { console.error(e); res.status(500).json({error:'Server error'}); }
});

app.get('/api/me', auth, async (req,res) => {
  const {rows} = await pool.query(`SELECT id,name,email,board,class_num,stream,school_name,xp,level,streak,last_visit,avatar_color,created_at FROM users WHERE id=$1`,[req.user.id]);
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
  const {subjectName,testType,score,maxScore,testDate,notes} = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {rows:[t]} = await client.query(
      `INSERT INTO test_results(user_id,subject_name,test_type,score,max_score,test_date,notes)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id,subjectName,testType,score,maxScore||100,testDate||new Date(),notes]
    );
    await client.query('UPDATE users SET xp=xp+20 WHERE id=$1',[req.user.id]);
    const {rows:[{xp}]} = await client.query('SELECT xp FROM users WHERE id=$1',[req.user.id]);
    await client.query('UPDATE users SET level=$1 WHERE id=$2',[calcLvl(xp),req.user.id]);
    const newBadges = await awardBadges(client,req.user.id);
    await client.query('COMMIT');
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
