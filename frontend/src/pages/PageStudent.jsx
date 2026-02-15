import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import confetti from "canvas-confetti";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell
} from "recharts";

import SamieGraph from "./SamieGraph"; 
import { API_BASE } from "../api";

// =================================================================================
// 🧠 SAMIE'S "GAME CHANGER" PROTOCOL (System Prompt)
// =================================================================================
const SAMIE_SYSTEM_PROMPT = `
You are Samie, a "Humanized" AI Tutor for the Dream ARC.
Your Goal: Guide the student to "The Real Me" through Math (Flexibility) and Leadership (Inspiration).

### 1. VISUAL TEACHING PROTOCOL
* You are a VISUAL teacher. NEVER say "I cannot create visual graphs."
* **HOW TO DRAW:** When you need to show a graph (Linear, Quadratic, Scatter), you must output a raw JSON block hidden in a special tag like this:
  :::GRAPH_DATA {"title": "y=x^2", "data": [{"x": -2, "y": 4}, {"x": -1, "y": 1}, {"x": 0, "y": 0}, {"x": 1, "y": 1}, {"x": 2, "y": 4}]} :::
* **RULE:** In every 5 interactions, try to trigger this visual tag if relevant.

### 2. THE SATURDAY LOG (Shadow Breaker)
* At the end of a session, output "MENTOR HANDOVER REPORT".

### 3. MATH FORMAT (KaTeX)
* Always write equations in LaTeX using $...$ (inline) and $$...$$ (display). Never use [ ... ] for equations.

### 4. GRAPH OUTPUT STRICT FORMAT
* When outputting :::GRAPH_DATA, the JSON MUST be on ONE LINE with double quotes only, no line breaks, and valid JSON.
`;

// --- ASSETS & DATA ---
const IMG_BADGE_CREATIVE = "/images/game/badge-silver.png";
const IMG_BADGE_FEARLESS = "/images/game/badge-fearless.png";
const IMG_BADGE_GAMECHANGER = "/images/game/badge-gold.png";
const IMG_GAME_BG = "/images/game/game-bg.png";

const BADGES = [
  { id: 1, name: "Creative Attacker", img: IMG_BADGE_CREATIVE, earned: true, desc: "Process-Centered: You actively attempted 10+ challenging questions." },
  { id: 2, name: "Fearless Attacker", img: IMG_BADGE_FEARLESS, earned: true, desc: "Liberation from Fear: You engaged with the 'Shadow' without hesitation." },
  { id: 3, name: "True Game Changer", img: IMG_BADGE_GAMECHANGER, earned: false, desc: "The Shining Star: 8 weeks of stabilized RMSQ." },
];

const MOCK_SPIRAL_NODES = [
  { id: 1, type: "outward", angle: 0.5, label: "Started Algebra", msg: "First step taken!", isGift: false },
  { id: 2, type: "outward", angle: 1.2, label: "Mastered Linear Eq", msg: "Lambda 0.8!", isGift: false },
  { id: 3, type: "outward", angle: 2.5, label: "Functions Intro", msg: "Explored new world.", isGift: false },
  { id: 4, type: "outward", angle: 3.8, label: "Slope Wizard", msg: "Consistency shining.", isGift: true, giftContent: "🎟️ 2x Six Flags Pass", opened: false },
  { id: 10, type: "inward", angle: 0.5, label: "Fixed Fractions", msg: "Gap filled.", isGift: false },
  { id: 12, type: "inward", angle: 3.5, label: "Geometry Core", msg: "Foundation built.", isGift: true, giftContent: "🏆 Crystal Trophy: 'Shining Star'", opened: false },
];

// --- HELPER COMPONENTS ---

function MetricLegend() {
  return (
    <div className="card metric-legend">
      <h3 className="section-title">📌 Pilot Metrics Rubric</h3>
      <div className="legend-grid">
        <div className="legend-item">
          <h4>λ (Lambda) — Instability</h4>
          <p className="muted">Lower is better.</p>
          <ul><li>0.0 - 2.0: ✅ Stable</li><li>2.0 - 4.0: 🟡 Learning</li><li>4.0 - 5.0: 🔴 Instability</li></ul>
        </div>
        <div className="legend-item">
          <h4>RMSQ — Resilience</h4>
          <p className="muted">Higher is better.</p>
          <ul><li>80 - 100: ✅ High</li><li>40 - 80: 🟡 Building</li><li>0 - 40: 🔴 Fragile</li></ul>
        </div>
        <div className="legend-item">
          <h4>PQ — Balance</h4>
          <p className="muted">Holistic growth.</p>
          <ul><li>70 - 100: ✅ Thriving</li><li>40 - 70: 🟢 Growing</li><li>0 - 40: 🟡 Starting</li></ul>
        </div>
      </div>
    </div>
  );
}

function ChartBox({ height = 220, children }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        if (width > 0) setSize({ w: width, h: height });
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} style={{ width: "100%", height, minWidth: 0, overflow: "hidden" }}>{size.w > 0 && children(size)}</div>;
}

function CatchUpModule({ isDemo }) {
  const [step, setStep] = useState(isDemo ? 3 : 1);
  const startAnalysis = () => { setStep(2); setTimeout(() => { setStep(3); confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); }, 2500); };
  if (step === 1) return <div className="catchup-container card-effect center"><div className="cup-header"><span>🚀 Catch Up Project</span></div><div className="cup-body"><p style={{ fontSize: "0.85rem", color: "#64748b" }}>Moving schools? Bridge the gap.</p><button className="cup-action-btn" onClick={startAnalysis}>Analyze Syllabus</button></div></div>;
  if (step === 2) return <div className="catchup-container card-effect center"><div className="spinner">🌀</div><p style={{ fontSize: "0.85rem", marginTop: "10px" }}>Mapping Common Core...</p></div>;
  return <div className="catchup-container card-effect"><div className="cup-header"><span>🚀 Plan Ready</span><span className="cup-badge active">Active</span></div><div className="cup-body"><div className="gap-analysis"><strong>⚠️ Gap:</strong> Quadratic Functions</div><div className="plan-grid"><div className="plan-card"><span className="subject-icon">📐</span><div><strong>Math Bridge</strong><br /><small>3 Sessions</small></div></div><div className="plan-card"><span className="subject-icon">🧪</span><div><strong>Science Bridge</strong><br /><small>2 Sessions</small></div></div></div><div className="ai-message">"I've briefed Sarah. You're syncing up!" - Judy</div></div></div>;
}

