import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Empty string = same origin (Vite dev proxy forwards /api → backend).
// In production the backend serves the built frontend, so same origin works.
// To use a separate backend URL: set VITE_API_URL in frontend/.env
const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// ─── GAMIFICATION CONSTANTS ──────────────────────────────────────────────────
const LEVEL_NAMES = ["","Spark","Scout","Scholar","Achiever","Champion","Expert","Master","Legend","Elite","Titan"];
const LEVEL_THRESHOLDS = [0,200,500,1000,2000,3500,5500,8000,11000,15000];
const STATUS_CFG = [
  { label:"Not Started", short:"–",  bg:"#0d1326", text:"#475569", border:"#1e2a4a" },
  { label:"In Progress",  short:"▶",  bg:"#1c1202", text:"#fbbf24", border:"#78350f" },
  { label:"Completed",    short:"✓",  bg:"#022c14", text:"#4ade80", border:"#14532d" },
  { label:"Revised",      short:"★",  bg:"#031527", text:"#22d3ee", border:"#0e4f6e" },
];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const TEST_TYPES = ["Class Test","Weekly Test","Unit Test","Phase Test","Half-Yearly","Mock Test","Board Exam"];
const BOARDS = [
  { id:"cbse",      label:"CBSE",              flag:"🇮🇳" },
  { id:"icse",      label:"ICSE",              flag:"🏫" },
  { id:"karnataka", label:"Karnataka State",   flag:"🟠" },
];
const STREAMS_FOR_CLASS = (cls) => {
  if (cls < 11) return [];
  return [
    { id:"science",  label:"Science (PCB/PCM)" },
    { id:"commerce", label:"Commerce" },
    { id:"arts",     label:"Arts / Humanities" },
  ];
};

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const card = { background:"#0d1326", border:"1px solid #1e2a4a", borderRadius:12, padding:16 };
const inp  = { background:"#080c18", border:"1px solid #1e2a4a", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, fontFamily:"inherit", width:"100%", outline:"none" };
const lbl  = { fontSize:10, color:"#475569", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4, display:"block" };
const btn  = (color="#22d3ee") => ({ background:`${color}22`, border:`1px solid ${color}55`, borderRadius:8, padding:"9px 14px", color, fontSize:13, fontFamily:"inherit", cursor:"pointer", fontWeight:600 });

