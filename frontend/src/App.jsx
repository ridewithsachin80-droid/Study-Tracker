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
  { label:"Not Started", short:"–",  bg:"#12161F", text:"#6B7280", border:"#262B3A" },
  { label:"In Progress",  short:"▶",  bg:"#1c1202", text:"#fbbf24", border:"#78350f" },
  { label:"Completed",    short:"✓",  bg:"#022c14", text:"#4ade80", border:"#14532d" },
  { label:"Revised",      short:"★",  bg:"#031527", text:"#C9A24B", border:"#0e4f6e" },
];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const TEST_TYPES = ["Class Test","Weekly Test","Unit Test","Phase Test","Half-Yearly","Mock Test","Board Exam"];
const DIFFICULTY_TIERS = [
  { id:"", label:"Not specified" },
  { id:"standard", label:"Standard (school-level)" },
  { id:"moderate", label:"Moderate" },
  { id:"hard", label:"Hard" },
  { id:"very_hard", label:"Very Hard (JEE-adjacent)" },
];
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
const card = { background:"#12161F", border:"1px solid #262B3A", borderRadius:12, padding:16, color:"#ECE7DC", fontFamily:"inherit" };
const inp  = { background:"#0D1015", border:"1px solid #262B3A", borderRadius:8, padding:"9px 12px", color:"#ECE7DC", fontSize:13, fontFamily:"inherit", width:"100%", outline:"none" };
const lbl  = { fontSize:10, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4, display:"block" };
const btn  = (color="#C9A24B") => ({ background:`${color}22`, border:`1px solid ${color}55`, borderRadius:8, padding:"9px 14px", color, fontSize:13, fontFamily:"inherit", cursor:"pointer", fontWeight:600 });

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
    <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:"#12161F", border:"1px solid #C9A24B55", borderRadius:12, padding:"10px 20px", zIndex:999, display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#C9A24B", boxShadow:"0 4px 20px #00000066" }}>
      ⚡ {msg}
    </div>
  );
}

// ─── BADGE TOAST ──────────────────────────────────────────────────────────────
function BadgeToast({ badge, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:"#12161F", border:"1px solid #fbbf2455", borderRadius:12, padding:"12px 20px", zIndex:999, textAlign:"center", boxShadow:"0 4px 20px #00000066" }}>
      <div style={{ fontSize:28 }}>{badge.emoji}</div>
      <div style={{ fontSize:12, fontWeight:700, color:"#fbbf24" }}>Badge Unlocked!</div>
      <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{badge.label}</div>
    </div>
  );
}

// ─── LEVEL BAR ────────────────────────────────────────────────────────────────
function LevelMedallion({ level, xp, size=44 }) {
  const cur  = LEVEL_THRESHOLDS[Math.min(level-1, LEVEL_THRESHOLDS.length-1)] || 0;
  const next = LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length-1)] || xp;
  const pct  = next > cur ? Math.min(100, Math.round((xp-cur)/(next-cur)*100)) : 100;
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:`conic-gradient(#C9A24B ${pct}%, #262B3A ${pct}%)`, display:"flex", alignItems:"center", justifyContent:"center", padding:Math.max(2,size*0.06), flexShrink:0 }}>
      <div style={{ width:"100%", height:"100%", borderRadius:"50%", background:"#12161F", border:"1px solid #0A0D12", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:size*0.36, color:"#ECE7DC", lineHeight:1 }}>{level}</span>
      </div>
    </div>
  );
}

function LevelBar({ xp, level }) {
  const cur = LEVEL_THRESHOLDS[Math.min(level-1, LEVEL_THRESHOLDS.length-1)] || 0;
  const next = LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length-1)] || xp;
  const pct  = next > cur ? Math.round((xp-cur)/(next-cur)*100) : 100;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
      <div style={{ flex:1, height:4, background:"#262B3A", borderRadius:2, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:"linear-gradient(90deg,#C9A24B,#E0B85C)", borderRadius:2, transition:"width 0.5s" }} />
      </div>
      <span style={{ fontSize:9, color:"#6B7280", whiteSpace:"nowrap" }}>{xp} XP</span>
    </div>
  );
}

// ─── AUTH SCREENS ─────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode]   = useState("login"); // login | register
  const [role, setRole]   = useState("student"); // student | parent (register only)
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
        : await api.post("/api/auth/register", role === "parent"
            ? { name: form.name, email: form.email, password: form.password, role: "parent" }
            : { ...form, classNum: parseInt(form.classNum), role: "student" });
      localStorage.setItem("st_token", data.token);
      onAuth(data.token, data.user);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0A0D12", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap'); *{box-sizing:border-box;} body{margin:0;background:#0A0D12;} input::placeholder,select option{color:#6B7280;} select option{background:#12161F;}`}</style>

      {/* Logo */}
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ width:64, height:64, borderRadius:16, background:"linear-gradient(135deg,#C9A24B,#E0B85C)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 12px" }}>🎓</div>
        <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:800, color:"#ECE7DC" }}>StudyTracker</div>
        <div style={{ fontSize:11, color:"#4B5563", marginTop:4 }}>CBSE · ICSE · Karnataka State Board</div>
      </div>

      <div style={{ ...card, width:"100%", maxWidth:420 }}>
        {/* Tabs */}
        <div style={{ display:"flex", marginBottom:20, background:"#0D1015", borderRadius:8, padding:4 }}>
          {["login","register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{ flex:1, background: mode===m ? "#262B3A" : "transparent", border:"none", borderRadius:6, padding:"8px 0", cursor:"pointer", fontSize:13, fontWeight:600, color: mode===m ? "#C9A24B" : "#6B7280", fontFamily:"inherit" }}>
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                {[{ id:"student", label:"🎓 Student" }, { id:"parent", label:"👪 Parent" }].map(r => (
                  <button key={r.id} type="button" onClick={() => setRole(r.id)} style={{ flex:1, background: role===r.id ? "#C9A24B22" : "#0D1015", border: `1px solid ${role===r.id ? "#C9A24B55" : "#262B3A"}`, borderRadius:8, padding:"8px 0", cursor:"pointer", fontSize:12, fontWeight:600, color: role===r.id ? "#C9A24B" : "#6B7280", fontFamily:"inherit" }}>
                    {r.label}
                  </button>
                ))}
              </div>

              <label style={lbl}>Full Name</label>
              <input style={{ ...inp, marginBottom:12 }} value={form.name} onChange={set("name")} placeholder="Your name" required />

              {role === "student" && (
                <>
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

              {role === "parent" && (
                <div style={{ background:"#0D1015", border:"1px solid #262B3A", borderRadius:8, padding:"10px 12px", fontSize:11.5, color:"#64748b", marginBottom:12, lineHeight:1.5 }}>
                  After creating your account, your child can share a one-time link code from their app so you can view their progress. You won't be able to edit anything — just view.
                </div>
              )}
            </>
          )}

          <label style={lbl}>Email</label>
          <input style={{ ...inp, marginBottom:12 }} type="email" value={form.email} onChange={set("email")} placeholder="student@example.com" required />

          <label style={lbl}>Password</label>
          <input style={{ ...inp, marginBottom:20 }} type="password" value={form.password} onChange={set("password")} placeholder="••••••••" minLength={6} required />

          {err && <div style={{ background:"#3b0a0a", border:"1px solid #7f1d1d", borderRadius:8, padding:"10px 12px", fontSize:12, color:"#fca5a5", marginBottom:12 }}>{err}</div>}

          <button type="submit" disabled={loading} style={{ ...btn("#C9A24B"), width:"100%", padding:"12px 0", fontSize:14, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </form>
      </div>

      <div style={{ marginTop:16, fontSize:11, color:"#4B5563", textAlign:"center" }}>
        By signing up you agree to our terms. Your data is stored securely.
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function NeetTrajectoryCard({ api, latestPath, analyzePath }) {
  const [proj, setProj]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setProj(await api.get(latestPath)); } catch(e) { console.error(e.message); }
      setLoading(false);
    })();
  }, [latestPath]);

  async function analyze() {
    setBusy(true); setErr("");
    try { setProj(await api.post(analyzePath)); }
    catch(e) { setErr(e.message); }
    setBusy(false);
  }

  const confColor = { low:"#f87171", moderate:"#fbbf24", high:"#4ade80" };

  return (
    <div style={card}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ fontWeight:700, fontSize:13 }}>🎯 NEET Trajectory</div>
        {analyzePath && (
          <button onClick={analyze} disabled={busy} style={{ ...btn("#C9A24B"), fontSize:11, padding:"5px 10px", opacity:busy?0.6:1 }}>
            {busy ? "Analyzing…" : proj ? "Re-analyze" : "Analyze"}
          </button>
        )}
      </div>
      {loading ? (
        <div style={{ fontSize:11.5, color:"#6B7280" }}>Loading…</div>
      ) : err ? (
        <div style={{ fontSize:11.5, color:"#f87171" }}>{err}</div>
      ) : !proj ? (
        <div style={{ fontSize:11.5, color:"#6B7280" }}>
          {analyzePath ? "Log a few tests, then tap Analyze to see a projected NEET trajectory for Class 12." : "No trajectory analysis yet — ask your child to run one from the Tests tab."}
        </div>
      ) : (
        <div>
          <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:8, flexWrap:"wrap" }}>
            {proj.projected_min && proj.projected_max && (
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:600, color:"#C9A24B" }}>
                {proj.projected_min}–{proj.projected_max}<span style={{fontSize:12,color:"#6B7280"}}> / 720</span>
              </div>
            )}
            {proj.confidence && (
              <span style={{ fontSize:9.5, textTransform:"uppercase", letterSpacing:"0.05em", color: confColor[proj.confidence]||"#6B7280", border:`1px solid ${(confColor[proj.confidence]||"#262B3A")}55`, borderRadius:6, padding:"2px 6px" }}>
                {proj.confidence} confidence
              </span>
            )}
          </div>
          <div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{proj.projection_text}</div>
          <div style={{ fontSize:9.5, color:"#4B5563", marginTop:8 }}>Based on {proj.based_on_test_count} logged test{proj.based_on_test_count===1?"":"s"} · {new Date(proj.created_at).toLocaleDateString()}</div>
        </div>
      )}
      <div style={{ fontSize:9.5, color:"#4B5563", marginTop:10, fontStyle:"italic" }}>A directional estimate to guide effort, not a guarantee — projections made years before Class 12 carry real uncertainty.</div>
    </div>
  );
}