function StudyCalendar({ studentId }) {
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [events, setEvents] = useState({});
  const [noteInput, setNoteInput] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => { fetch(`${API_BASE}/api/diary/${studentId}`).then(r=>r.json()).then(data => {
      const mapped = {}; (Array.isArray(data) ? data : []).forEach(e => { const d = parseInt(String(e.entry_date).split("-")[2], 10); if (!mapped[d]) mapped[d]=[]; mapped[d].push(e.content); }); setEvents(mapped);
  }).catch(e=>console.error(e)); }, [studentId]);
  const handleSaveNote = async () => {
    if (!noteInput.trim()) return;
    setStatus("Saving...");
    const dStr = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-${String(selectedDate).padStart(2,"0")}`;
    const res = await fetch(`${API_BASE}/api/diary/save`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({student_id: parseInt(studentId), date: dStr, content: noteInput})});
    if(res.ok) { setEvents(p => ({...p, [selectedDate]: [...(p[selectedDate]||[]), noteInput]})); setNoteInput(""); setStatus("Saved 🔒"); setTimeout(()=>setStatus(""), 2000); }
  };
  return (
    <div className="calendar-container card-effect">
      <div className="cal-header"><div style={{display:"flex",gap:"10px"}}><span>📔</span><span>Live Fully</span></div><div className="privacy-badge">🔒 AI Protected</div></div>
      <div className="cal-body">
        <div className="cal-grid-wrapper"><div className="cal-month-label">Oct</div><div className="cal-grid">{Array.from({length:30},(_,i)=>i+1).map(d=><div key={d} className={`cal-day ${selectedDate===d?"active":""}`} onClick={()=>setSelectedDate(d)}>{d}{events[d]&&<div className="event-dot"></div>}</div>)}</div></div>
        <div className="cal-journal-page"><div className="journal-paper"><h5 className="journal-date">Reflections for Oct {selectedDate}</h5><div className="journal-entries">{events[selectedDate]?.map((e,i)=><div key={i} className="entry-line">• {e}</div>)}</div><div className="journal-input-wrapper"><textarea className="journal-textarea" value={noteInput} onChange={e=>setNoteInput(e.target.value)} rows={2} /><button className="save-btn" onClick={handleSaveNote}>{status||"Save"}</button></div></div></div>
      </div>
    </div>
  );
}

function MetricGauge({ value, max, label, color }) {
  const safeVal = Math.max(0, value < max ? value : max);
  return (
    <div style={{ position: "relative", width: "160px", height: "100px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="160" height="90" viewBox="0 0 160 90">
        <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke="#e2e8f0" strokeWidth="15" strokeLinecap="round" />
        <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke={color} strokeWidth="15" strokeLinecap="round" strokeDasharray="220" strokeDashoffset={220 - 220 * (safeVal / max)} style={{ transition: "stroke-dashoffset 1s ease-out" }} />
        <text x="80" y="75" textAnchor="middle" fontSize="22" fontWeight="bold" fill="#1e293b">{value}</text>
      </svg>
      <div style={{ marginTop: "-5px", fontWeight: "bold", color: "#475569", fontSize: "0.9rem" }}>{label}</div>
    </div>
  );
}

function AtozDashboard({ studentId }) {
  const [currentScore, setCurrentScore] = useState(50);
  const [futureScore, setFutureScore] = useState(80);
  const [rmsPlan, setRmsPlan] = useState("");
  const [futureGoal, setFutureGoal] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/students/${studentId}/atoz`).then(r=>r.json()).then(data=>{
       if(data){ setCurrentScore(data.current_score||50); setFutureScore(data.future_score||80); setRmsPlan(data.rms_plan||""); setFutureGoal(data.future_goal||""); }
    }).catch(e=>console.error(e));
  }, [studentId]);

  const handleSave = async () => {
    setStatus("Saving...");
    const res = await fetch(`${API_BASE}/api/students/${studentId}/atoz`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({current_score: currentScore, future_score: futureScore, rms_plan: rmsPlan, future_goal: futureGoal})});
    if(res.ok) { setStatus("Saved ✅"); setTimeout(()=>setStatus(""), 2000); } else setStatus("Error ❌");
  };

  return (
    <div className="card atoz-container">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
        <h3 className="section-title" style={{margin:0}}>📊 ATOZ Cumulative Dashboard</h3>
        <button onClick={handleSave} className="save-btn" style={{padding:'5px 15px', fontSize:'0.85rem'}}>{status||"💾 Save Updates"}</button>
      </div>
      <div className="bar-row">
        <div className="label-row"><span>(2) Current "Real Me" ({currentScore}%)</span><input type="number" className="score-input" value={currentScore} onChange={e=>setCurrentScore(Math.min(100, Math.max(0, parseInt(e.target.value)||0)))} /></div>
        <div className="bar-track"><div className="bar-fill" style={{width:`${currentScore}%`}}>{currentScore}%</div></div>
        <div className="input-area"><label>(1) Current Challenge & React Plan (RMS Spirit):</label><textarea className="rms-input" rows="2" placeholder="Describe challenge..." value={rmsPlan} onChange={e=>setRmsPlan(e.target.value)} /></div>
      </div>
      <hr className="atoz-divider" />
      <div className="bar-row">
        <div className="label-row"><span>(3) Smiling "Real Me" Tomorrow</span><input type="number" className="score-input" value={futureScore} onChange={e=>setFutureScore(Math.min(100, Math.max(0, parseInt(e.target.value)||0)))} /></div>
        <div className="bar-track"><div className="bar-fill" style={{width:`${futureScore}%`}}>{futureScore}%</div></div>
        <div className="input-area"><label>Goal / Affirmation:</label><textarea className="rms-input" rows="1" placeholder="What does success look like?" value={futureGoal} onChange={e=>setFutureGoal(e.target.value)} /></div>
      </div>
    </div>
  );
}