// ─── API HELPER ───────────────────────────────────────────────────────────────
function useApi(token) {
  const call = useCallback(async (method, path, body) => {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { "Content-Type":"application/json", ...(token ? { Authorization:`Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Request failed"); }
    return res.json();
  }, [token]);
  return { get: (p) => call("GET",p), post: (p,b) => call("POST",p,b), put: (p,b) => call("PUT",p,b), del: (p) => call("DELETE",p) };
}

// ─── XP TOAST ─────────────────────────────────────────────────────────────────
function XpToast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:"#0d1326", border:"1px solid #22d3ee55", borderRadius:12, padding:"10px 20px", zIndex:999, display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#22d3ee", boxShadow:"0 4px 20px #00000066" }}>
      ⚡ {msg}
    </div>
  );
}

// ─── BADGE TOAST ──────────────────────────────────────────────────────────────
function BadgeToast({ badge, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:"#0d1326", border:"1px solid #fbbf2455", borderRadius:12, padding:"12px 20px", zIndex:999, textAlign:"center", boxShadow:"0 4px 20px #00000066" }}>
      <div style={{ fontSize:28 }}>{badge.emoji}</div>
      <div style={{ fontSize:12, fontWeight:700, color:"#fbbf24" }}>Badge Unlocked!</div>
      <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{badge.label}</div>
    </div>
  );
}

// ─── LEVEL BAR ────────────────────────────────────────────────────────────────
function LevelBar({ xp, level }) {
  const cur = LEVEL_THRESHOLDS[Math.min(level-1, LEVEL_THRESHOLDS.length-1)] || 0;
  const next = LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length-1)] || xp;
  const pct  = next > cur ? Math.round((xp-cur)/(next-cur)*100) : 100;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
      <div style={{ flex:1, height:4, background:"#1e2a4a", borderRadius:2, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:"linear-gradient(90deg,#22d3ee,#a78bfa)", borderRadius:2, transition:"width 0.5s" }} />
      </div>
      <span style={{ fontSize:9, color:"#475569", whiteSpace:"nowrap" }}>{xp} XP</span>
    </div>
  );
}

// ─── AUTH SCREENS ─────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode]   = useState("login"); // login | register
  const [form, setForm]   = useState({ name:"", email:"", password:"", board:"cbse", classNum:"9", stream:"", schoolName:"" });
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);
  const api = useApi(null);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const streams = STREAMS_FOR_CLASS(parseInt(form.classNum));

  async function submit(e) {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const data = mode === "login"
        ? await api.post("/api/auth/login", { email: form.email, password: form.password })
        : await api.post("/api/auth/register", { ...form, classNum: parseInt(form.classNum) });
      localStorage.setItem("st_token", data.token);
      onAuth(data.token, data.user);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#06080f", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap'); *{box-sizing:border-box;} body{margin:0;background:#06080f;} input::placeholder,select option{color:#475569;} select option{background:#0d1326;}`}</style>

      {/* Logo */}
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ width:64, height:64, borderRadius:16, background:"linear-gradient(135deg,#22d3ee,#a78bfa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 12px" }}>🎓</div>
        <div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:800, color:"#e2e8f0" }}>StudyTracker</div>
        <div style={{ fontSize:11, color:"#334155", marginTop:4 }}>CBSE · ICSE · Karnataka State Board</div>
      </div>

      <div style={{ ...card, width:"100%", maxWidth:420 }}>
        {/* Tabs */}
        <div style={{ display:"flex", marginBottom:20, background:"#080c18", borderRadius:8, padding:4 }}>
          {["login","register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{ flex:1, background: mode===m ? "#1e2a4a" : "transparent", border:"none", borderRadius:6, padding:"8px 0", cursor:"pointer", fontSize:13, fontWeight:600, color: mode===m ? "#22d3ee" : "#475569", fontFamily:"inherit" }}>
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <label style={lbl}>Full Name</label>
              <input style={{ ...inp, marginBottom:12 }} value={form.name} onChange={set("name")} placeholder="Your name" required />

              <label style={lbl}>School Name (optional)</label>
              <input style={{ ...inp, marginBottom:12 }} value={form.schoolName} onChange={set("schoolName")} placeholder="Your school" />

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                <div>
                  <label style={lbl}>Board</label>
                  <select style={inp} value={form.board} onChange={set("board")}>
                    {BOARDS.map(b => <option key={b.id} value={b.id}>{b.flag} {b.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Class</label>
                  <select style={inp} value={form.classNum} onChange={e => { set("classNum")(e); setForm(p => ({ ...p, stream:"" })); }}>
                    {Array.from({length:12},(_,i) => i+1).map(c => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                </div>
              </div>

              {streams.length > 0 && (
                <>
                  <label style={lbl}>Stream</label>
                  <select style={{ ...inp, marginBottom:12 }} value={form.stream} onChange={set("stream")} required>
                    <option value="">Select stream…</option>
                    {streams.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </>
              )}
            </>
          )}

          <label style={lbl}>Email</label>
          <input style={{ ...inp, marginBottom:12 }} type="email" value={form.email} onChange={set("email")} placeholder="student@example.com" required />

          <label style={lbl}>Password</label>
          <input style={{ ...inp, marginBottom:20 }} type="password" value={form.password} onChange={set("password")} placeholder="••••••••" minLength={6} required />

          {err && <div style={{ background:"#3b0a0a", border:"1px solid #7f1d1d", borderRadius:8, padding:"10px 12px", fontSize:12, color:"#fca5a5", marginBottom:12 }}>{err}</div>}

          <button type="submit" disabled={loading} style={{ ...btn("#22d3ee"), width:"100%", padding:"12px 0", fontSize:14, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </form>
      </div>

      <div style={{ marginTop:16, fontSize:11, color:"#334155", textAlign:"center" }}>
        By signing up you agree to our terms. Your data is stored securely.
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, subjects, progress, tests, onStatusChange }) {
  const totalCh = subjects.reduce((a,s) => a + s.chapters.length, 0);
  const done = Object.values(progress).filter(p => p.status === 2).length;
  const revised = Object.values(progress).filter(p => p.status === 3).length;
  const inProg = Object.values(progress).filter(p => p.status === 1).length;
  const pct = totalCh ? Math.round((done+revised)/totalCh*100) : 0;

  // chapters needing revision (completed 7+ days ago, not yet revised)
  const revisionDue = subjects.flatMap(s =>
    s.chapters.filter(ch => {
      const p = progress[ch.id];
      if (!p || p.status !== 2) return false;
      const days = (Date.now() - new Date(p.updated_at)) / 86400000;
      return days >= 7;
    }).map(ch => ({ ...ch, subjectName: s.name, subjectColor: s.color }))
  ).slice(0, 6);

  const avgScore = tests.length ? Math.round(tests.reduce((a,t) => a + (t.score/t.max_score*100), 0)/tests.length) : null;
  const tipColor = (v) => !v ? "#475569" : v >= 80 ? "#4ade80" : v >= 60 ? "#fbbf24" : "#f87171";

  // level progress
  const curThr = LEVEL_THRESHOLDS[Math.min(user.level-1, LEVEL_THRESHOLDS.length-1)] || 0;
  const nextThr = LEVEL_THRESHOLDS[Math.min(user.level, LEVEL_THRESHOLDS.length-1)] || user.xp;
  const lvlPct = nextThr > curThr ? Math.round((user.xp - curThr)/(nextThr - curThr)*100) : 100;

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:12 }}>
      {/* Welcome card */}
      <div style={{ ...card, background:"linear-gradient(135deg,#0d1326,#0a1628)", borderColor:"#22d3ee33" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:11, color:"#475569" }}>Welcome back,</div>
            <div style={{ fontSize:18, fontWeight:800, fontFamily:"'Sora',sans-serif", color:"#e2e8f0" }}>{user.name.split(" ")[0]} 👋</div>
            <div style={{ fontSize:10, color:"#475569", marginTop:2 }}>
              {BOARDS.find(b => b.id===user.board)?.label} · Class {user.class_num}
              {user.stream ? ` · ${user.stream.charAt(0).toUpperCase()+user.stream.slice(1)}` : ""}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11, color:"#fbbf24", fontWeight:700 }}>🔥 {user.streak} day streak</div>
            <div style={{ fontSize:10, color:"#475569", marginTop:2 }}>Lv.{user.level} {LEVEL_NAMES[user.level]||"Titan"}</div>
          </div>
        </div>
        <div style={{ marginTop:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#475569", marginBottom:4 }}>
            <span>Level Progress</span><span>{user.xp} / {nextThr} XP</span>
          </div>
          <div style={{ height:6, background:"#1e2a4a", borderRadius:3, overflow:"hidden" }}>
            <div style={{ width:`${lvlPct}%`, height:"100%", background:"linear-gradient(90deg,#22d3ee,#a78bfa)", borderRadius:3, transition:"width 0.5s" }} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
        {[
          { v:`${pct}%`, l:"Overall", c:"#22d3ee" },
          { v:`${done+revised}`, l:"Completed", c:"#4ade80" },
          { v:inProg, l:"In Progress", c:"#fbbf24" },
          { v: avgScore ? `${avgScore}%` : "—", l:"Avg Score", c: tipColor(avgScore) },
        ].map(({ v,l,c }) => (
          <div key={l} style={{ ...card, textAlign:"center", padding:10 }}>
            <div style={{ fontSize:18, fontWeight:800, color:c, fontFamily:"'Sora',sans-serif" }}>{v}</div>
            <div style={{ fontSize:9, color:"#475569", marginTop:1 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:8 }}>
          <span style={{ fontWeight:700 }}>Overall Progress</span>
          <span style={{ color:"#22d3ee" }}>{done+revised}/{totalCh} chapters</span>
        </div>
        <div style={{ height:8, background:"#1e2a4a", borderRadius:4, overflow:"hidden" }}>
          <div style={{ width:`${pct}%`, height:"100%", background:"linear-gradient(90deg,#22d3ee,#a78bfa)", borderRadius:4, transition:"width 0.5s" }} />
        </div>
      </div>

      {/* Revision Due */}
      {revisionDue.length > 0 && (
        <div style={card}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
            <span>🔄 Revision Due</span>
            <span style={{ fontSize:10, color:"#f87171", background:"#3b0a0a", padding:"1px 6px", borderRadius:10 }}>{revisionDue.length}</span>
          </div>
          <div style={{ fontSize:11, color:"#475569", marginBottom:8 }}>Completed 7+ days ago — time to revise!</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {revisionDue.map(ch => (
              <div key={ch.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#080c18", borderRadius:8, padding:"8px 10px" }}>
                <div>
                  <div style={{ fontSize:11, color:"#e2e8f0" }}>{ch.name}</div>
                  <div style={{ fontSize:10, color:ch.subjectColor }}>{ch.subjectName}</div>
                </div>
                <button onClick={() => onStatusChange(ch.id, 3)} style={{ ...btn("#22d3ee"), padding:"4px 10px", fontSize:10 }}>Revise ★</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subject progress */}
      <div style={card}>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>Subject Progress</div>
        {subjects.map(s => {
          const total = s.chapters.length;
          const done2 = s.chapters.filter(c => (progress[c.id]?.status||0) >= 2).length;
          const p = total ? Math.round(done2/total*100) : 0;
          return (
            <div key={s.id} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                <span>{s.icon} {s.name}</span>
                <span style={{ color:s.color, fontWeight:700 }}>{p}%</span>
              </div>
              <div style={{ height:5, background:"#1e2a4a", borderRadius:3 }}>
                <div style={{ width:`${p}%`, height:"100%", background:s.color, borderRadius:3, transition:"width 0.4s", opacity:0.85 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SUBJECTS VIEW ────────────────────────────────────────────────────────────
function SubjectsView({ subjects, progress, onStatusChange }) {
  const [selSub, setSelSub] = useState(null);
  const [filter, setFilter] = useState("all"); // all | cbse | neet

  const sub = selSub ? subjects.find(s => s.id === selSub) : null;

  if (sub) {
    const chapters = sub.chapters.filter(c => filter === "all" ? true : filter === "neet" ? c.ch_type === "neet" : c.ch_type !== "neet");
    const done = chapters.filter(c => (progress[c.id]?.status||0) >= 2).length;
    return (
      <div style={{ padding:16 }}>
        <button onClick={() => setSelSub(null)} style={{ ...btn("#475569"), marginBottom:16, fontSize:12 }}>← Back</button>
        <div style={{ ...card, marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:18 }}>{sub.icon}</div>
              <div style={{ fontWeight:800, fontFamily:"'Sora',sans-serif", fontSize:15 }}>{sub.name}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:20, fontWeight:800, color:sub.color }}>{Math.round(done/chapters.length*100)||0}%</div>
              <div style={{ fontSize:10, color:"#475569" }}>{done}/{chapters.length} done</div>
            </div>
          </div>
          {/* type filter */}
          {sub.is_compet && (
            <div style={{ display:"flex", gap:6, marginTop:10 }}>
              {["all","cbse","neet"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ ...btn(filter===f ? sub.color : "#475569"), padding:"4px 10px", fontSize:10 }}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {chapters.map((ch, i) => {
            const st = progress[ch.id]?.status || 0;
            const cfg = STATUS_CFG[st];
            return (
              <div key={ch.id} style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:10, padding:"10px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ flex:1, marginRight:8 }}>
                  <div style={{ fontSize:12, color:"#e2e8f0" }}>{i+1}. {ch.name}</div>
                  {ch.ch_type === "neet" && <div style={{ fontSize:9, color:"#4ade80", marginTop:2 }}>NEET Extra</div>}
                </div>
                <div style={{ display:"flex", gap:4 }}>
                  {STATUS_CFG.map((s,si) => (
                    <button key={si} onClick={() => onStatusChange(ch.id, si)} title={s.label} style={{ width:26, height:26, borderRadius:6, border:`1px solid ${st===si ? s.border : "#1e2a4a"}`, background: st===si ? s.bg : "#0d1326", cursor:"pointer", color: st===si ? s.text : "#334155", fontSize:11 }}>
                      {s.short}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ fontWeight:700, fontFamily:"'Sora',sans-serif", fontSize:15, marginBottom:4 }}>My Subjects</div>
      {subjects.map(s => {
        const total = s.chapters.length;
        const done  = s.chapters.filter(c => (progress[c.id]?.status||0) >= 2).length;
        const inPr  = s.chapters.filter(c => (progress[c.id]?.status||0) === 1).length;
        const pct   = total ? Math.round(done/total*100) : 0;
        return (
          <button key={s.id} onClick={() => setSelSub(s.id)} style={{ ...card, textAlign:"left", cursor:"pointer", border:`1px solid ${s.color}22`, transition:"border-color 0.2s" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:`${s.color}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{s.icon}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:13 }}>{s.name}</div>
                  <div style={{ fontSize:10, color:"#475569" }}>{total} chapters{inPr > 0 ? ` · ${inPr} in progress` : ""}</div>
                </div>
              </div>
              <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{pct}%</div>
            </div>
            <div style={{ height:4, background:"#1e2a4a", borderRadius:2 }}>
              <div style={{ width:`${pct}%`, height:"100%", background:s.color, borderRadius:2, opacity:0.85 }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── TESTS VIEW ───────────────────────────────────────────────────────────────
function TestsView({ tests, subjects, onAdd, onDelete }) {
  const [form, setForm]   = useState({ subject:"", type:"Class Test", score:"", max:"100", date:"", notes:"" });
  const [show, setShow]   = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    onAdd({ subjectName: form.subject, testType: form.type, score: parseFloat(form.score), maxScore: parseFloat(form.max)||100, testDate: form.date||undefined, notes: form.notes });
    setForm({ subject:"", type:"Class Test", score:"", max:"100", date:"", notes:"" });
    setShow(false);
  }
  const tipColor = v => v >= 80 ? "#4ade80" : v >= 60 ? "#fbbf24" : "#f87171";

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontWeight:700, fontFamily:"'Sora',sans-serif", fontSize:15 }}>Test Results</div>
        <button onClick={() => setShow(p => !p)} style={{ ...btn("#22d3ee"), padding:"6px 12px", fontSize:12 }}>+ Add</button>
      </div>

      {show && (
        <form onSubmit={submit} style={card}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
            <div>
              <label style={lbl}>Subject</label>
              <select style={inp} value={form.subject} onChange={set("subject")} required>
                <option value="">Select…</option>
                {subjects.map(s => <option key={s.id} value={s.name}>{s.icon} {s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Test Type</label>
              <select style={inp} value={form.type} onChange={set("type")}>
                {TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:8 }}>
            <div><label style={lbl}>Score</label><input style={inp} type="number" min="0" value={form.score} onChange={set("score")} required /></div>
            <div><label style={lbl}>Max</label><input style={inp} type="number" min="1" value={form.max} onChange={set("max")} /></div>
            <div><label style={lbl}>Date</label><input style={inp} type="date" value={form.date} onChange={set("date")} /></div>
          </div>
          <label style={lbl}>Notes</label>
          <input style={{ ...inp, marginBottom:10 }} placeholder="Optional notes…" value={form.notes} onChange={set("notes")} />
          <button type="submit" style={{ ...btn("#4ade80"), width:"100%", padding:"10px 0" }}>Save Test</button>
        </form>
      )}

      {tests.length === 0 && <div style={{ ...card, color:"#334155", textAlign:"center", padding:30 }}>No tests logged yet. Add your first one!</div>}

      {tests.map(t => {
        const pct = Math.round(t.score/t.max_score*100);
        return (
          <div key={t.id} style={{ ...card, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:13 }}>{t.subject_name}</div>
              <div style={{ fontSize:10, color:"#475569" }}>{t.test_type} · {t.test_date?.slice?.(0,10) || "—"}</div>
              {t.notes && <div style={{ fontSize:10, color:"#64748b", marginTop:2 }}>{t.notes}</div>}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:20, fontWeight:800, color:tipColor(pct) }}>{pct}%</div>
                <div style={{ fontSize:10, color:"#475569" }}>{t.score}/{t.max_score}</div>
              </div>
              <button onClick={() => onDelete(t.id)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"#475569", fontSize:16, padding:4 }}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── POMODORO TIMER ───────────────────────────────────────────────────────────
function Pomodoro() {
  const [mins, setMins] = useState(25);
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("study"); // study | break
  const [sessions, setSessions] = useState(0);
  const interval = useRef(null);

  useEffect(() => {
    if (running) {
      interval.current = setInterval(() => {
        setSecs(s => {
          if (s === 0) {
            setMins(m => {
              if (m === 0) {
                setRunning(false);
                if (mode === "study") { setSessions(n => n+1); setMode("break"); setMins(5); }
                else { setMode("study"); setMins(25); }
                return 0;
              }
              return m - 1;
            });
            return 59;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval.current);
  }, [running, mode]);

  const reset = () => { setRunning(false); setMins(mode==="study"?25:5); setSecs(0); };
  const totalSecs = (mode==="study"?25:5)*60;
  const elapsed = totalSecs - (mins*60+secs);
  const pct = Math.round(elapsed/totalSecs*100);

  return (
    <div style={{ ...card, textAlign:"center", marginBottom:12 }}>
      <div style={{ fontSize:11, fontWeight:600, color: mode==="study" ? "#22d3ee" : "#4ade80", marginBottom:8 }}>
        {mode === "study" ? "🎯 Study Session" : "☕ Break Time"}
      </div>
      {/* circular-ish progress */}
      <div style={{ position:"relative", width:100, height:100, margin:"0 auto 12px" }}>
        <svg width="100" height="100" style={{ transform:"rotate(-90deg)" }}>
          <circle cx="50" cy="50" r="44" fill="none" stroke="#1e2a4a" strokeWidth="8" />
          <circle cx="50" cy="50" r="44" fill="none" stroke={mode==="study"?"#22d3ee":"#4ade80"} strokeWidth="8"
            strokeDasharray={`${2*Math.PI*44}`} strokeDashoffset={`${2*Math.PI*44*(1-pct/100)}`} strokeLinecap="round" />
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:22 }}>{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}</div>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:8 }}>
        <button onClick={() => setRunning(p=>!p)} style={{ ...btn("#22d3ee"), padding:"8px 20px" }}>{running?"Pause":"Start"}</button>
        <button onClick={reset} style={{ ...btn("#475569"), padding:"8px 14px" }}>Reset</button>
      </div>
      <div style={{ fontSize:10, color:"#475569" }}>Sessions today: {sessions}</div>
    </div>
  );
}

// ─── PLANNER VIEW ─────────────────────────────────────────────────────────────
function PlannerView({ planner, subjects, onSave }) {
  const [local, setLocal]   = useState(planner || {});
  const [selDay, setSelDay] = useState("Mon");
  const [form, setForm]     = useState({ subject:"", topic:"", mins:"60" });
  const set = k => e => setForm(p => ({ ...p, [k]:e.target.value }));

  useEffect(() => { setLocal(planner || {}); }, [planner]);

  function addEntry(e) {
    e.preventDefault();
    const entry = { subject: form.subject, topic: form.topic, mins: parseInt(form.mins)||60 };
    const updated = { ...local, [selDay]: [...(local[selDay]||[]), entry] };
    setLocal(updated);
    onSave(updated);
    setForm({ subject:"", topic:"", mins:"60" });
  }
  function removeEntry(day, i) {
    const updated = { ...local, [day]: (local[day]||[]).filter((_,j) => j!==i) };
    setLocal(updated);
    onSave(updated);
  }
  const totalMins = (local[selDay]||[]).reduce((a,e) => a+(e.mins||0), 0);

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:12 }}>
      <Pomodoro />

      <div style={{ fontWeight:700, fontFamily:"'Sora',sans-serif", fontSize:15 }}>Weekly Planner</div>

      {/* Day selector */}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
        {DAYS.map(d => (
          <button key={d} onClick={() => setSelDay(d)} style={{ flex:1, minWidth:36, padding:"8px 0", borderRadius:8, border:`1px solid ${selDay===d?"#22d3ee":"#1e2a4a"}`, background: selDay===d?"#22d3ee22":"#0d1326", cursor:"pointer", fontSize:11, fontWeight:600, color: selDay===d?"#22d3ee":"#475569", fontFamily:"inherit" }}>{d}</button>
        ))}
      </div>

      {/* Add form */}
      <form onSubmit={addEntry} style={card}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 3fr 1fr", gap:8, marginBottom:8 }}>
          <div>
            <label style={lbl}>Subject</label>
            <select style={inp} value={form.subject} onChange={set("subject")} required>
              <option value="">Pick…</option>
              {subjects.map(s => <option key={s.id} value={s.name}>{s.icon} {s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Topic / Chapter</label>
            <input style={inp} value={form.topic} onChange={set("topic")} placeholder="Topic…" />
          </div>
          <div>
            <label style={lbl}>Min</label>
            <input style={inp} type="number" min="15" max="240" step="15" value={form.mins} onChange={set("mins")} />
          </div>
        </div>
        <button type="submit" style={{ ...btn("#22d3ee"), width:"100%", padding:"9px 0" }}>+ Add to {selDay}</button>
      </form>

      {/* Entries */}
      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ fontWeight:700, fontSize:13 }}>{selDay}'s Plan</div>
          <div style={{ fontSize:11, color:"#22d3ee" }}>{Math.floor(totalMins/60)}h {totalMins%60}m total</div>
        </div>
        {!(local[selDay]?.length) && <div style={{ color:"#334155", fontSize:12, textAlign:"center", padding:"16px 0" }}>No sessions planned — add one above</div>}
        {(local[selDay]||[]).map((e,i) => {
          const s = subjects.find(s => s.name===e.subject);
          return (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#080c18", borderRadius:8, padding:"8px 10px", marginBottom:6 }}>
              <div>
                <div style={{ fontSize:12, color: s?.color||"#22d3ee", fontWeight:600 }}>{s?.icon||"📚"} {e.subject}</div>
                {e.topic && <div style={{ fontSize:11, color:"#94a3b8" }}>{e.topic}</div>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:11, color:"#fbbf24" }}>{e.mins}m</span>
                <button onClick={() => removeEntry(selDay,i)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"#475569", fontSize:14 }}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BADGES VIEW ──────────────────────────────────────────────────────────────
function BadgesView({ badges }) {
  const earned = badges.filter(b => b.earned);
  const locked = badges.filter(b => !b.earned);
  return (
    <div style={{ padding:16 }}>
      <div style={{ fontWeight:700, fontFamily:"'Sora',sans-serif", fontSize:15, marginBottom:4 }}>Achievements</div>
      <div style={{ fontSize:11, color:"#475569", marginBottom:16 }}>{earned.length}/{badges.length} badges earned</div>
      {earned.length > 0 && <>
        <div style={{ fontSize:11, fontWeight:600, color:"#fbbf24", marginBottom:8 }}>Earned</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
          {earned.map(b => (
            <div key={b.id} style={{ ...card, textAlign:"center", padding:12, border:"1px solid #fbbf2433" }}>
              <div style={{ fontSize:28 }}>{b.emoji}</div>
              <div style={{ fontSize:11, fontWeight:700, color:"#fbbf24", marginTop:4 }}>{b.label}</div>
              <div style={{ fontSize:9, color:"#475569", marginTop:2 }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </>}
      {locked.length > 0 && <>
        <div style={{ fontSize:11, fontWeight:600, color:"#475569", marginBottom:8 }}>Locked</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          {locked.map(b => (
            <div key={b.id} style={{ ...card, textAlign:"center", padding:12, opacity:0.4 }}>
              <div style={{ fontSize:28, filter:"grayscale(1)" }}>{b.emoji}</div>
              <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginTop:4 }}>{b.label}</div>
              <div style={{ fontSize:9, color:"#475569", marginTop:2 }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}

// ─── ANALYTICS VIEW ───────────────────────────────────────────────────────────
function AnalyticsView({ subjects, progress, tests }) {
  const chData = subjects.map(s => ({
    sub: s.name.split(" ")[0],
    done:  s.chapters.filter(c => progress[c.id]?.status===2).length,
    rev:   s.chapters.filter(c => progress[c.id]?.status===3).length,
    prog:  s.chapters.filter(c => progress[c.id]?.status===1).length,
  }));
  const trendData = tests.slice(-20).map((t,i) => ({ n:i+1, score: Math.round(t.score/t.max_score*100) }));
  const tipColor = v => !v ? "#475569" : v>=80 ? "#4ade80" : v>=60 ? "#fbbf24" : "#f87171";
  const avgScore = tests.length ? Math.round(tests.reduce((a,t) => a+t.score/t.max_score*100,0)/tests.length) : null;
  const totalMins = 0;
  const totalCh = subjects.reduce((a,s) => a+s.chapters.length,0);
  const done = Object.values(progress).filter(p => p.status >= 2).length;

  // subject averages from tests
  const subMap = {};
  tests.forEach(t => {
    if (!subMap[t.subject_name]) subMap[t.subject_name] = [];
    subMap[t.subject_name].push(t.score/t.max_score*100);
  });
  const subAvg = Object.entries(subMap).map(([sub,scores]) => ({ sub, avg: Math.round(scores.reduce((a,v)=>a+v,0)/scores.length) }));

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {[
          { v:`${done}/${totalCh}`, l:"Chapters Done", c:"#4ade80" },
          { v:tests.length, l:"Tests Logged", c:"#fbbf24" },
          { v: avgScore?`${avgScore}%`:"—", l:"Avg Score", c:tipColor(avgScore) },
          { v:`${Math.round(done/Math.max(totalCh,1)*100)}%`, l:"Completion", c:"#22d3ee" },
        ].map(({ v,l,c }) => (
          <div key={l} style={{ ...card, textAlign:"center", padding:14 }}>
            <div style={{ fontSize:22, fontWeight:800, color:c, fontFamily:"'Sora',sans-serif" }}>{v}</div>
            <div style={{ fontSize:10, color:"#475569", marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>Chapter Completion</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chData} barSize={14} margin={{ left:-20 }}>
            <XAxis dataKey="sub" tick={{ fontSize:9, fill:"#475569" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background:"#0d1326", border:"1px solid #1e2a4a", borderRadius:8, fontSize:11 }} cursor={{ fill:"#1e2a4a33" }} />
            <Bar dataKey="done" stackId="a" fill="#4ade80" name="Completed" />
            <Bar dataKey="rev"  stackId="a" fill="#22d3ee" name="Revised" radius={[4,4,0,0]} />
            <Bar dataKey="prog" stackId="b" fill="#fbbf24" name="In Progress" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {trendData.length > 1 && (
        <div style={card}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>Score Trend</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={trendData} margin={{ left:-20 }}>
              <XAxis dataKey="n" tick={{ fontSize:9, fill:"#475569" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]} tick={{ fontSize:9, fill:"#475569" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:"#0d1326", border:"1px solid #1e2a4a", borderRadius:8, fontSize:11 }} formatter={v => [`${v}%`,"Score"]} />
              <Line type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2.5} dot={{ fill:"#22d3ee", r:3, strokeWidth:0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {subAvg.length > 0 && (
        <div style={card}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>Avg Score by Subject</div>
          {subAvg.map(({ sub, avg }) => (
            <div key={sub} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:12 }}>{sub}</span>
                <span style={{ fontSize:12, fontWeight:700, color:tipColor(avg) }}>{avg}%</span>
              </div>
              <div style={{ height:5, background:"#1e2a4a", borderRadius:3 }}>
                <div style={{ width:`${avg}%`, height:"100%", background:tipColor(avg), borderRadius:3 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id:"dashboard", icon:"🏠", label:"Home" },
  { id:"subjects",  icon:"📚", label:"Subjects" },
  { id:"tests",     icon:"📝", label:"Tests" },
  { id:"planner",   icon:"📅", label:"Plan" },
  { id:"analytics", icon:"📊", label:"Charts" },
  { id:"badges",    icon:"🏆", label:"Badges" },
];

export default function App() {
  const [token,    setToken]    = useState(() => localStorage.getItem("st_token") || "");
  const [user,     setUser]     = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [progress, setProgress] = useState({});  // { chapterId: { status, updated_at } }
  const [tests,    setTests]    = useState([]);
  const [planner,  setPlanner]  = useState({});
  const [badges,   setBadges]   = useState([]);
  const [tab,      setTab]      = useState("dashboard");
  const [loading,  setLoading]  = useState(true);
  const [toasts,   setToasts]   = useState([]); // { id, type, data }

  const api = useApi(token);

  function addToast(type, data) {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, type, data }]);
  }
  function rmToast(id) { setToasts(p => p.filter(t => t.id !== id)); }

  // ── boot ────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    (async () => {
      try {
        const [me, syl, prog, tsts, plan, bdg] = await Promise.all([
          api.get("/api/me"),
          api.get("/api/syllabus"),
          api.get("/api/progress"),
          api.get("/api/tests"),
          api.get("/api/planner"),
          api.get("/api/badges"),
        ]);
        setUser(me);
        setSubjects(syl);
        setProgress(prog);
        setTests(tsts);
        setPlanner(plan);
        setBadges(bdg);
      } catch (e) {
        console.error("Boot failed:", e.message);
        // token invalid — log out
        localStorage.removeItem("st_token");
        setToken("");
      }
      setLoading(false);
    })();
  }, [token]);

  function handleAuth(tok, u) {
    setToken(tok);
    setUser(u);
  }

  function handleLogout() {
    localStorage.removeItem("st_token");
    setToken(""); setUser(null); setSubjects([]); setProgress({}); setTests([]); setPlanner({}); setBadges([]);
  }

  // ── update chapter status ────────────────────────────────────
  async function handleStatusChange(chapterId, status) {
    // optimistic update
    setProgress(p => ({ ...p, [chapterId]: { ...p[chapterId], status, updated_at: new Date().toISOString() } }));
    try {
      const res = await api.post("/api/progress", { chapterId, status });
      if (res.xpEarned > 0) addToast("xp", { msg: `+${res.xpEarned} XP` });
      if (res.newBadges?.length) res.newBadges.forEach(b => addToast("badge", b));
      setUser(u => ({ ...u, xp: res.xp, level: res.level, streak: res.streak }));
      if (res.newBadges?.length) setBadges(await api.get("/api/badges"));
    } catch (e) {
      // rollback
      setProgress(p => ({ ...p, [chapterId]: { ...p[chapterId], status: p[chapterId]?.status ?? 0 } }));
    }
  }

  // ── test actions ─────────────────────────────────────────────
  async function handleAddTest(data) {
    const res = await api.post("/api/tests", data);
    setTests(p => [res.test, ...p]);
    addToast("xp", { msg: "+20 XP for logging test" });
    if (res.newBadges?.length) res.newBadges.forEach(b => addToast("badge", b));
    setUser(u => ({ ...u, xp: (u.xp||0)+20 }));
  }
  async function handleDeleteTest(id) {
    await api.del(`/api/tests/${id}`);
    setTests(p => p.filter(t => t.id !== id));
  }

  // ── planner save ─────────────────────────────────────────────
  async function handleSavePlanner(data) {
    setPlanner(data);
    await api.put("/api/planner", data);
  }

  // ── render ───────────────────────────────────────────────────
  if (!token || (!user && !loading)) return <AuthScreen onAuth={handleAuth} />;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#06080f", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:8 }}>🎓</div>
        <div style={{ color:"#22d3ee", fontSize:14 }}>Loading your study data…</div>
      </div>
    </div>
  );

  const pages = {
    dashboard: <Dashboard user={user} subjects={subjects} progress={progress} tests={tests} onStatusChange={handleStatusChange} />,
    subjects:  <SubjectsView subjects={subjects} progress={progress} onStatusChange={handleStatusChange} />,
    tests:     <TestsView tests={tests} subjects={subjects} onAdd={handleAddTest} onDelete={handleDeleteTest} />,
    planner:   <PlannerView planner={planner} subjects={subjects} onSave={handleSavePlanner} />,
    analytics: <AnalyticsView subjects={subjects} progress={progress} tests={tests} />,
    badges:    <BadgesView badges={badges} />,
  };

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap'); *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;} body{margin:0;background:#06080f;} ::-webkit-scrollbar{width:3px;height:3px;} ::-webkit-scrollbar-track{background:#0d1326;} ::-webkit-scrollbar-thumb{background:#1e2a4a;border-radius:3px;} input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.4);} select option{background:#0d1326;color:#e2e8f0;} input::placeholder{color:#334155;}`}</style>

      <div style={{ background:"#06080f", minHeight:"100vh", color:"#e2e8f0", fontFamily:"'DM Sans',system-ui,sans-serif", paddingBottom:68 }}>

        {/* Header */}
        <div style={{ background:"#090d1e", borderBottom:"1px solid #1e2a4a", padding:"10px 16px", position:"sticky", top:0, zIndex:60 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#22d3ee,#a78bfa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>🎓</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:800, fontFamily:"'Sora',sans-serif", lineHeight:1 }}>StudyTracker</div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                <LevelBar xp={user.xp||0} level={user.level||1} />
                <span style={{ fontSize:9, color:"#a78bfa", whiteSpace:"nowrap", fontWeight:700 }}>Lv.{user.level} {LEVEL_NAMES[user.level]||""}</span>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              <div style={{ background:"#1e2a4a", borderRadius:8, padding:"3px 8px", fontSize:12, color:"#fbbf24", fontWeight:700 }}>🔥{user.streak||0}</div>
              <button onClick={handleLogout} style={{ background:"transparent", border:"none", cursor:"pointer", color:"#475569", fontSize:16, padding:4 }} title="Sign out">⎋</button>
            </div>
          </div>
        </div>

        {/* Page content */}
        {pages[tab]}

        {/* Toasts */}
        {toasts.map(t => t.type === "xp"
          ? <XpToast key={t.id} msg={t.data.msg} onDone={() => rmToast(t.id)} />
          : <BadgeToast key={t.id} badge={t.data} onDone={() => rmToast(t.id)} />
        )}

        {/* Bottom Nav */}
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#06080f", borderTop:"1px solid #1e2a4a", display:"flex", zIndex:60 }}>
          {TABS.map(({ id, icon, label }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{ flex:1, background:"transparent", border:"none", padding:"8px 0 6px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
                <span style={{ fontSize:17, lineHeight:1 }}>{icon}</span>
                <span style={{ fontSize:8, color: active?"#22d3ee":"#334155", fontFamily:"inherit", fontWeight: active?700:400, letterSpacing:"0.02em" }}>{label}</span>
                {active && <div style={{ width:16, height:2, background:"#22d3ee", borderRadius:1 }} />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