function Dashboard({ user, subjects, progress, tests, onStatusChange, api }) {
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
  const tipColor = (v) => !v ? "#6B7280" : v >= 80 ? "#4ade80" : v >= 60 ? "#fbbf24" : "#f87171";

  // level progress
  const curThr = LEVEL_THRESHOLDS[Math.min(user.level-1, LEVEL_THRESHOLDS.length-1)] || 0;
  const nextThr = LEVEL_THRESHOLDS[Math.min(user.level, LEVEL_THRESHOLDS.length-1)] || user.xp;
  const lvlPct = nextThr > curThr ? Math.round((user.xp - curThr)/(nextThr - curThr)*100) : 100;

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:12 }}>
      {/* Welcome card */}
      <div style={{ ...card, background:"linear-gradient(160deg,#12161F,#0D1015)", borderColor:"#262B3A" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <LevelMedallion level={user.level||1} xp={user.xp||0} size={52} />
            <div>
              <div style={{ fontSize:10, color:"#6B7280", letterSpacing:"0.04em" }}>Welcome back,</div>
              <div style={{ fontSize:21, fontWeight:600, fontFamily:"'Fraunces',serif", color:"#ECE7DC", lineHeight:1.15 }}>{user.name.split(" ")[0]}</div>
              <div style={{ fontSize:10, color:"#6B7280", marginTop:2 }}>
                {BOARDS.find(b => b.id===user.board)?.label} · Class {user.class_num}
                {user.stream ? ` · ${user.stream.charAt(0).toUpperCase()+user.stream.slice(1)}` : ""}
              </div>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:12, color:"#fbbf24", fontWeight:700 }}>🔥 {user.streak}</div>
            <div style={{ fontSize:9, color:"#6B7280", marginTop:1 }}>day streak</div>
          </div>
        </div>
        <div style={{ marginTop:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:9.5, color:"#6B7280", marginBottom:4, letterSpacing:"0.03em" }}>
            <span>{LEVEL_NAMES[user.level]||"Spark"}</span><span>{user.xp} / {nextThr} XP</span>
          </div>
          <div style={{ height:3, background:"#262B3A", borderRadius:2, overflow:"hidden" }}>
            <div style={{ width:`${lvlPct}%`, height:"100%", background:"linear-gradient(90deg,#C9A24B,#E0B85C)", borderRadius:2, transition:"width 0.5s" }} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
        {[
          { v:`${pct}%`, l:"Overall", c:"#C9A24B" },
          { v:`${done+revised}`, l:"Completed", c:"#4ade80" },
          { v:inProg, l:"In Progress", c:"#fbbf24" },
          { v: avgScore ? `${avgScore}%` : "—", l:"Avg Score", c: tipColor(avgScore) },
        ].map(({ v,l,c }) => (
          <div key={l} style={{ ...card, textAlign:"center", padding:"12px 8px" }}>
            <div style={{ fontSize:19, fontWeight:600, color:c, fontFamily:"'Fraunces',serif" }}>{v}</div>
            <div style={{ fontSize:8.5, color:"#6B7280", marginTop:2, letterSpacing:"0.03em", textTransform:"uppercase" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:8 }}>
          <span style={{ fontWeight:700 }}>Overall Progress</span>
          <span style={{ color:"#C9A24B" }}>{done+revised}/{totalCh} chapters</span>
        </div>
        <div style={{ height:5, background:"#262B3A", borderRadius:3, overflow:"hidden" }}>
          <div style={{ width:`${pct}%`, height:"100%", background:"linear-gradient(90deg,#C9A24B,#E0B85C)", borderRadius:3, transition:"width 0.5s" }} />
        </div>
      </div>

      {/* Revision Due */}
      {revisionDue.length > 0 && (
        <div style={card}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
            <span>🔄 Revision Due</span>
            <span style={{ fontSize:10, color:"#f87171", background:"#3b0a0a", padding:"1px 6px", borderRadius:10 }}>{revisionDue.length}</span>
          </div>
          <div style={{ fontSize:11, color:"#6B7280", marginBottom:8 }}>Completed 7+ days ago — time to revise!</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {revisionDue.map(ch => (
              <div key={ch.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#0D1015", borderRadius:8, padding:"8px 10px" }}>
                <div>
                  <div style={{ fontSize:11, color:"#ECE7DC" }}>{ch.name}</div>
                  <div style={{ fontSize:10, color:ch.subjectColor }}>{ch.subjectName}</div>
                </div>
                <button onClick={() => onStatusChange(ch.id, 3)} style={{ ...btn("#C9A24B"), padding:"4px 10px", fontSize:10 }}>Revise ★</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subject progress */}
      <div style={card}>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>Subject Progress</div>
        {subjects.map((s,idx) => {
          const total = s.chapters.length;
          const done2 = s.chapters.filter(c => (progress[c.id]?.status||0) >= 2).length;
          const p = total ? Math.round(done2/total*100) : 0;
          return (
            <div key={s.id} style={{ marginBottom:12, paddingBottom:12, borderBottom: idx<subjects.length-1 ? "1px solid #262B3A" : "none" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:5 }}>
                <span style={{ fontSize:12, color:"#ECE7DC" }}>{s.icon} {s.name}</span>
                <span style={{ fontFamily:"'Fraunces',serif", fontSize:15, fontWeight:600, color:"#C9A24B" }}>{p}<span style={{fontSize:10,color:"#6B7280"}}>%</span></span>
              </div>
              <div style={{ height:3, background:"#262B3A", borderRadius:2 }}>
                <div style={{ width:`${p}%`, height:"100%", background:s.color, borderRadius:2, transition:"width 0.4s" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* NEET Trajectory */}
      <NeetTrajectoryCard api={api} latestPath="/api/analysis/neet-projection/latest" analyzePath="/api/analysis/neet-projection" />
    </div>
  );
}

// ─── TINY MARKDOWN RENDERER (headings/bold/italic/lists/code, no deps) ────────
function renderMarkdown(md) {
  const lines = (md||"").split("\n");
  const blocks = []; let list = null;
  const inline = (t) => t
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, "<i>$1</i>")
    .replace(/`(.+?)`/g, "<code style='background:#0D1015;padding:1px 5px;border-radius:4px;color:#C9A24B'>$1</code>");
  lines.forEach((line) => {
    const l = line.trim();
    if (!l) { if (list) { blocks.push(list); list = null; } return; }
    const h = l.match(/^(#{1,3})\s+(.*)/);
    if (h) {
      if (list) { blocks.push(list); list = null; }
      const size = h[1].length===1?18:h[1].length===2?15:13;
      blocks.push(<div key={blocks.length} style={{ fontWeight:800, fontSize:size, fontFamily:"'Fraunces',serif", margin:"14px 0 6px", color:"#ECE7DC" }} dangerouslySetInnerHTML={{__html:inline(h[2])}} />);
      return;
    }
    if (/^[-*]\s+/.test(l)) {
      const item = <li key={Math.random()} style={{ fontSize:13, color:"#94a3b8", marginBottom:4 }} dangerouslySetInnerHTML={{__html:inline(l.replace(/^[-*]\s+/,""))}} />;
      if (!list) list = <ul key={blocks.length} style={{ margin:"4px 0 10px", paddingLeft:20 }}>{[item]}</ul>;
      else list = <ul key={list.key} style={{ margin:"4px 0 10px", paddingLeft:20 }}>{[...list.props.children, item]}</ul>;
      return;
    }
    if (list) { blocks.push(list); list = null; }
    blocks.push(<p key={blocks.length} style={{ fontSize:13, color:"#94a3b8", lineHeight:1.7, margin:"0 0 10px" }} dangerouslySetInnerHTML={{__html:inline(l)}} />);
  });
  if (list) blocks.push(list);
  return blocks;
}

// ─── CHAPTER STUDY PANEL (read notes + take a practice paper) ────────────────
function ChapterStudyPanel({ api, chapter, subjectColor, onClose }) {
  const [content, setContent]   = useState(null); // {available, body}
  const [paperInfo, setPaperInfo] = useState(null); // {neet, cbse}
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState("notes"); // notes | paper-take | paper-result | doubt
  const [examTag, setExamTag]   = useState(null);
  const [paper, setPaper]       = useState(null);   // {questions, markingNote}
  const [ansMap, setAnsMap]     = useState({});     // {questionId: selectedIndex}
  const [result, setResult]     = useState(null);
  const [busy, setBusy]         = useState(false);
  const [doubtQ, setDoubtQ]     = useState("");
  const [doubtMsgs, setDoubtMsgs] = useState([]);   // [{role:'q'|'a', text}]
  const [doubtBusy, setDoubtBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    };
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [c,p,d] = await Promise.all([
          api.get(`/api/chapter/${chapter.id}/content`),
          api.get(`/api/chapter/${chapter.id}/paper-info`),
          api.get(`/api/doubts?chapterId=${chapter.id}`),
        ]);
        setContent(c); setPaperInfo(p);
        setDoubtMsgs(d.slice().reverse().flatMap(x => [{role:'q',text:x.question},{role:'a',text:x.answer}]));
      } catch (e) { console.error(e.message); }
      setLoading(false);
    })();
  }, [chapter.id]);

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }

  async function askDoubt(overrideQ) {
    const q = (overrideQ ?? doubtQ).trim();
    if (!q || doubtBusy) return;
    setDoubtMsgs(p => [...p, {role:'q',text:q}]);
    setDoubtQ(""); setDoubtBusy(true);
    try {
      const res = await api.post("/api/doubts/ask", { chapterId: chapter.id, question: q });
      setDoubtMsgs(p => [...p, {role:'a',text:res.answer}]);
      if (autoRead) speak(res.answer);
    } catch (e) {
      setDoubtMsgs(p => [...p, {role:'a',text:`⚠️ ${e.message}`}]);
    }
    setDoubtBusy(false);
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size>0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || "audio/webm" });
        setTranscribing(true);
        try {
          const base64 = await new Promise((resolve,reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          const res = await api.post("/api/doubts/transcribe", { audioBase64: base64, mimeType: mr.mimeType || "audio/webm" });
          setDoubtQ(p => (p ? p + " " : "") + res.text);
        } catch (e) { alert(e.message || "Couldn't transcribe — please type instead"); }
        setTranscribing(false);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e) {
      alert("Microphone access is needed for voice doubts. Please allow it, or type your question instead.");
    }
  }

  async function startPaper(tag) {
    setBusy(true); setExamTag(tag);
    try {
      const p = await api.post("/api/papers/generate", { chapterId: chapter.id, examTag: tag });
      setPaper(p); setAnsMap({}); setView("paper-take");
    } catch (e) { alert(e.message); }
    setBusy(false);
  }

  async function submitPaper() {
    setBusy(true);
    try {
      const answers = paper.questions.map(q => ({ questionId:q.id, selectedIndex: ansMap[q.id] ?? null }));
      const res = await api.post("/api/papers/submit", { chapterId: chapter.id, examTag, answers });
      setResult(res); setView("paper-result");
    } catch (e) { alert(e.message); }
    setBusy(false);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"#0A0D12ee", zIndex:100, overflowY:"auto", padding:16 }}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <button onClick={onClose} style={btn("#6B7280")}>← Close</button>
          {view!=="paper-take" && (
            <div style={{ display:"flex", gap:6 }}>
              {view!=="notes" && (
                <button onClick={() => setView("notes")} style={{ ...btn(subjectColor||"#C9A24B"), fontSize:11 }}>📖 Notes</button>
              )}
              {view!=="doubt" && (
                <button onClick={() => setView("doubt")} style={{ ...btn("#E0B85C"), fontSize:11 }}>💬 Ask a Doubt</button>
              )}
            </div>
          )}
        </div>

        <div style={{ fontSize:16, fontWeight:800, fontFamily:"'Fraunces',serif", marginBottom:14 }}>{chapter.name}</div>

        {loading ? (
          <div style={{ color:"#6B7280", fontSize:13 }}>Loading…</div>
        ) : view === "notes" ? (
          <>
            <div style={card}>
              {content?.available ? renderMarkdown(content.body) : (
                <div style={{ fontSize:12.5, color:"#6B7280", lineHeight:1.6 }}>
                  Study notes for this chapter aren't published yet. Once your textbook content is added, they'll appear here.
                </div>
              )}
            </div>
            {(paperInfo?.neet>0 || paperInfo?.cbse>0) && (
              <div style={{ ...card, marginTop:12 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Practice Paper</div>
                <div style={{ display:"flex", gap:8 }}>
                  {paperInfo.neet>0 && <button onClick={() => startPaper("neet")} disabled={busy} style={{ ...btn("#4ade80"), flex:1 }}>NEET Format ({paperInfo.neet} Qs)</button>}
                  {paperInfo.cbse>0 && <button onClick={() => startPaper("cbse")} disabled={busy} style={{ ...btn("#C9A24B"), flex:1 }}>CBSE Format ({paperInfo.cbse} Qs)</button>}
                </div>
              </div>
            )}
          </>
        ) : view === "paper-take" ? (
          <div>
            <div style={{ background:"#1c1202", border:"1px solid #78350f", borderRadius:8, padding:"8px 12px", fontSize:11.5, color:"#fbbf24", marginBottom:14 }}>
              {paper.markingNote}
            </div>
            {paper.questions.map((q,i) => (
              <div key={q.id} style={{ ...card, marginBottom:10 }}>
                <div style={{ fontSize:12.5, marginBottom:10 }}>{i+1}. {q.text}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {q.options.map((opt,oi) => (
                    <button key={oi} onClick={() => setAnsMap(p => ({...p,[q.id]:oi}))} style={{ textAlign:"left", padding:"8px 10px", borderRadius:8, border:`1px solid ${ansMap[q.id]===oi?"#C9A24B":"#262B3A"}`, background: ansMap[q.id]===oi?"#C9A24B22":"#0D1015", color:"#ECE7DC", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={submitPaper} disabled={busy} style={{ ...btn("#C9A24B"), width:"100%", padding:"12px 0", marginTop:6 }}>
              {busy ? "Submitting…" : `Submit (${Object.keys(ansMap).length}/${paper.questions.length} answered)`}
            </button>
          </div>
        ) : view === "paper-result" ? (
          <div>
            <div style={{ ...card, textAlign:"center", marginBottom:14 }}>
              <div style={{ fontSize:28, fontWeight:800, color: result.score>=0 ? "#4ade80" : "#f87171" }}>{result.score} / {result.maxScore}</div>
              <div style={{ fontSize:11, color:"#6B7280", marginTop:4 }}>{result.correctCt} correct · {result.wrongCt} wrong · {result.skippedCt} skipped · +{result.xpEarned} XP</div>
            </div>
            {paper.questions.map((q,i) => {
              const g = result.graded.find(x => x.questionId===q.id);
              return (
                <div key={q.id} style={{ ...card, marginBottom:8 }}>
                  <div style={{ fontSize:12.5, marginBottom:8 }}>{i+1}. {q.text}</div>
                  {q.options.map((opt,oi) => {
                    const isCorrect = oi===g.correctIndex;
                    const isPicked = oi===g.selectedIndex;
                    const bg = isCorrect ? "#022c14" : (isPicked ? "#3b0a0a" : "#0D1015");
                    const border = isCorrect ? "#14532d" : (isPicked ? "#7f1d1d" : "#262B3A");
                    return <div key={oi} style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${border}`, background:bg, fontSize:11.5, marginBottom:4, color:"#ECE7DC" }}>{opt}{isCorrect?" ✓":""}{isPicked&&!isCorrect?" ✕":""}</div>;
                  })}
                </div>
              );
            })}
          </div>
        ) : view === "doubt" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#0d0a1f", border:"1px solid #4c1d95", borderRadius:8, padding:"8px 12px", marginBottom:14 }}>
              <div style={{ fontSize:11.5, color:"#c4b5fd" }}>Ask anything about "{chapter.name}" — by typing or speaking.</div>
              <label style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"#E0B85C", whiteSpace:"nowrap", marginLeft:8, cursor:"pointer" }}>
                <input type="checkbox" checked={autoRead} onChange={e => setAutoRead(e.target.checked)} />
                🔊 Read aloud
              </label>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
              {doubtMsgs.length === 0 && <div style={{ fontSize:11.5, color:"#6B7280" }}>No doubts asked yet for this chapter.</div>}
              {doubtMsgs.map((m,i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:6, alignSelf: m.role==='q'?'flex-end':'flex-start', maxWidth:"85%" }}>
                  <div style={{ background: m.role==='q'?'#C9A24B22':'#12161F', border:`1px solid ${m.role==='q'?'#C9A24B55':'#262B3A'}`, borderRadius:10, padding:"8px 12px", fontSize:12.5, color:"#ECE7DC", whiteSpace:"pre-wrap", lineHeight:1.5 }}>
                    {m.text}
                  </div>
                  {m.role==='a' && (
                    <button onClick={() => speak(m.text)} title="Read aloud" style={{ background:"transparent", border:"none", cursor:"pointer", color:"#6B7280", fontSize:14, flexShrink:0 }}>🔊</button>
                  )}
                </div>
              ))}
              {doubtBusy && <div style={{ alignSelf:'flex-start', fontSize:11.5, color:"#6B7280" }}>Thinking…</div>}
            </div>
            <div style={{ display:"flex", gap:8, position:"sticky", bottom:0, background:"#0A0D12", paddingTop:8 }}>
              <button onClick={toggleRecording} disabled={transcribing} title={recording?"Stop recording":"Speak your doubt"} style={{ width:38, height:38, borderRadius:8, border:`1px solid ${recording?"#f87171":"#262B3A"}`, background: recording?"#3b0a0a":"#12161F", color: recording?"#f87171":"#E0B85C", fontSize:16, cursor:"pointer", flexShrink:0 }}>
                {transcribing ? "…" : recording ? "⏹" : "🎤"}
              </button>
              <input style={{ ...inp, flex:1 }} value={doubtQ} onChange={e=>setDoubtQ(e.target.value)} onKeyDown={e => { if (e.key==='Enter') askDoubt(); }} placeholder={recording ? "Listening…" : "Type or tap 🎤 to speak…"} />
              <button onClick={() => askDoubt()} disabled={doubtBusy || !doubtQ.trim()} style={{ ...btn("#E0B85C"), opacity: (doubtBusy||!doubtQ.trim())?0.6:1 }}>Ask</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUBJECTS VIEW ────────────────────────────────────────────────────────────
function SubjectsView({ subjects, progress, onStatusChange, api }) {
  const [selSub, setSelSub] = useState(null);
  const [filter, setFilter] = useState("all"); // all | cbse | neet
  const [studyChapter, setStudyChapter] = useState(null);

  const sub = selSub ? subjects.find(s => s.id === selSub) : null;

  if (sub) {
    const chapters = sub.chapters.filter(c => filter === "all" ? true : filter === "neet" ? c.ch_type === "neet" : c.ch_type !== "neet");
    const done = chapters.filter(c => (progress[c.id]?.status||0) >= 2).length;
    return (
      <div style={{ padding:16 }}>
        <button onClick={() => setSelSub(null)} style={{ ...btn("#6B7280"), marginBottom:16, fontSize:12 }}>← Back</button>
        <div style={{ ...card, marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:18 }}>{sub.icon}</div>
              <div style={{ fontWeight:800, fontFamily:"'Fraunces',serif", fontSize:15 }}>{sub.name}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:20, fontWeight:800, color:sub.color }}>{Math.round(done/chapters.length*100)||0}%</div>
              <div style={{ fontSize:10, color:"#6B7280" }}>{done}/{chapters.length} done</div>
            </div>
          </div>
          {/* type filter */}
          {sub.is_compet && (
            <div style={{ display:"flex", gap:6, marginTop:10 }}>
              {["all","cbse","neet"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ ...btn(filter===f ? sub.color : "#6B7280"), padding:"4px 10px", fontSize:10 }}>
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
                  <div style={{ fontSize:12, color:"#ECE7DC" }}>{i+1}. {ch.name}</div>
                  {ch.ch_type === "neet" && <div style={{ fontSize:9, color:"#4ade80", marginTop:2 }}>NEET Extra</div>}
                </div>
                <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                  <button onClick={() => setStudyChapter(ch)} title="Study this chapter" style={{ width:26, height:26, borderRadius:6, border:"1px solid #262B3A", background:"#12161F", cursor:"pointer", fontSize:12 }}>📖</button>
                  {STATUS_CFG.map((s,si) => (
                    <button key={si} onClick={() => onStatusChange(ch.id, si)} title={s.label} style={{ width:26, height:26, borderRadius:6, border:`1px solid ${st===si ? s.border : "#262B3A"}`, background: st===si ? s.bg : "#12161F", cursor:"pointer", color: st===si ? s.text : "#4B5563", fontSize:11 }}>
                      {s.short}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {studyChapter && <ChapterStudyPanel api={api} chapter={studyChapter} subjectColor={sub.color} onClose={() => setStudyChapter(null)} />}
      </div>
    );
  }

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ fontWeight:700, fontFamily:"'Fraunces',serif", fontSize:15, marginBottom:4 }}>My Subjects</div>
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
                  <div style={{ fontSize:10, color:"#6B7280" }}>{total} chapters{inPr > 0 ? ` · ${inPr} in progress` : ""}</div>
                </div>
              </div>
              <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{pct}%</div>
            </div>
            <div style={{ height:4, background:"#262B3A", borderRadius:2 }}>
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
  const [form, setForm]   = useState({ subject:"", type:"Class Test", score:"", max:"100", date:"", notes:"", difficultyTier:"", classRank:"", classSize:"" });
  const [show, setShow]   = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    onAdd({
      subjectName: form.subject, testType: form.type, score: parseFloat(form.score), maxScore: parseFloat(form.max)||100,
      testDate: form.date||undefined, notes: form.notes, difficultyTier: form.difficultyTier||undefined,
      classRank: form.classRank?parseInt(form.classRank):undefined, classSize: form.classSize?parseInt(form.classSize):undefined,
    });
    setForm({ subject:"", type:"Class Test", score:"", max:"100", date:"", notes:"", difficultyTier:"", classRank:"", classSize:"" });
    setShow(false); setShowAdvanced(false);
  }
  const tipColor = v => v >= 80 ? "#4ade80" : v >= 60 ? "#fbbf24" : "#f87171";

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontWeight:700, fontFamily:"'Fraunces',serif", fontSize:15 }}>Test Results</div>
        <button onClick={() => setShow(p => !p)} style={{ ...btn("#C9A24B"), padding:"6px 12px", fontSize:12 }}>+ Add</button>
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

          <button type="button" onClick={() => setShowAdvanced(p => !p)} style={{ background:"transparent", border:"none", color:"#E0B85C", fontSize:11, cursor:"pointer", padding:0, marginBottom:showAdvanced?10:12, fontFamily:"inherit" }}>
            {showAdvanced ? "− Hide" : "+ Add"} paper difficulty / class rank <span style={{color:"#4B5563"}}>(sharpens the NEET trajectory estimate)</span>
          </button>

          {showAdvanced && (
            <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr 1fr", gap:8, marginBottom:12 }}>
              <div>
                <label style={lbl}>Paper Difficulty</label>
                <select style={inp} value={form.difficultyTier} onChange={set("difficultyTier")}>
                  {DIFFICULTY_TIERS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Class Rank</label><input style={inp} type="number" min="1" placeholder="e.g. 2" value={form.classRank} onChange={set("classRank")} /></div>
              <div><label style={lbl}>Class Size</label><input style={inp} type="number" min="1" placeholder="e.g. 56" value={form.classSize} onChange={set("classSize")} /></div>
            </div>
          )}

          <button type="submit" style={{ ...btn("#4ade80"), width:"100%", padding:"10px 0" }}>Save Test</button>
        </form>
      )}

      {tests.length === 0 && <div style={{ ...card, color:"#4B5563", textAlign:"center", padding:30 }}>No tests logged yet. Add your first one!</div>}

      {tests.map(t => {
        const pct = Math.round(t.score/t.max_score*100);
        return (
          <div key={t.id} style={{ ...card, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:13 }}>{t.subject_name}</div>
              <div style={{ fontSize:10, color:"#6B7280" }}>{t.test_type} · {t.test_date?.slice?.(0,10) || "—"}</div>
              {(t.difficulty_tier || t.class_rank) && (
                <div style={{ display:"flex", gap:6, marginTop:3 }}>
                  {t.difficulty_tier && <span style={{ fontSize:9, color:"#E0B85C", background:"#E0B85C1a", borderRadius:5, padding:"1px 6px" }}>{DIFFICULTY_TIERS.find(d=>d.id===t.difficulty_tier)?.label||t.difficulty_tier}</span>}
                  {t.class_rank && t.class_size && <span style={{ fontSize:9, color:"#6B7280" }}>Rank {t.class_rank}/{t.class_size}</span>}
                </div>
              )}
              {t.notes && <div style={{ fontSize:10, color:"#64748b", marginTop:2 }}>{t.notes}</div>}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:20, fontWeight:800, color:tipColor(pct) }}>{pct}%</div>
                <div style={{ fontSize:10, color:"#6B7280" }}>{t.score}/{t.max_score}</div>
              </div>
              <button onClick={() => onDelete(t.id)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"#6B7280", fontSize:16, padding:4 }}>✕</button>
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
      <div style={{ fontSize:11, fontWeight:600, color: mode==="study" ? "#C9A24B" : "#4ade80", marginBottom:8 }}>
        {mode === "study" ? "🎯 Study Session" : "☕ Break Time"}
      </div>
      {/* circular-ish progress */}
      <div style={{ position:"relative", width:100, height:100, margin:"0 auto 12px" }}>
        <svg width="100" height="100" style={{ transform:"rotate(-90deg)" }}>
          <circle cx="50" cy="50" r="44" fill="none" stroke="#262B3A" strokeWidth="8" />
          <circle cx="50" cy="50" r="44" fill="none" stroke={mode==="study"?"#C9A24B":"#4ade80"} strokeWidth="8"
            strokeDasharray={`${2*Math.PI*44}`} strokeDashoffset={`${2*Math.PI*44*(1-pct/100)}`} strokeLinecap="round" />
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ fontFamily:"'Fraunces',serif", fontWeight:800, fontSize:22 }}>{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}</div>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:8 }}>
        <button onClick={() => setRunning(p=>!p)} style={{ ...btn("#C9A24B"), padding:"8px 20px" }}>{running?"Pause":"Start"}</button>
        <button onClick={reset} style={{ ...btn("#6B7280"), padding:"8px 14px" }}>Reset</button>
      </div>
      <div style={{ fontSize:10, color:"#6B7280" }}>Sessions today: {sessions}</div>
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

      <div style={{ fontWeight:700, fontFamily:"'Fraunces',serif", fontSize:15 }}>Weekly Planner</div>

      {/* Day selector */}
      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
        {DAYS.map(d => (
          <button key={d} onClick={() => setSelDay(d)} style={{ flex:1, minWidth:36, padding:"8px 0", borderRadius:8, border:`1px solid ${selDay===d?"#C9A24B":"#262B3A"}`, background: selDay===d?"#C9A24B22":"#12161F", cursor:"pointer", fontSize:11, fontWeight:600, color: selDay===d?"#C9A24B":"#6B7280", fontFamily:"inherit" }}>{d}</button>
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
        <button type="submit" style={{ ...btn("#C9A24B"), width:"100%", padding:"9px 0" }}>+ Add to {selDay}</button>
      </form>

      {/* Entries */}
      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ fontWeight:700, fontSize:13 }}>{selDay}'s Plan</div>
          <div style={{ fontSize:11, color:"#C9A24B" }}>{Math.floor(totalMins/60)}h {totalMins%60}m total</div>
        </div>
        {!(local[selDay]?.length) && <div style={{ color:"#4B5563", fontSize:12, textAlign:"center", padding:"16px 0" }}>No sessions planned — add one above</div>}
        {(local[selDay]||[]).map((e,i) => {
          const s = subjects.find(s => s.name===e.subject);
          return (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#0D1015", borderRadius:8, padding:"8px 10px", marginBottom:6 }}>
              <div>
                <div style={{ fontSize:12, color: s?.color||"#C9A24B", fontWeight:600 }}>{s?.icon||"📚"} {e.subject}</div>
                {e.topic && <div style={{ fontSize:11, color:"#94a3b8" }}>{e.topic}</div>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:11, color:"#fbbf24" }}>{e.mins}m</span>
                <button onClick={() => removeEntry(selDay,i)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"#6B7280", fontSize:14 }}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BADGES VIEW ──────────────────────────────────────────────────────────────
function FamilyView({ api }) {
  const [code, setCode]       = useState(null);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genLoading, setGenLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([api.get("/api/student/link-code"), api.get("/api/student/parents")]);
      setCode(c); setParents(p);
    } catch (e) { console.error(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    setGenLoading(true);
    try { setCode(await api.post("/api/student/link-code")); }
    catch (e) { console.error(e.message); }
    setGenLoading(false);
  }

  async function revoke(parentId) {
    if (!confirm("Remove this parent's access to your progress?")) return;
    await api.del(`/api/student/parents/${parentId}`);
    setParents(p => p.filter(x => x.id !== parentId));
  }

  if (loading) return <div style={{ padding:16, color:"#6B7280", fontSize:13 }}>Loading…</div>;

  const expired = code && new Date(code.expires_at) < new Date();

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ fontFamily:"'Fraunces',serif", fontWeight:800, fontSize:18 }}>👪 Family Access</div>

      <div style={card}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Link a Parent</div>
        <div style={{ fontSize:11.5, color:"#64748b", marginBottom:12, lineHeight:1.5 }}>
          Share this code with a parent so they can view (read-only) your progress, tests, planner, and badges. Codes expire after 24 hours.
        </div>
        {code && !expired ? (
          <div style={{ background:"#0D1015", border:"1px solid #C9A24B55", borderRadius:8, padding:"14px 0", textAlign:"center", marginBottom:10 }}>
            <div style={{ fontSize:26, fontWeight:800, letterSpacing:"0.25em", color:"#C9A24B", fontFamily:"'Fraunces',serif" }}>{code.code}</div>
            <div style={{ fontSize:10, color:"#6B7280", marginTop:4 }}>Expires {new Date(code.expires_at).toLocaleString()}</div>
          </div>
        ) : (
          <div style={{ fontSize:11.5, color:"#6B7280", marginBottom:10 }}>{expired ? "Your last code expired." : "No active code yet."}</div>
        )}
        <button onClick={generate} disabled={genLoading} style={{ ...btn("#C9A24B"), width:"100%", padding:"10px 0", opacity: genLoading?0.6:1 }}>
          {genLoading ? "Generating…" : code && !expired ? "Generate New Code" : "Generate Code"}
        </button>
      </div>

      <div style={card}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Parents With Access</div>
        {parents.length === 0 ? (
          <div style={{ fontSize:11.5, color:"#6B7280" }}>No parent is linked to your account yet.</div>
        ) : parents.map(p => (
          <div key={p.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #262B3A" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>{p.name}</div>
              <div style={{ fontSize:10.5, color:"#6B7280" }}>{p.email} · since {new Date(p.linked_at).toLocaleDateString()}</div>
            </div>
            <button onClick={() => revoke(p.id)} style={{ ...btn("#f87171"), fontSize:11, padding:"6px 10px" }}>Revoke</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BadgesView({ badges }) {
  const earned = badges.filter(b => b.earned);
  const locked = badges.filter(b => !b.earned);
  return (
    <div style={{ padding:16 }}>
      <div style={{ fontWeight:700, fontFamily:"'Fraunces',serif", fontSize:15, marginBottom:4 }}>Achievements</div>
      <div style={{ fontSize:11, color:"#6B7280", marginBottom:16 }}>{earned.length}/{badges.length} badges earned</div>
      {earned.length > 0 && <>
        <div style={{ fontSize:11, fontWeight:600, color:"#fbbf24", marginBottom:8 }}>Earned</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
          {earned.map(b => (
            <div key={b.id} style={{ ...card, textAlign:"center", padding:12, border:"1px solid #fbbf2433" }}>
              <div style={{ fontSize:28 }}>{b.emoji}</div>
              <div style={{ fontSize:11, fontWeight:700, color:"#fbbf24", marginTop:4 }}>{b.label}</div>
              <div style={{ fontSize:9, color:"#6B7280", marginTop:2 }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </>}
      {locked.length > 0 && <>
        <div style={{ fontSize:11, fontWeight:600, color:"#6B7280", marginBottom:8 }}>Locked</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          {locked.map(b => (
            <div key={b.id} style={{ ...card, textAlign:"center", padding:12, opacity:0.4 }}>
              <div style={{ fontSize:28, filter:"grayscale(1)" }}>{b.emoji}</div>
              <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", marginTop:4 }}>{b.label}</div>
              <div style={{ fontSize:9, color:"#6B7280", marginTop:2 }}>{b.desc}</div>
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
  const tipColor = v => !v ? "#6B7280" : v>=80 ? "#4ade80" : v>=60 ? "#fbbf24" : "#f87171";
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
          { v:`${Math.round(done/Math.max(totalCh,1)*100)}%`, l:"Completion", c:"#C9A24B" },
        ].map(({ v,l,c }) => (
          <div key={l} style={{ ...card, textAlign:"center", padding:14 }}>
            <div style={{ fontSize:22, fontWeight:800, color:c, fontFamily:"'Fraunces',serif" }}>{v}</div>
            <div style={{ fontSize:10, color:"#6B7280", marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>Chapter Completion</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chData} barSize={14} margin={{ left:-20 }}>
            <XAxis dataKey="sub" tick={{ fontSize:9, fill:"#6B7280" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background:"#12161F", border:"1px solid #262B3A", borderRadius:8, fontSize:11 }} cursor={{ fill:"#262B3A33" }} />
            <Bar dataKey="done" stackId="a" fill="#4ade80" name="Completed" />
            <Bar dataKey="rev"  stackId="a" fill="#C9A24B" name="Revised" radius={[4,4,0,0]} />
            <Bar dataKey="prog" stackId="b" fill="#fbbf24" name="In Progress" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {trendData.length > 1 && (
        <div style={card}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>Score Trend</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={trendData} margin={{ left:-20 }}>
              <XAxis dataKey="n" tick={{ fontSize:9, fill:"#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]} tick={{ fontSize:9, fill:"#6B7280" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:"#12161F", border:"1px solid #262B3A", borderRadius:8, fontSize:11 }} formatter={v => [`${v}%`,"Score"]} />
              <Line type="monotone" dataKey="score" stroke="#C9A24B" strokeWidth={2.5} dot={{ fill:"#C9A24B", r:3, strokeWidth:0 }} />
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
              <div style={{ height:5, background:"#262B3A", borderRadius:3 }}>
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
  { id:"family",    icon:"👪", label:"Family" },
];

// ─── PARENT DASHBOARD ───────────────────────────────────────────────────────
function LinkChildForm({ api, onLinked }) {
  const [code, setCode] = useState("");
  const [err, setErr]   = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const res = await api.post("/api/parent/link", { code });
      setCode("");
      onLinked(res.child);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={card}>
      <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Link a Child</div>
      <div style={{ fontSize:11.5, color:"#64748b", marginBottom:12, lineHeight:1.5 }}>
        Ask your child to open StudyTracker → Family tab → generate a code, and enter it below.
      </div>
      <form onSubmit={submit} style={{ display:"flex", gap:8 }}>
        <input style={{ ...inp, textTransform:"uppercase", letterSpacing:"0.15em", textAlign:"center", fontWeight:700 }} value={code} onChange={e => setCode(e.target.value)} placeholder="ABCD12" maxLength={8} required />
        <button type="submit" disabled={loading} style={{ ...btn("#C9A24B"), whiteSpace:"nowrap", opacity: loading?0.6:1 }}>{loading ? "…" : "Link"}</button>
      </form>
      {err && <div style={{ background:"#3b0a0a", border:"1px solid #7f1d1d", borderRadius:8, padding:"8px 10px", fontSize:11.5, color:"#fca5a5", marginTop:10 }}>{err}</div>}
    </div>
  );
}

function ChildDetail({ api, child, onBack, onUnlink }) {
  const [stats, setStats]       = useState(null);
  const [syllabus, setSyllabus] = useState([]);
  const [tests, setTests]       = useState([]);
  const [planner, setPlanner]   = useState({});
  const [badges, setBadges]     = useState([]);
  const [activity, setActivity] = useState([]);
  const [doubts, setDoubts]     = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s,sy,t,p,b,a,d] = await Promise.all([
          api.get(`/api/parent/child/${child.id}/stats`),
          api.get(`/api/parent/child/${child.id}/syllabus-progress`),
          api.get(`/api/parent/child/${child.id}/tests`),
          api.get(`/api/parent/child/${child.id}/planner`),
          api.get(`/api/parent/child/${child.id}/badges`),
          api.get(`/api/parent/child/${child.id}/activity`),
          api.get(`/api/parent/child/${child.id}/doubts`),
        ]);
        setStats(s); setSyllabus(sy); setTests(t); setPlanner(p); setBadges(b); setActivity(a); setDoubts(d);
      } catch (e) { console.error(e.message); }
      setLoading(false);
    })();
  }, [child.id]);

  if (loading) return (
    <div style={{ padding:16 }}>
      <button onClick={onBack} style={{ ...btn("#6B7280"), marginBottom:12 }}>← Back</button>
      <div style={{ color:"#6B7280", fontSize:13 }}>Loading {child.name}'s data…</div>
    </div>
  );

  const earnedBadges = badges.filter(b => b.earned);

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <button onClick={onBack} style={btn("#6B7280")}>← Back</button>
        <button onClick={() => onUnlink(child.id)} style={{ ...btn("#f87171"), fontSize:11 }}>Unlink</button>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:48, height:48, borderRadius:12, background: child.avatar_color||"#C9A24B", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:800, color:"#0A0D12" }}>
          {child.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize:18, fontWeight:800, fontFamily:"'Fraunces',serif" }}>{child.name}</div>
          <div style={{ fontSize:11.5, color:"#64748b" }}>{BOARDS.find(b=>b.id===child.board)?.label||child.board} · Class {child.class_num}{child.stream ? ` (${child.stream})` : ""}</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
        {[
          { label:"Level", val: `${stats.level}` },
          { label:"XP", val: stats.xp },
          { label:"Streak", val: `🔥${stats.streak}` },
          { label:"Avg Score", val: `${stats.avgScore}%` },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding:10, textAlign:"center" }}>
            <div style={{ fontSize:16, fontWeight:800 }}>{s.val}</div>
            <div style={{ fontSize:9, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* NEET Trajectory (read-only) */}
      <NeetTrajectoryCard api={api} latestPath={`/api/parent/child/${child.id}/neet-projection`} analyzePath={null} />

      {/* Subject progress */}
      <div style={card}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Subject Progress</div>
        {syllabus.length === 0 && <div style={{ fontSize:11.5, color:"#6B7280" }}>No syllabus data.</div>}
        {syllabus.map(s => (
          <div key={s.id} style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
              <span>{s.icon} {s.name}</span>
              <span style={{ color:"#6B7280" }}>{s.doneChapters}/{s.totalChapters}</span>
            </div>
            <div style={{ background:"#0D1015", borderRadius:6, height:6, overflow:"hidden" }}>
              <div style={{ width:`${s.pct}%`, height:"100%", background: s.color||"#C9A24B", borderRadius:6 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Recent tests */}
      <div style={card}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Recent Tests</div>
        {tests.length === 0 && <div style={{ fontSize:11.5, color:"#6B7280" }}>No tests logged yet.</div>}
        {tests.slice(0,8).map(t => (
          <div key={t.id} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #262B3A", fontSize:12 }}>
            <div>
              <div style={{ fontWeight:600 }}>{t.subject_name}</div>
              <div style={{ fontSize:10, color:"#6B7280" }}>{t.test_type} · {new Date(t.test_date).toLocaleDateString()}</div>
            </div>
            <div style={{ fontWeight:700, color: (t.score/t.max_score*100)>=60 ? "#4ade80" : "#f87171" }}>
              {t.score}/{t.max_score}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly planner */}
      <div style={card}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Weekly Plan</div>
        {DAYS.every(d => !(planner[d]||[]).length) ? (
          <div style={{ fontSize:11.5, color:"#6B7280" }}>No planner entries yet.</div>
        ) : DAYS.map(d => (planner[d]||[]).length > 0 && (
          <div key={d} style={{ marginBottom:8 }}>
            <div style={{ fontSize:10, color:"#C9A24B", fontWeight:700, marginBottom:3 }}>{d}</div>
            {planner[d].map((e,i) => (
              <div key={i} style={{ fontSize:11.5, color:"#94a3b8", padding:"2px 0" }}>{e.subject} — {e.topic} ({e.mins}m)</div>
            ))}
          </div>
        ))}
      </div>

      {/* Badges */}
      <div style={card}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Badges Earned ({earnedBadges.length}/{badges.length})</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {earnedBadges.length === 0 && <div style={{ fontSize:11.5, color:"#6B7280" }}>No badges yet.</div>}
          {earnedBadges.map(b => (
            <div key={b.id} title={b.desc} style={{ fontSize:20 }}>{b.emoji}</div>
          ))}
        </div>
      </div>

      {/* Doubts asked */}
      <div style={card}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Recent Doubts Asked</div>
        {doubts.length === 0 ? (
          <div style={{ fontSize:11.5, color:"#6B7280" }}>No doubts asked yet.</div>
        ) : doubts.slice(0,10).map(d => (
          <div key={d.id} style={{ padding:"8px 0", borderBottom:"1px solid #262B3A" }}>
            <div style={{ fontSize:12, color:"#ECE7DC", fontWeight:600, marginBottom:3 }}>{d.question}</div>
            <div style={{ fontSize:11, color:"#64748b", lineHeight:1.5 }}>{d.answer.length>180 ? d.answer.slice(0,180)+"…" : d.answer}</div>
            <div style={{ fontSize:9.5, color:"#4B5563", marginTop:3 }}>{new Date(d.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Activity feed */}
      <div style={card}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Recent Activity</div>
        {activity.length === 0 ? (
          <div style={{ fontSize:11.5, color:"#6B7280" }}>No activity recorded yet.</div>
        ) : activity.map((a,i) => {
          const m = a.event_meta||{};
          const label = a.event_type==="chapter_opened" ? "Opened a chapter to study"
            : a.event_type==="progress_updated" ? `Marked a chapter as ${STATUS_CFG[m.status]?.label||"updated"}`
            : a.event_type==="test_logged" ? `Logged a test — ${m.subjectName} (${m.score}/${m.maxScore})`
            : a.event_type==="paper_attempted" ? `Attempted a ${m.examTag==="neet"?"NEET":"CBSE"} practice paper — ${m.score}/${m.maxScore}`
            : a.event_type==="doubt_asked" ? `Asked a doubt — "${m.question}"`
            : a.event_type;
          return (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom: i<activity.length-1?"1px solid #262B3A":"none", fontSize:11.5 }}>
              <span style={{ color:"#94a3b8" }}>{label}</span>
              <span style={{ color:"#4B5563", fontSize:10, whiteSpace:"nowrap", marginLeft:8 }}>{new Date(a.created_at).toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ParentApp({ user, api, onLogout }) {
  const [children, setChildren] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(true);

  async function loadChildren() {
    setLoading(true);
    try { setChildren(await api.get("/api/parent/children")); }
    catch (e) { console.error(e.message); }
    setLoading(false);
  }
  useEffect(() => { loadChildren(); }, []);

  function handleLinked(child) {
    setChildren(p => p.some(c => c.id===child.id) ? p : [...p, child]);
  }

  async function handleUnlink(studentId) {
    if (!confirm("Remove this child from your dashboard?")) return;
    await api.del(`/api/parent/children/${studentId}`);
    setChildren(p => p.filter(c => c.id !== studentId));
    setSelected(null);
  }

  return (
    <div style={{ background:"#05060A", minHeight:"100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap'); *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;} body{margin:0;background:#05060A;} input::placeholder{color:#4B5563;} @media(min-width:640px){ .app-shell{box-shadow:0 0 80px #00000090;} }`}</style>
      <div className="app-shell" style={{ maxWidth:560, margin:"0 auto", background:"#0A0D12", minHeight:"100vh", color:"#ECE7DC", fontFamily:"'DM Sans',system-ui,sans-serif" }}>

      <div style={{ background:"#0D1015", borderBottom:"1px solid #262B3A", padding:"12px 16px", position:"sticky", top:0, zIndex:60, display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#C9A24B,#E0B85C)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>👪</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:800, fontFamily:"'Fraunces',serif" }}>Parent Dashboard</div>
          <div style={{ fontSize:10.5, color:"#6B7280" }}>{user.name}</div>
        </div>
        <button onClick={onLogout} style={{ background:"transparent", border:"none", cursor:"pointer", color:"#6B7280", fontSize:16, padding:4 }} title="Sign out">⎋</button>
      </div>

      {selected ? (
        <ChildDetail api={api} child={selected} onBack={() => setSelected(null)} onUnlink={handleUnlink} />
      ) : (
        <div style={{ padding:16, display:"flex", flexDirection:"column", gap:16 }}>
          <LinkChildForm api={api} onLinked={handleLinked} />

          <div>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Your Children</div>
            {loading ? (
              <div style={{ fontSize:11.5, color:"#6B7280" }}>Loading…</div>
            ) : children.length === 0 ? (
              <div style={{ ...card, fontSize:11.5, color:"#6B7280" }}>No children linked yet. Use a code above to get started.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {children.map(c => (
                  <button key={c.id} onClick={() => setSelected(c)} style={{ ...card, display:"flex", alignItems:"center", gap:12, textAlign:"left", cursor:"pointer", width:"100%", fontFamily:"inherit" }}>
                    <div style={{ width:40, height:40, borderRadius:10, background: c.avatar_color||"#C9A24B", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, fontWeight:800, color:"#0A0D12", flexShrink:0 }}>
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:"#ECE7DC" }}>{c.name}</div>
                      <div style={{ fontSize:11, color:"#64748b" }}>Class {c.class_num} · Lv.{c.level} · 🔥{c.streak}</div>
                    </div>
                    <div style={{ color:"#4B5563", fontSize:16 }}>→</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

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
        const me = await api.get("/api/me");
        setUser(me);
        if (me.role === "parent") {
          setLoading(false);
          return; // ParentApp fetches its own data (linked children)
        }
        const [syl, prog, tsts, plan, bdg] = await Promise.all([
          api.get("/api/syllabus"),
          api.get("/api/progress"),
          api.get("/api/tests"),
          api.get("/api/planner"),
          api.get("/api/badges"),
        ]);
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
    <div style={{ minHeight:"100vh", background:"#0A0D12", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:8 }}>🎓</div>
        <div style={{ color:"#C9A24B", fontSize:14 }}>Loading your study data…</div>
      </div>
    </div>
  );

  if (user.role === "parent") return <ParentApp user={user} api={api} onLogout={handleLogout} />;

  const pages = {
    dashboard: <Dashboard user={user} subjects={subjects} progress={progress} tests={tests} onStatusChange={handleStatusChange} api={api} />,
    subjects:  <SubjectsView subjects={subjects} progress={progress} onStatusChange={handleStatusChange} api={api} />,
    tests:     <TestsView tests={tests} subjects={subjects} onAdd={handleAddTest} onDelete={handleDeleteTest} />,
    planner:   <PlannerView planner={planner} subjects={subjects} onSave={handleSavePlanner} />,
    analytics: <AnalyticsView subjects={subjects} progress={progress} tests={tests} />,
    badges:    <BadgesView badges={badges} />,
    family:    <FamilyView api={api} />,
  };

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap'); *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;} body{margin:0;background:#05060A;} ::-webkit-scrollbar{width:3px;height:3px;} ::-webkit-scrollbar-track{background:#12161F;} ::-webkit-scrollbar-thumb{background:#262B3A;border-radius:3px;} input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.4);} select option{background:#12161F;color:#ECE7DC;} input::placeholder{color:#4B5563;} @media(min-width:640px){ .app-shell{box-shadow:0 0 80px #00000090;} }`}</style>

      <div style={{ background:"#05060A", minHeight:"100vh" }}>
      <div className="app-shell" style={{ maxWidth:560, margin:"0 auto", position:"relative", background:"#0A0D12", minHeight:"100vh", color:"#ECE7DC", fontFamily:"'DM Sans',system-ui,sans-serif", paddingBottom:68 }}>

        {/* Header */}
        <div style={{ background:"#0D1015", borderBottom:"1px solid #262B3A", padding:"10px 16px", position:"sticky", top:0, zIndex:60 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <LevelMedallion level={user.level||1} xp={user.xp||0} size={38} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:600, fontFamily:"'Fraunces',serif", lineHeight:1.1, color:"#ECE7DC" }}>StudyTracker</div>
              <div style={{ fontSize:9.5, color:"#E0B85C", fontWeight:600, marginTop:2, letterSpacing:"0.03em" }}>{LEVEL_NAMES[user.level]||"Spark"} · {user.xp||0} XP</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              <div style={{ background:"#262B3A", borderRadius:8, padding:"3px 8px", fontSize:12, color:"#fbbf24", fontWeight:700 }}>🔥{user.streak||0}</div>
              <button onClick={handleLogout} style={{ background:"transparent", border:"none", cursor:"pointer", color:"#6B7280", fontSize:16, padding:4 }} title="Sign out">⎋</button>
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
        <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:560, background:"#0A0D12", borderTop:"1px solid #262B3A", display:"flex", zIndex:60 }}>
          {TABS.map(({ id, icon, label }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{ flex:1, background:"transparent", border:"none", padding:"8px 0 6px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
                <span style={{ fontSize:17, lineHeight:1 }}>{icon}</span>
                <span style={{ fontSize:8, color: active?"#C9A24B":"#4B5563", fontFamily:"inherit", fontWeight: active?700:400, letterSpacing:"0.02em" }}>{label}</span>
                {active && <div style={{ width:16, height:2, background:"#C9A24B", borderRadius:1 }} />}
              </button>
            );
          })}
        </div>
      </div>
      </div>
    </>
  );
}