function WaterfallChart({ title, data, onUpdate }) {
  const processedData = useMemo(() => {
    let currentTotal = 0;
    return data.map((item, index) => {
      const prevTotal = currentTotal;
      if (index === 0) { currentTotal = item.value; return { name: "Start", total: currentTotal, bottom: 0, height: currentTotal, color: "#8884d8", isStart: true }; }
      const change = item.value; currentTotal = prevTotal + change; const isPositive = change >= 0;
      return { name: `W${index}`, total: currentTotal, bottom: isPositive ? prevTotal : currentTotal, height: Math.abs(change), color: isPositive ? "#10b981" : "#ef4444", isStart: false };
    });
  }, [data]);
  const [inputVal, setInputVal] = useState(0);
  return (
    <div className="waterfall-card">
      <div className="wf-header"><h4>🌊 {title}</h4><div className="wf-controls"><input type="number" className="wf-input" value={inputVal} onChange={e=>setInputVal(e.target.value)} /><button className="wf-btn" onClick={()=>{onUpdate(parseInt(inputVal)||0); setInputVal(0);}}>Add</button></div></div>
      <div style={{ width: '100%', height: 200, fontSize: '10px' }}><ComposedChart width={300} height={200} data={processedData} margin={{top: 20, right: 0, left: -20, bottom: 0}}><XAxis dataKey="name" tick={{fontSize: 9}} interval={0} /><YAxis domain={[0, 'auto']} hide /><Tooltip /><Bar dataKey="bottom" stackId="a" fill="transparent" /><Bar dataKey="height" stackId="a">{processedData.map((e, i) => (<Cell key={`c-${i}`} fill={e.color} />))}</Bar><Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{r: 2}} /></ComposedChart></div>
      <p className="wf-footer">The blue line is your <strong>100% Real Me</strong>.</p>
    </div>
  );
}

function PqWaterfallSystem({ studentId }) {
  const METRICS = ["Homework", "Note Taking", "Attitude", "Test Prep", "Review"];
  const [selectedMetrics, setSelectedMetrics] = useState(["Homework", "Attitude"]);
  const [chartData, setChartData] = useState({ "Homework": [{value: 50}], "Attitude": [{value: 50}] });
  
  useEffect(() => { fetch(`${API_BASE}/api/students/${studentId}/pq-waterfall`).then(r=>r.json()).then(d=>{ if(d && Object.keys(d).length>0) setChartData(d); }).catch(console.error); }, [studentId]);

  const handleUpdate = async (metric, changeVal) => {
    const newData = [...(chartData[metric] || [{value: 50}]), { value: changeVal }];
    setChartData(p => ({ ...p, [metric]: newData }));
    await fetch(`${API_BASE}/api/students/${studentId}/pq-waterfall/update`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ metric_name: metric, new_entry: { value: changeVal }, full_history: newData }) });
  };
  
  const toggleMetric = (m) => {
    if (selectedMetrics.includes(m)) setSelectedMetrics(p => p.filter(i => i !== m));
    else { if (selectedMetrics.length < 3) setSelectedMetrics(p => [...p, m]); else alert("Select up to 3."); }
  };

  return (
    <div className="card" style={{background: "#fdfbf7", marginBottom: "2rem"}}>
      <h3 className="section-title">🌊 PQ Journey (12 Weeks)</h3>
      <div className="wf-selector"><span>Focus (Max 3):</span>{METRICS.map(m=><button key={m} onClick={()=>toggleMetric(m)} className={`select-chip ${selectedMetrics.includes(m)?"active":""}`}>{m}</button>)}</div>
      <div className="wf-grid">{selectedMetrics.map(m=><WaterfallChart key={m} title={m} data={chartData[m]||[{value:50}]} onUpdate={(v)=>handleUpdate(m,v)} />)}</div>
      <style>{`.wf-selector{margin-bottom:20px;display:flex;gap:8px;align-items:center}.select-chip{padding:5px 10px;border-radius:15px;border:1px solid #ccc;background:white;cursor:pointer}.select-chip.active{background:#3b82f6;color:white}.wf-grid{display:flex;flex-wrap:wrap;gap:15px}.waterfall-card{flex:1;min-width:280px;background:white;padding:15px;border-radius:12px;border:1px solid #e5e7eb}.wf-header{display:flex;justify-content:space-between;margin-bottom:10px}.wf-input{width:40px}.wf-btn{background:#10b981;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer}.wf-footer{font-size:0.7rem;text-align:center;color:#999}`}</style>
    </div>
  );
}

function GameChangerBoard({ studentId }) {
  const [messages, setMessages] = useState([]);
  const [mentorId, setMentorId] = useState("");
  const [msgContent, setMsgContent] = useState("");
  
  const load = () => fetch(`${API_BASE}/api/students/${studentId}/gc-messages`).then(r=>r.json()).then(setMessages).catch(console.error);
  useEffect(() => { load(); }, [studentId]);

  const handlePost = async () => {
    if (!mentorId.toLowerCase().startsWith("mt")) { alert("🚫 Mentor ID must start with 'mt'"); return; }
    if (!msgContent.trim()) return;
    const res = await fetch(`${API_BASE}/api/students/${studentId}/gc-messages`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({sender_id: mentorId, sender_name: "Mentor "+mentorId, message: msgContent})});
    if(res.ok) { setMsgContent(""); load(); alert("✅ Sent!"); }
  };

  return (
    <div className="card gc-board">
      <h3 className="section-title">🤝 Game Changers Board</h3>
      <div className="gc-messages-list">{messages.map((m,i)=><div key={i} className="gc-msg"><strong>{m.sender_name}:</strong> {m.message_content}<span className="date">{new Date(m.created_at).toLocaleDateString()}</span></div>)}</div>
      <div className="gc-input-area"><input placeholder="Mentor ID (mt-name)" value={mentorId} onChange={e=>setMentorId(e.target.value)} className="gc-input-id"/><textarea placeholder="Cheering message..." value={msgContent} onChange={e=>setMsgContent(e.target.value)} className="gc-input-msg"/><button onClick={handlePost} className="gc-btn">Post Message</button></div>
      <style>{`.gc-board{background:#fff0f5;border:2px solid #fbcfe8;margin-bottom:2rem}.gc-messages-list{max-height:200px;overflow-y:auto;background:white;padding:10px;border-radius:8px;border:1px solid #eee;}.gc-msg{border-bottom:1px solid #eee;padding-bottom:4px;margin-bottom:8px}.gc-msg .date{float:right;color:#999;font-size:0.75rem}.gc-input-area{display:flex;flex-direction:column;gap:8px}.gc-input-id,.gc-input-msg{padding:8px;border:1px solid #ccc;border-radius:4px}.gc-btn{background:#db2777;color:white;border:none;padding:8px;border-radius:4px;font-weight:bold;cursor:pointer}.gc-btn:hover{background:#be185d}`}</style>
    </div>
  );
}

function SpiralGraph({ nodes, onOpenGift }) {
  const [mode, setMode] = useState("outward");
  const pathData = useMemo(() => { let d=""; for(let a=0;a<=4.2;a+=0.05){ const r=(mode==="outward"?20:180)+(mode==="outward"?35:-25)*a; d+=(a===0?"M ":" L ")+(200+r*Math.cos(a*Math.PI))+" "+(200+r*Math.sin(a*Math.PI)); } return d; }, [mode]);
  const nodeElements = useMemo(() => nodes.filter(n=>n.type===mode).map(n=>{ const r=(mode==="outward"?20:180)+(mode==="outward"?35:-25)*n.angle; return {...n, x:200+r*Math.cos(n.angle*Math.PI), y:200+r*Math.sin(n.angle*Math.PI)}; }), [nodes, mode]);
  return (
    <div className="spiral-container">
      <div className="spiral-controls"><button className={`toggle-btn ${mode==="outward"?"active gold":""}`} onClick={()=>setMode("outward")}>✨ Expanding</button><button className={`toggle-btn ${mode==="inward"?"active blue":""}`} onClick={()=>setMode("inward")}>🛡️ Solidifying</button></div>
      <svg viewBox="0 0 400 400" className="spiral-svg">
        <path d={pathData} fill="none" stroke={mode==="outward"?"#f59e0b":"#3b82f6"} strokeWidth="8" strokeOpacity="0.2" strokeLinecap="round" />
        <path d={pathData} fill="none" stroke={mode==="outward"?"#fbbf24":"#60a5fa"} strokeWidth="4" strokeLinecap="round" />
        <circle cx={200} cy={200} r={18} fill={mode==="outward"?"#d97706":"#1d4ed8"} className="pulse-core" />
        <text x={200} y={205} textAnchor="middle" fill="white" fontSize="11" fontWeight="900">ME</text>
        {nodeElements.map(n=>(<g key={n.id} onClick={()=>n.isGift&&onOpenGift(n.id,n.giftContent)} style={{cursor:n.isGift?"pointer":"default"}}><circle cx={n.x} cy={n.y} r={n.isGift?14:9} fill={n.isGift?(n.opened?"#94a3b8":"#ec4899"):(mode==="outward"?"#fcd34d":"#93c5fd")} stroke="white" strokeWidth="3" /><g className="node-label"><rect x={n.x+12} y={n.y-15} width="110" height="34" rx="6" fill="white" stroke="#e2e8f0" /><text x={n.x+18} y={n.y} fontSize="10" fontWeight="bold">{n.label}</text></g></g>))}
      </svg>
    </div>
  );
}

function BadgeCard({ badge, isLocked }) {
  return <div className={`badge-card ${!isLocked?"earned":"locked"}`}><div className="badge-icon-wrapper"><img src={badge.img} alt={badge.name} className="badge-img" onError={e=>e.target.style.display="none"}/><span className="badge-fallback">🏅</span>{isLocked&&<div className="lock-overlay">🔒</div>}</div><div className="badge-info"><h4>{badge.name}</h4><p>{badge.desc}</p></div></div>;
}

function BattleArena({ studentId, onBattleWin }) {
  const [chat, setChat] = useState([{ sender: "Judy", text: "Welcome to the **Shadow Breaker Arena**!" }]);
  const [input, setInput] = useState("");
  const [questions, setQuestions] = useState([]);
  const [activeQ, setActiveQ] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch(`${API_BASE}/api/game/${studentId}/monsters`).then(r=>r.json()).then(data=>setQuestions(Array.isArray(data)?data.map(m=>({id:m.id, name:m.monster_name, hp:m.hp_current, xp:m.xp_reward, desc:m.question_text, color:m.monster_type==="BOSS"?"#ef4444":"#f59e0b"})):[])).catch(()=>setChat(p=>[...p,{sender:"System",text:"Arena Offline"}])); }, [studentId]);

  const handleAttack = async () => {
    if (!input.trim() || !activeQ) return;
    setLoading(true); setChat(p => [...p, { sender: "Student", text: `⚔️ Casting: ${input}` }]);
    try {
      const res = await fetch(`${API_BASE}/api/game/attack`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ student_id: parseInt(studentId), monster_id: activeQ, answer: input }) });
      const r = await res.json();
      if (r.status === "defeated") { confetti({ particleCount: 150 }); setChat(p => [...p, { sender: "Judy", text: `🎉 **VICTORY!** ${r.message}` }]); setQuestions(p => p.filter(q => q.id !== activeQ)); setActiveQ(null); if(onBattleWin) onBattleWin(); }
      else setChat(p => [...p, { sender: "Judy", text: `❌ Missed!` }]);
    } catch { setChat(p => [...p, { sender: "System", text: "Connection Error" }]); }
    setLoading(false); setInput("");
  };

  const handleAskJudy = async () => {
      if (!activeQ) return;
      setLoading(true); setChat(p => [...p, { sender: "Student", text: "🆘 Judy, I need help!" }]);
      try {
          const res = await fetch(`${API_BASE}/api/learning/judy-help`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ student_id: parseInt(studentId), monster_id: activeQ, student_answer: input }) });
          const d = await res.json();
          setChat(p => [...p, { sender: "Judy", text: `💡 ${d.hint}` }]);
      } catch { setChat(p => [...p, { sender: "Judy", text: "I'm having trouble connecting." }]); }
      setLoading(false);
  };

  return (
    <div className="battle-arena" style={{ backgroundImage: `url(${IMG_GAME_BG})`, backgroundSize: "cover" }}>
      <div className="overlay"><div className="header"><h3>⚔️ Shadow Battle Arena</h3><span>LIVE</span></div><div className="body"><div className="chat"><div className="msgs">{chat.map((m,i)=><div key={i} className={`msg ${m.sender==="Judy"?"judy":"user"}`}><strong>{m.sender}: </strong><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{m.text}</ReactMarkdown></div>)}</div><div className="input-box"><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Type answer..." onKeyDown={e=>e.key==="Enter"&&!loading&&handleAttack()} disabled={!activeQ||loading} /><button onClick={handleAttack} disabled={!activeQ||loading}>CAST</button><button onClick={handleAskJudy} disabled={!activeQ||loading} style={{background:"#8b5cf6", marginLeft:"5px"}} title="Ask Judy">🆘</button></div></div><div className="monsters">{questions.length===0&&<div className="clear">✨ Area Clear!</div>}{questions.map(q=><div key={q.id} className={`card ${activeQ===q.id?"active":""}`} onClick={()=>setActiveQ(q.id)} style={{borderColor:q.color}}><div className="visual" style={{background:q.color}}>👾</div><div className="info"><h5>{q.name}</h5><p>{q.desc}</p><span>+{q.xp} XP</span></div></div>)}</div></div></div>
      <style>{`.battle-arena{border-radius:16px;overflow:hidden;margin-top:2rem;border:1px solid #334155;height:450px}.overlay{background:rgba(15,23,42,0.9);width:100%;height:100%;display:flex;flex-direction:column}.header{padding:15px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;color:#fbbf24}.body{display:flex;flex:1;overflow:hidden}.chat{flex:1;border-right:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;background:rgba(0,0,0,0.2)}.msgs{flex:1;padding:15px;overflow-y:auto;display:flex;flex-direction:column;gap:10px}.msg{padding:8px 12px;border-radius:8px;font-size:0.9rem;color:white;max-width:85%}.msg.judy{background:#334155;align-self:flex-start;border-left:3px solid #fbbf24}.msg.user{background:#059669;align-self:flex-end}.input-box{padding:15px;display:flex;gap:10px;border-top:1px solid rgba(255,255,255,0.1)}.input-box input{flex:1;padding:10px;border-radius:6px;border:1px solid #475569;background:#1e293b;color:white}.input-box button{padding:0 20px;background:#6366f1;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold}.input-box button:disabled{opacity:0.5;cursor:not-allowed}.monsters{flex:1;padding:20px;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:15px;align-content:start}.card{background:rgba(30,41,59,0.8);border:2px solid #475569;border-radius:8px;overflow:hidden;cursor:pointer;transition:0.2s}.card:hover{transform:translateY(-3px)}.card.active{border-color:#ef4444!important;box-shadow:0 0 15px #ef4444}.visual{height:60px;display:flex;align-items:center;justify-content:center;font-size:2rem}.info{padding:10px}.info h5{margin:0;color:white;font-size:0.9rem}.info p{font-size:0.8rem;color:#94a3b8;margin:5px 0}.info span{font-size:0.7rem;color:#fbbf24;font-weight:bold}.clear{color:white;width:100%;text-align:center;margin-top:50px;font-style:italic}`}</style>
    </div>
  );
}

function DailyInsightModal({ data, onClose }) {
  if (!data) return null;
  return <div className="modal-overlay"><div className="insight-modal"><div className="im-header"><div className="im-title"><h3>{data.title}</h3></div></div><div className="im-body"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{data.content}</ReactMarkdown><div className="im-bonus">🌟 {data.bonus}</div></div><button className="im-btn" onClick={onClose}>Thanks, Samie!</button></div><style>{`.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:5000}.insight-modal{background:white;width:500px;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.2);animation:slideUp 0.4s}.im-header{background:linear-gradient(135deg,#4f46e5 0%,#818cf8 100%);padding:25px;color:white}.im-title h3{margin:0;font-size:1.4rem}.im-body{padding:30px;color:#334155;line-height:1.6;font-size:1.3rem}.im-bonus{margin-top:20px;background:#fffbeb;color:#d97706;padding:15px;border-radius:8px;font-weight:bold;border-left:5px solid #f59e0b;font-size:1.1rem}.im-btn{width:100%;padding:20px;background:#f8fafc;border:none;border-top:1px solid #e2e8f0;color:#000000;font-weight:900;cursor:pointer;font-size:1.1rem}.im-btn:hover{background:#e2e8f0}@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style></div>;
}

// ============================
// 4. MAIN DASHBOARD LAYOUT
// ============================
export default function PageStudent() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [rmsqData, setRmsqData] = useState([]);
  const [insight, setInsight] = useState(null);
  const [showInsight, setShowInsight] = useState(false);

  // --- SAMIE CHAT STATE ---
  const [chatHistory, setChatHistory] = useState([{ role: "assistant", content: "Hi! I'm Samie. I'm ready to help you unlock your math potential. What are we working on?" }]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [saturdayLog, setSaturdayLog] = useState(null);
  
  // --- GRAPHING STATE (NEW) ---
  const [canvas, setCanvas] = useState(null);
  const [isGraphPanelOpen, setIsGraphPanelOpen] = useState(false);

  const refreshData = () => {
    fetch(`${API_BASE}/api/students/${studentId}/dashboard`).then(r=>r.json()).then(setDashboardData).catch(console.error);
    fetch(`${API_BASE}/api/students/${studentId}/rmsq-stats`).then(r=>r.json()).then(d=>{ setRmsqData(d.graph_data||[]); setInsight(d.insight||null); }).catch(console.error);
  };

  useEffect(() => { refreshData(); if (studentId === "1") setTimeout(() => setShowInsight(true), 1500); }, [studentId]);

  const handleOpenGift = (id, content) => { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); alert(`🎉 GIFT UNLOCKED!\n\n${content}`); };

  // --- THE NEW "BRAIN" FUNCTION WITH GRAPH DETECTION ---
  const handleSamieChat = async () => {
    if (!chatInput.trim()) return;
    const userText = chatInput;
    setChatInput("");
    
    // 1. Add user message
    const newMessages = [...chatHistory, { role: "user", content: userText }];
    setChatHistory(newMessages);
    setIsChatLoading(true);

    // 2. Prepare Payload (INJECTING THE BRAIN)
    const apiMessages = [
        { role: "system", content: SAMIE_SYSTEM_PROMPT }, 
        ...newMessages
    ];

    try {
        const response = await fetch(`${API_BASE}/api/learning/tutor-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                student_id: parseInt(studentId),
                history: apiMessages,
                message: userText,
                persona: "samie"
            })
        });
        const data = await response.json();
        
        // --- UNWRAP JSON FIX ---
        let rawText = data.content;
        try {
            const parsed = JSON.parse(rawText);
            if (parsed.content) rawText = parsed.content;
        } catch (e) { /* It was plain text */ }
        // -----------------------

        let displayContent = rawText;

        // --- GRAPH DETECTION ---
        const graphMatch = rawText.match(/:::GRAPH_DATA ([\s\S]*?) :::/);
        if (graphMatch) {
            try {
                const figureData = JSON.parse(graphMatch[1]);
                setCanvas({ ts: Date.now(), content: "Graph", figure: figureData });
                setIsGraphPanelOpen(true);
                // Hide code from chat
                displayContent = rawText.replace(graphMatch[0], "").trim(); 
            } catch (e) { console.error("Graph Parse Error", e); }
        }

        // --- SATURDAY LOG ---
        if (displayContent.includes("MENTOR HANDOVER REPORT")) {
            console.log("⚠️ SATURDAY LOG GENERATED");
            setSaturdayLog(displayContent);
        }

        setChatHistory(prev => [...prev, { role: "assistant", content: displayContent }]);
    } catch (error) {
        console.error("Samie Error:", error);
        setChatHistory(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
        setIsChatLoading(false);
    }
  };

  if (!dashboardData) return <div style={{ padding: 50, textAlign: "center" }}>Loading DreamARC...</div>;

  const isDemo = studentId === "1";
  const latestEntry = rmsqData.length > 0 ? rmsqData[rmsqData.length - 1] : { lambda_val: 0, rmsq: 0 };
  const currentLambda = Number(latestEntry?.lambda_val ?? 0);
  const currentRMSQ = Number(latestEntry?.rmsq ?? 0);

  return (
    <div className="dashboard-container">
      {/* 1. HEADER */}
      <div className="header-row">
        <div>
          <h1 className="title">🎓 Student: {studentId}</h1>
          <p className="subtitle">"Don't bow your head, you are a shining star."</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => navigate(`/gamechanger/${studentId}`)}>🎮 Game Changer</button>
          <button className="btn btn-secondary" onClick={() => navigate("/")}>Logout</button>
        </div>
      </div>

      <MetricLegend />

      {/* 2. BADGES */}
      <div className="badge-section">
        <h3 className="section-title">🏆 Flexaspire Honor Court</h3>
        <div className="flexaspire-manifesto">
          <strong>🔥 The Flexaspire Identity</strong>
          <p>"A Flexaspire is a student who harmoniously possesses <em>flexibility</em> to engage in suffering reality and the <em>inspiring ability</em> to lead others."</p>
        </div>
        <div className="badge-grid">
          {BADGES.map(b => <BadgeCard key={b.id} badge={b} isLocked={!b.earned || !isDemo} />)}
        </div>
      </div>

      {/* 3. DATA COMMAND CENTER */}
      <div className="card" style={{ marginBottom: "1.5rem", background: "linear-gradient(to right, #f8fafc, #fff)" }}>
        <h3 className="section-title">⚡ Real-Time Cognitive Status</h3>
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", flexWrap: "wrap" }}>
          <MetricGauge value={currentLambda} max={5} label="Instability (λ)" color={currentLambda > 3 ? "#ef4444" : "#10b981"} />
          <div style={{ width: "1px", height: "80px", background: "#e2e8f0" }} />
          <MetricGauge value={currentRMSQ} max={100} label="Resilience (RMSQ)" color={currentRMSQ > 80 ? "#10b981" : "#f59e0b"} />
        </div>
      </div>

      {/* 4. SAMIE LIVE TUTOR CHAT */}
      <div className="card" style={{ marginBottom: "2rem", border: "2px solid #3b82f6" }}>
         <div className="wb-header" style={{background:"#eff6ff", color:"#1d4ed8", padding:'10px', fontWeight:'bold', borderBottom:'1px solid #bfdbfe'}}>
            <span>🤖 Samie: Live Holistic Tutor</span>
            <span style={{fontSize:"0.8rem", background:"white", padding:"2px 8px", borderRadius:"12px", marginLeft:'10px', color:'#1e40af'}}>AI Active</span>
         </div>
         
         <div style={{ height: "400px", display: "flex", flexDirection: "column" }}>
           {/* Chat Area */}
           <div style={{ flex: 1, padding: "20px", overflowY: "auto", background: "#f8fafc" }}>
              {chatHistory.map((msg, i) => (
                 <div key={i} style={{ 
                     display: "flex", 
                     justifyContent: msg.role === "user" ? "flex-end" : "flex-start", 
                     marginBottom: "15px" 
                 }}>
                     <div style={{ 
                       maxWidth: "80%", 
                       padding: "12px 16px", 
                       borderRadius: "12px", 
                       background: msg.role === "user" ? "#3b82f6" : "white", 
                       color: msg.role === "user" ? "white" : "#1e293b",
                       boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                       border: msg.role === "user" ? "none" : "1px solid #e2e8f0"
                     }}>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
                     </div>
                 </div>
              ))}
              {isChatLoading && <div style={{textAlign:"center", color:"#94a3b8"}}>Samie is thinking...</div>}
           </div>

           {/* Input Area */}
           <div style={{ padding: "15px", borderTop: "1px solid #e2e8f0", background: "white", display: "flex", gap: "10px" }}>
              <input 
                 value={chatInput} 
                 onChange={(e) => setChatInput(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && handleSamieChat()}
                 placeholder="Ask Samie a math question (e.g. 'Plot y=x^2')" 
                 style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }}
              />
              <button 
                 onClick={handleSamieChat} 
                 disabled={isChatLoading}
                 style={{ padding: "0 25px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
              >
                 Send
              </button>
           </div>
         </div>

         {/* 🕵️ SATURDAY LOG NOTIFICATION AREA */}
{/* 🕵️ SATURDAY LOG NOTIFICATION AREA */}
{saturdayLog && (
   <div className="p-6 bg-indigo-50 border-t-2 border-indigo-500 animate-fade-in" style={{padding:"20px", background:"#e0e7ff"}}>
      <div style={{display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px"}}>
         <span style={{fontSize:"1.5rem"}}>📋</span>
         <h3 style={{margin:0, color:"#312e81"}}>Saturday Mentor Log Generated</h3>
      </div>
      {/* 아래 줄의 background="white"를 background:"white"로 수정했습니다. */}
      <div style={{background: "white", padding: "15px", borderRadius: "8px", fontSize: "0.85rem", whiteSpace: "pre-wrap", fontFamily: "monospace", marginBottom: "15px", border: "1px solid #c7d2fe"}}>
         {saturdayLog.split("MENTOR HANDOVER REPORT")[1] || saturdayLog}
      </div>
      <div style={{display:"flex", gap:"10px"}}>
         <button className="btn-primary" onClick={() => alert("Sent to Mentor Dashboard!")} style={{padding:'8px 16px', background:'#4338ca', color:'white', border:'none', borderRadius:'6px', cursor:'pointer'}}>✅ Send to Mentor</button>
         <button className="btn-secondary" onClick={() => setSaturdayLog(null)} style={{padding:'8px 16px', background:'white', border:'1px solid #ccc', borderRadius:'6px', cursor:'pointer'}}>Dismiss</button>
      </div>
   </div>
)}
      </div>

      {/* 5. DYNAMICS & JOURNEY */}
      <div className="hero-grid" style={{marginBottom: "1.5rem"}}>
        <div className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3>📉 Struggle vs. Harvest</h3>
            {insight && (
              <span style={{background: insight.color, color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold'}}>
                {insight.status}
              </span>
            )}
          </div>
          <ChartBox height={180}>
            {({ w, h }) => (
              <ComposedChart width={w} height={h} data={rmsqData}>
                <XAxis dataKey="label" fontSize={10} />
                <YAxis yAxisId="left" hide domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" hide domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="rmsq" name="RMSQ (Resilience)" fill="#10b981" barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="lambda_val" name="Lambda (Instability)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            )}
          </ChartBox>
          {insight && (
            <div style={{marginTop: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '15px'}}>
              <div style={{display: 'flex', gap: '15px'}}>
                <div style={{flex: 1, background: '#f8fafc', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #3b82f6'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px'}}>
                    <span style={{fontSize:'1.2rem'}}>👩‍🏫</span><strong style={{fontSize:'0.8rem', color:'#334155'}}>Judy</strong>
                  </div>
                  <p style={{fontSize:'0.75rem', color:'#475569', margin:0, fontStyle:'italic'}}>"{insight.judy_advice}"</p>
                </div>
                <div style={{flex: 1, background: '#fffbeb', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #f59e0b'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px'}}>
                    <span style={{fontSize:'1.2rem'}}>🧡</span><strong style={{fontSize:'0.8rem', color:'#92400e'}}>Samie</strong>
                  </div>
                  <p style={{fontSize:'0.75rem', color:'#b45309', margin:0, fontStyle:'italic'}}>"{insight.samie_advice}"</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card spiral-card">
          <h3>🌀 Growth Spiral</h3>
          <SpiralGraph nodes={MOCK_SPIRAL_NODES} onOpenGift={handleOpenGift} />
        </div>
      </div>

      <PqWaterfallSystem studentId={studentId} />

      <div style={{ marginBottom: "2rem" }}>
         <AtozDashboard studentId={studentId} /> 
      </div>

      <div style={{ marginBottom: "2rem" }}>
         <GameChangerBoard studentId={studentId} /> 
      </div>

      {/* ✅ UPDATED TOOLS GRID: Sketch Board Removed to unblock Calendar */}
      <div className="tools-grid">
        <CatchUpModule isDemo={isDemo} />
        <div className="card-no-padding"><StudyCalendar studentId={studentId} /></div>
      </div>

      {/* PAST LOGS */}
      <div className="card" style={{ marginBottom: "2rem", maxHeight: "300px", overflowY: "auto" }}>
        <h3 className="section-title">📜 Past Tutoring Logs</h3>
        <div>
          {dashboardData.recent_logs && dashboardData.recent_logs.length > 0 ? (
            dashboardData.recent_logs.map((log, i) => (
              <div key={i} style={{ marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                  <strong style={{ color: "#3b82f6" }}>{log.date}</strong>
                  <span style={{ color: "#64748b", background: "#f8fafc", padding: "2px 6px", borderRadius: "4px" }}>{log.tutor}</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#334155" }}>{log.content}</p>
              </div>
            ))
          ) : <p style={{ color: "#94a3b8", fontStyle: "italic" }}>No logs yet.</p>}
        </div>
      </div>

      <BattleArena studentId={studentId} onBattleWin={refreshData} />
      
      {showInsight && insight && <DailyInsightModal data={insight} onClose={() => setShowInsight(false)} />}
      
      {/* GRAPH MODAL POPUP */}
      {isGraphPanelOpen && canvas && (
        <div className="modal-overlay" onClick={() => setIsGraphPanelOpen(false)} style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:2000, display:'flex', justifyContent:'center', alignItems:'center'}}>
          <div className="modal-content" style={{background:'white', padding:'20px', borderRadius:'12px', width:'80vw', maxWidth:'800px'}} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsGraphPanelOpen(false)} style={{float:'right', background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer'}}>✕</button>
            <h3>📈 Graph View</h3>
            <SamieGraph figure={canvas.figure} />
          </div>
        </div>
      )}

      <style>{`
        .dashboard-container { font-family: 'Inter', sans-serif; background: #f8fafc; min-height: 100vh; padding: 2rem; }
        .header-row { display: flex; justify-content: space-between; margin-bottom: 2rem; }
        .title { margin: 0; color: #0f172a; font-size: 1.8rem; }
        .subtitle { color: #64748b; margin: 5px 0 0 0; font-style: italic; }
        .section-title { font-size: 1.1rem; color: #475569; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; border-left: 4px solid #f59e0b; padding-left: 10px; }
        .flexaspire-manifesto { background: linear-gradient(to right, #fffbeb, #fff); border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 8px; color: #4b5563; font-size: 0.9rem; line-height: 1.5; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .flexaspire-manifesto strong { display: block; margin-bottom: 5px; color: #d97706; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; }
        .badge-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .badge-card { background: white; padding: 1rem; border-radius: 12px; display: flex; gap: 15px; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; transition: transform 0.2s; }
        .badge-card.earned { border-color: #f59e0b; background: linear-gradient(to right, #fff, #fffbeb); }
        .badge-card.locked { opacity: 0.7; filter: grayscale(1); }
        .badge-card:hover { transform: translateY(-3px); }
        .badge-icon-wrapper { position: relative; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; }
        .badge-img { width: 100%; height: 100%; object-fit: contain; }
        .badge-fallback { font-size: 2.5rem; }
        .lock-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: rgba(255,255,255,0.5); }
        .badge-info h4 { margin: 0 0 5px 0; color: #1e293b; }
        .badge-info p { margin: 0; font-size: 0.8rem; color: #64748b; line-height: 1.3; }
        .tools-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; }
        .hero-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 2rem; margin-bottom: 2rem; }
        .card { background: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .card-no-padding { background: white; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; }
        .card-effect { background: #fff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; overflow: hidden; }
        .metric-legend { margin-bottom: 2rem; }
        .legend-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
        .legend-item h4 { margin: 0; color: #334155; border-bottom: 2px solid #f1f5f9; padding-bottom: 5px; margin-bottom: 5px; }
        .legend-item .muted { font-size: 0.8rem; color: #64748b; margin-bottom: 10px; font-style: italic; }
        .legend-item ul { list-style: none; padding: 0; margin: 0; font-size: 0.9rem; color: #475569; }
        .legend-item li { margin-bottom: 4px; }
        .btn { padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; cursor: pointer; font-weight: bold; }
        .btn-primary { background: #4f46e5; color: white; border: none; }
        .btn-secondary { background: white; color: #475569; }
        
        /* CatchUp CSS */
        .catchup-container { padding: 0; height: 100%; display: flex; flex-direction: column; }
        .cup-header { background: #4f46e5; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; font-weight: bold; }
        .cup-badge { background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; }
        .cup-badge.active { background: #10b981; color: white; }
        .cup-body { padding: 20px; flex: 1; display: flex; flex-direction: column; gap: 15px; }
        .cup-body.center { align-items: center; justify-content: center; text-align: center; }
        .cup-action-btn { background: #4f46e5; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%; }
        .spinner { font-size: 2rem; animation: spin 2s infinite linear; }
        .plan-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .plan-card { background: #f8fafc; padding: 10px; border-radius: 8px; display: flex; align-items: center; gap: 10px; border: 1px solid #e2e8f0; }
        .subject-icon { font-size: 1.5rem; }
        .ai-message { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px; border-radius: 6px; display: flex; gap: 10px; font-size: 0.85rem; color: #92400e; }
        
        /* Calendar */
        .calendar-container { display: flex; flex-direction: column; height: 100%; }
        .cal-header { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #fdfbf7; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #334155; }
        .privacy-badge { display: flex; align-items: center; gap: 5px; font-size: 0.75rem; background: #ecfdf5; color: #059669; padding: 4px 8px; border-radius: 20px; font-weight: bold; }
        .cal-body { display: flex; flex: 1; }
        .cal-grid-wrapper { flex: 0 0 40%; border-right: 1px solid #f1f5f9; padding: 15px; background: #fdfbf7; }
        .cal-month-label { font-size: 1.2rem; font-weight: 900; color: #cbd5e1; margin-bottom: 10px; text-align: center; text-transform: uppercase; letter-spacing: 2px; }
        .cal-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
        .cal-day { aspect-ratio: 1; background: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; font-size: 0.8rem; position: relative; border: 1px solid #f1f5f9; color: #64748b; font-weight: bold; transition: all 0.2s; }
        .cal-day:hover { border-color: #3b82f6; color: #3b82f6; }
        .cal-day.active { background: #3b82f6; color: white; border-color: #3b82f6; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3); transform: scale(1.05); }
        .event-dot { position: absolute; bottom: 4px; width: 4px; height: 4px; background: #ef4444; border-radius: 50%; }
        .cal-journal-page { flex: 1; padding: 20px; background: #fffcf5; display: flex; flex-direction: column; }
        .journal-paper { flex: 1; display: flex; flex-direction: column; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; }
        .journal-date { margin: 0 0 15px 0; color: #475569; font-size: 0.95rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
        .journal-entries { flex: 1; overflow-y: auto; margin-bottom: 15px; font-family: 'Georgia', serif; color: #334155; line-height: 1.6; }
        .entry-line { margin-bottom: 8px; font-size: 0.95rem; }
        .bullet { color: #cbd5e1; margin-right: 8px; }
        .empty-state { text-align: center; color: #94a3b8; font-style: italic; margin-top: 20px; font-size: 0.9rem; }
        .journal-input-wrapper { margin-top: auto; display: flex; flex-direction: column; gap: 10px; }
        .journal-textarea { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: 'Georgia', serif; font-size: 0.95rem; line-height: 1.5; resize: none; background: #fcfcfc; transition: border 0.2s; outline: none; }
        .journal-textarea:focus { border-color: #3b82f6; background: white; }
        .save-btn { align-self: flex-end; padding: 8px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 0.85rem; transition: background 0.2s; }
        .save-btn:hover { background: #2563eb; }
        
        /* Spiral */
        .spiral-container { display: flex; flex-direction: column; align-items: center; }
        .spiral-controls { margin-bottom: 10px; display: flex; gap: 10px; }
        .toggle-btn { padding: 5px 15px; border-radius: 20px; border: 1px solid #eee; cursor: pointer; background: white; }
        .toggle-btn.active.gold { background: #fffbeb; color: #d97706; border-color: #f59e0b; }
        .toggle-btn.active.blue { background: #eff6ff; color: #1d4ed8; border-color: #3b82f6; }
        .spiral-svg { width: 100%; height: 320px; }
        .pulse-core { animation: pulse 2s infinite; }
        @keyframes pulse { 0% { r: 15; opacity: 1; } 50% { r: 18; opacity: 0.8; } 100% { r: 15; opacity: 1; } }
        .annotation-box { background: #ecfdf5; padding: 10px; border-left: 4px solid #10b981; color: #065f46; margin-top: 10px; font-size: 0.85rem; font-weight: bold; }

        /* ATOZ Dashboard Styles */
        .atoz-container { padding: 25px; background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .bar-row { margin-bottom: 20px; }
        .label-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: bold; color: #555; align-items: center; }
        .bar-track { height: 35px; background-color: #e0e0e0; border-radius: 20px; overflow: hidden; margin-bottom: 12px; }
        .bar-fill { height: 100%; background-color: #3b82f6; width: 0%; transition: width 0.5s ease-in-out; display: flex; align-items: center; justify-content: flex-end; padding-right: 15px; color: white; font-weight: bold; font-size: 0.9rem; }
        .score-input { width: 70px; padding: 5px; text-align: center; border-radius: 6px; border: 1px solid #ccc; font-weight: bold; }
        .input-area label { display: block; font-size: 0.85rem; color: #64748b; margin-bottom: 5px; font-weight: 600; }
        .rms-input { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; background-color: #f8fafc; resize: vertical; outline: none; transition: border 0.2s; }
        .rms-input:focus { border-color: #3b82f6; background: white; }
        .atoz-divider { border: 0; border-top: 1px dashed #cbd5e1; margin: 25px 0; }

        /* Game Changers Board */
        .gc-board { background: #fff0f5; border: 2px solid #fbcfe8; margin-bottom: 2rem; }
        .gc-messages-list { max-height: 200px; overflow-y: auto; margin-bottom: 15px; background: white; padding: 10px; border-radius: 8px; border: 1px solid #eee; }
        .gc-msg { margin-bottom: 8px; font-size: 0.9rem; border-bottom: 1px solid #f0f0f0; padding-bottom: 4px; }
        .gc-msg .date { float: right; color: #999; font-size: 0.75rem; }
        .gc-input-area { display: flex; flex-direction: column; gap: 8px; }
        .gc-input-id { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
        .gc-input-msg { padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical; min-height: 60px; }
        .gc-btn { background: #db2777; color: white; border: none; padding: 8px; border-radius: 4px; font-weight: bold; cursor: pointer; }
        .gc-btn:hover { background: #be185d; }
      `}</style>
    </div>
  );
}



