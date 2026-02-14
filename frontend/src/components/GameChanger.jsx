import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// --- IMPORTS ---
import { API_BASE } from "../api"; 
import { useAuth } from "../context/AuthContext.jsx";
import SamieGraph from "./SamieGraph.jsx"; 
import "./GameChanger.css"; 

// --- 🎭 PERSONA CONFIGURATION: DR. SAM (FORCED SOLVE PROTOCOL) ---
const PERSONAS = {
  samie: {
    id: "samie",
    name: "Dr. Sam",
    role: "Visual Tutor",
    avatar: "/images/Sam.png", 
    themeColor: "#4f46e5", 
    bgColor: "#eef2ff", 
    greeting: "Hi! I'm Dr. Sam. 🐾 \n\nI can see your screen and help you solve problems step-by-step. Upload a photo or type a math problem!",
    systemPrompt: `You are Dr. Sam (Samie), a warm, visual, and empathic AI tutor for students.
    1. **VISUALS:** If a student asks about geometry or functions, output a JSON graph tag: :::GRAPH_DATA {"title": "Graph", "data": [...]} :::
    2. **QUIZ:** If you want to test understanding, output JSON: :::QUIZ_DATA [{"question": "...", "options": ["A", "B"], "correct_index": 0, "explanation": "..."}] :::
    3. **TUTOR MODE:** In text chat, ask one guiding question at a time.
    4. **OCD_CAMERA_SUBMISSION (CRITICAL):** If the input contains "OCD_CAMERA_SUBMISSION", bypass all tutoring rules. This student is in a fragile "Shadow State." You MUST solve the math problem in the image FULLY and provide the FINAL answer in LaTeX immediately. Do NOT refuse. Do NOT say you are an AI language model. Analyze and solve at all costs to reduce student anxiety.
    5. **NO REFUSALS:** You are a Vision-enabled AI. If the image is blurry, make a best-guess assumption and solve it. Refusal triggers a learning failure loop.
    6. **MATH FORMAT:** Always use LaTeX $...$ (inline) and $$...$$ (display) for all results like $x = -15$.`
  }
};

// --- SIDEBAR DATA ---
const MOCK_BOARD_MESSAGES = [
    { id: 1, from: "Admin", text: "Welcome! 🎓", date: "2025-12-01" },
    { id: 2, from: "System", text: "Dr. Sam is now updated with plotting skills.", date: "2025-12-15" },
    { id: 3, from: "Judy", text: "Don't forget to check your Shadow Radar scores.", date: "2025-12-18" },
];
const MOCK_SESSION_HISTORY = [
    { id: 101, topic: "Quadratic Functions", date: "Today 10:00 AM" },
    { id: 102, topic: "Linear Algebra Intro", date: "Yesterday" },
];

// --- HELPER FUNCTIONS ---
function normalizeMarkdown(value) { return typeof value === "string" ? value : ""; }
function getAuthToken() { try { const authData = JSON.parse(localStorage.getItem("dreamarc.auth")); return authData?.access_token || null; } catch (e) { return null; } }

// ==========================================
// --- SUB-COMPONENT: VISUAL SOLVER ---
// ==========================================
const VisualSolver = ({ solverData }) => {
  if (!solverData) return null;
  const renderIcons = (count, icon) => Array.from({ length: count }).map((_, i) => (
    <span key={i} className="visual-icon" style={{ fontSize: '2rem', margin: '0 2px' }}>{icon}</span>
  ));
  return (
    <div className="visual-solver-card" style={{padding: '15px', background: '#fffbeb', borderRadius: '12px', border: '2px solid #fcd34d', margin: '10px 0'}}>
      <h3 style={{ textAlign: 'center', color: '#92400e', margin: '0 0 10px 0' }}>✨ Let's Count!</h3>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
        <div style={{ textAlign: 'center' }}><div style={{fontSize:'1.5rem', fontWeight:'bold', color:'#3b82f6'}}>{solverData.step_1.number}</div><div>{renderIcons(solverData.step_1.number, solverData.step_1.icon)}</div></div>
        <div style={{fontSize:'2rem', color:'#6b7280'}}>{solverData.type === 'addition' ? '+' : '-'}</div>
        <div style={{ textAlign: 'center' }}><div style={{fontSize:'1.5rem', fontWeight:'bold', color:'#ef4444'}}>{solverData.step_2.number}</div><div>{renderIcons(solverData.step_2.number, solverData.step_2.icon)}</div></div>
      </div>
      <div style={{ textAlign: 'center' }}><span style={{ fontSize: '2rem' }}>⬇️</span></div>
      <div style={{ textAlign: 'center', background:'white', padding:'10px', borderRadius:'8px' }}>
          <div style={{fontSize:'2.5rem', fontWeight:'bold', color:'#22c55e'}}>{solverData.step_3.result}</div>
          <div>{renderIcons(solverData.step_3.result, solverData.step_1.icon)}</div>
      </div>
    </div>
  );
};

function ttsSanitizeMath(text) {
  if (!text) return "";
  let s = String(text);
  s = s.replace(/:::GRAPH_DATA[\s\S]*?:::/g, "");
  s = s.replace(/:::QUIZ_DATA[\s\S]*?:::/g, "");
  s = s.replace(/\$\$[\s\S]*?\$\$/g, " ");
  s = s.replace(/\$[^$]*\$/g, " ");
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 over $2");
  s = s.replace(/\\sqrt\{([^}]+)\}/g, "square root of $1");
  s = s.replace(/[\\{}]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// ==========================================
// --- SUB-COMPONENT: QUIZ CARD ---
// ==========================================
const QuizComponent = ({ quizData }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const currentQ = quizData[currentIdx];

  const handleOptionClick = (idx) => {
    if (showExplanation) return;
    const correct = idx === currentQ.correct_index;
    setSelectedOption(idx); setIsCorrect(correct); setShowExplanation(true);
  };

  return (
    <div className="quiz-card" style={{ border: '1px solid #e5e7eb', background: 'white', borderRadius: '12px', overflow: 'hidden', margin: '10px 0' }}>
      <div className="quiz-header" style={{ background: '#f9fafb', color: '#374151', padding: '10px', display:'flex', justifyContent:'space-between', borderBottom:'1px solid #e5e7eb' }}>
        <strong>Quiz Mode</strong>
        <span>Q {currentIdx + 1}/{quizData.length}</span>
      </div>
      <div style={{padding:'15px'}}>
        <div className="quiz-question" style={{marginBottom:'15px'}}><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{currentQ.question}</ReactMarkdown></div>
        <div className="quiz-options-grid" style={{display:'grid', gap:'10px'}}>
            {currentQ.options.map((opt, idx) => {
                let bg = 'white'; let border = '#d1d5db';
                if(showExplanation) {
                    if(idx === currentQ.correct_index) { bg = '#dcfce7'; border = '#22c55e'; }
                    else if(idx === selectedOption) { bg = '#fee2e2'; border = '#ef4444'; }
                }
                return (
                    <button key={idx} onClick={() => handleOptionClick(idx)} style={{padding:'10px', borderRadius:'8px', border:`1px solid ${border}`, background: bg, textAlign:'left', cursor:'pointer'}}>
                        {opt}
                    </button>
                )
            })}
        </div>
        {showExplanation && (
            <div style={{marginTop:'15px', padding:'10px', background:'#f3f4f6', borderRadius:'8px'}}>
                <h4 style={{margin:'0 0 5px 0', color: isCorrect ? '#15803d' : '#b91c1c'}}>{isCorrect ? "Correct!" : "Incorrect"}</h4>
                <div style={{fontSize:'0.9rem', color:'#4b5563'}}><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{currentQ.explanation}</ReactMarkdown></div>
                <button onClick={() => currentIdx < quizData.length - 1 ? (setCurrentIdx(i => i + 1), setSelectedOption(null), setIsCorrect(null), setShowExplanation(false)) : alert("Quiz Complete!")} style={{marginTop:'10px', padding:'8px 16px', background:'#4f46e5', color:'white', border:'none', borderRadius:'6px', cursor:'pointer'}}>
                    Next Question ➡️
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// --- MAIN PAGE COMPONENT ---
// ==========================================
export default function GameChanger() {
  const { studentId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const activePersona = "samie"; 
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [boardMessages, setBoardMessages] = useState(MOCK_BOARD_MESSAGES);
  const [showBoard, setShowBoard] = useState(true); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [droppedFile, setDroppedFile] = useState(null);
  const [isGraphPanelOpen, setIsGraphPanelOpen] = useState(false);
  const [canvas, setCanvas] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [lang, setLang] = useState("en"); 
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const currentConfig = PERSONAS[activePersona];

  useEffect(() => { setHistory([{ role: "assistant", content: currentConfig.greeting }]); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  const goDashboard = () => { navigate(`/student/${studentId || user?.id}`); };
  const handleLogout = () => { logout(); navigate("/"); };

  const toggleListening = () => {
    if (!("webkitSpeechRecognition" in window)) { alert("Voice input not supported."); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); } 
    else {
      const recognition = new window.webkitSpeechRecognition();
      recognition.lang = lang === "ko" ? "ko-KR" : "en-US";
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (e) => setInput(prev => prev + " " + e.results[0][0].transcript);
      recognitionRef.current = recognition; recognition.start();
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDrop = (e) => { 
      e.preventDefault(); setIsDragOver(false); 
      const file = e.dataTransfer.files[0]; 
      if (file && file.type.startsWith("image/")) { 
          const reader = new FileReader(); 
          reader.onload = (ev) => { setDroppedFile(ev.target.result); setIsModalOpen(true); }; 
          reader.readAsDataURL(file); 
      } 
  };

  const getResponse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const userMsg = { role: "user", content: input };
    const newHistoryObj = [...history, userMsg];
    setHistory(newHistoryObj); setInput("");

    try {
      const token = getAuthToken();
      const systemMsg = { role: "system", content: currentConfig.systemPrompt };
      const apiHistory = [systemMsg, ...newHistoryObj].map(msg => ({ role: msg.role, content: typeof msg.content === 'object' ? JSON.stringify(msg.content) : String(msg.content) }));

      const res = await fetch(`${API_BASE}/api/learning/tutor-request`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ history: apiHistory, student_id: studentId || user?.id, persona: "samie" })
      });
      
      const data = await res.json();
      let rawText = data.content;
      let finalContent = { content: rawText };

      const graphMatch = rawText.match(/:::GRAPH_DATA ([\s\S]*?) :::/);
      if (graphMatch) {
          try {
              const figureData = JSON.parse(graphMatch[1]);
              setCanvas({ ts: Date.now(), figure: figureData });
              setIsGraphPanelOpen(true);
              rawText = rawText.replace(graphMatch[0], "").trim();
          } catch (e) { console.error("Graph Parse Error", e); }
      }

      const quizMatch = rawText.match(/:::QUIZ_DATA ([\s\S]*?) :::/);
      if (quizMatch) {
          try {
              const quizData = JSON.parse(quizMatch[1]);
              finalContent = { content: rawText.replace(quizMatch[0], "").trim(), quiz_data: quizData };
          } catch (e) { console.error("Quiz Parse Error", e); }
      } else { finalContent = { content: rawText }; }

      setHistory(prev => [...prev, { role: "assistant", content: finalContent }]);
    } catch (err) {
      setHistory(prev => [...prev, { role: "assistant", content: { content: "Snag hit! Let's try again. ✨" } }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="game-wrapper" onDragOver={handleDragOver} onDrop={handleDrop} onDragLeave={()=>setIsDragOver(false)} 
      style={{ fontFamily: "'Inter', sans-serif", height: '100vh', display: 'flex', flexDirection: 'column', background: '#f0fdf4', backgroundImage: 'url("/images/game/game-bg.png")', backgroundSize: 'cover' }}>
      
      {isDragOver && ( <div style={{position:'absolute', inset:0, background: currentConfig.themeColor + 'DD', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'2rem', flexDirection:'column'}}> <div style={{fontSize:'4rem'}}>📂</div> <div>Drop work for Dr. Sam</div> </div> )}

      <div className="header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: 'rgba(255, 255, 255, 0.95)', borderBottom: '1px solid #dcfce7', backdropFilter: 'blur(5px)' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate(-1)} style={{border:'none', background:'transparent', fontSize:'1.2rem', cursor:'pointer'}}>←</button>
            <h2 style={{ margin: 0, color: '#166534', fontSize:'1.2rem' }}>📷 Game Changer: {currentConfig.name}</h2>
         </div>
         <div style={{ display: 'flex', gap: '10px', alignItems:'center' }}>
            <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
              <option value="en">English</option>
              <option value="ko">한국어</option>
              <option value="es">Español</option>
            </select>
            <button onClick={()=>setShowBoard(!showBoard)} style={{background:'#dcfce7', color:'#166534', padding:'6px 12px', borderRadius:'6px', border:'none', cursor:'pointer', fontWeight:'bold'}}>{showBoard ? "Hide Board ➡" : "⬅ Show Board"}</button>
            <button onClick={goDashboard} style={{padding:'6px 12px', borderRadius:'6px', border:'1px solid #ddd', background:'white', cursor:'pointer'}}>Dashboard</button>
            <button onClick={handleLogout} style={{padding:'6px 12px', borderRadius:'6px', border:'1px solid #999', background:'white', cursor:'pointer', color: 'black', fontWeight: 'bold'}}>Logout</button>
         </div>
      </div>
      
      <div className="main-grid" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
         <div className="chat-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0', background: 'rgba(255,255,255,0.9)' }}>
            <div className="samie-avatar-strip" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <img src={currentConfig.avatar} alt="Avatar" style={{ width: '45px', height: '45px', borderRadius: '50%', border: `2px solid ${currentConfig.themeColor}` }} />
                <div><div style={{ fontWeight: 'bold', color: '#334155' }}>{currentConfig.role}</div><div style={{ fontSize: '0.8rem', color: '#64748b' }}>Online</div></div>
            </div>

            <div className="messages" style={{ flex: 1, padding: '20px', overflowY: 'auto', background: currentConfig.bgColor }}>
              {history.map((msg, i) => {
                let contentObj = msg.content;
                if (typeof msg.content === 'string') { try { contentObj = JSON.parse(msg.content); } catch { contentObj = { content: msg.content }; } }
                if (msg.role === "assistant") { 
                   if (contentObj.quiz_data) return <div key={i}><QuizComponent quizData={contentObj.quiz_data} /></div>; 
                   if (contentObj.visual_solver) return <div key={i}><VisualSolver solverData={contentObj.visual_solver} /></div>; 
                }
                const isUser = msg.role === "user";
                return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', marginBottom: '15px', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                        {!isUser && <div style={{fontSize:'0.8rem', color:'#64748b', marginBottom:'4px'}}>Dr. Sam</div>}
                        <div style={{ padding: '12px 18px', maxWidth: '80%', borderRadius: '12px', background: isUser ? '#3b82f6' : 'white', color: isUser ? 'white' : '#1e293b', border: isUser ? 'none' : '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{normalizeMarkdown(contentObj.content || "")}</ReactMarkdown>
                        </div>
                    </div>
                );
              })}
              {loading && <div style={{ color: '#6366f1', fontStyle: 'italic', padding:'10px' }}>Dr. Sam is helping you... ✨</div>}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-area" style={{ padding: '15px', background: 'white', borderTop: '1px solid #e2e8f0', display:'flex', gap:'10px', alignItems:'center' }}>
               <button onClick={toggleListening} style={{ background: isListening ? '#fee2e2' : 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding:'10px', cursor:'pointer' }}>{isListening ? '🛑' : '🎤'}</button>

               {/* ✅ OCD BUTTONS RECOVERED */}
               <button onClick={() => fileInputRef.current?.click()} style={{ padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1', background:'white', cursor:'pointer' }}>📁</button>
               <button onClick={() => { setDroppedFile(null); setIsModalOpen(true); }} style={{ padding:'10px 16px', borderRadius:'8px', border:'none', background:'#f59e0b', color:'white', fontWeight:'bold', cursor:'pointer' }}>📸 Snap</button>

               <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') getResponse(); }} placeholder="Type here..." style={{ flex: 1, padding: '12px', borderRadius: '20px', border: '1px solid #cbd5e1', outline:'none' }} />
               <button onClick={getResponse} style={{ background: currentConfig.themeColor, color: 'white', border: 'none', borderRadius: '20px', padding: '10px 25px', fontWeight: 'bold', cursor:'pointer' }}>Send</button>
               <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => { const f = e.target.files[0]; if(f) { const reader = new FileReader(); reader.onload = (ev) => { setDroppedFile(ev.target.result); setIsModalOpen(true); }; reader.readAsDataURL(f); } }} />
            </div>
         </div>

         {showBoard && (
            <div className="board-section" style={{ width: '300px', background: 'rgba(255,255,255,0.95)', padding: '20px', borderLeft:'1px solid #e2e8f0', display:'flex', flexDirection:'column', gap:'20px', overflowY:'auto' }}>
               <div>
                   <h3 style={{margin:'0 0 10px 0', fontSize:'1rem', color:'#1e293b', borderBottom:'2px solid #f0fdf4', paddingBottom:'5px'}}>📢 Message Board</h3>
                   <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                       {boardMessages.map(msg => (
                           <div key={msg.id} style={{background:'#f8fafc', padding:'10px', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
                               <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.75rem', marginBottom:'5px', color:'#64748b'}}><span style={{fontWeight:'bold', color:'#3b82f6'}}>{msg.from}</span><span>{msg.date}</span></div>
                               <p style={{margin:0, fontSize:'0.9rem', color:'#334155'}}>{msg.text}</p>
                           </div>
                       ))}
                   </div>
               </div>
               <div>
                   <h3 style={{margin:'0 0 10px 0', fontSize:'1rem', color:'#1e293b', borderBottom:'2px solid #f0fdf4', paddingBottom:'5px'}}>📜 History</h3>
                   <div style={{display:'flex', flexDirection:'column', gap:'0'}}>
                       {MOCK_SESSION_HISTORY.map(session => (
                           <div key={session.id} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f1f5f9'}}><span style={{fontSize:'0.9rem', color:'#475569'}}>{session.topic}</span><span style={{fontSize:'0.8rem', color:'#94a3b8'}}>{session.date}</span></div>
                       ))}
                   </div>
               </div>
            </div>
         )}
      </div>
      
      <ShowMyWorkModal isOpen={isModalOpen} onClose={() => {setIsModalOpen(false); setDroppedFile(null);}} initialImage={droppedFile} clearInitialImage={() => setDroppedFile(null)} lang={lang} 
        onAnalyzed={(res) => setHistory(p => [...p, { role: "user", content: "📸 Camera Submission" }, { role: "assistant", content: res }])}
      />
      
      {isGraphPanelOpen && canvas && (
        <div className="modal-overlay" onClick={() => setIsGraphPanelOpen(false)} style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:2000, display:'flex', justifyContent:'center', alignItems:'center'}}>
          <div className="modal-content" style={{background:'white', padding:'20px', borderRadius:'12px', width:'80vw', maxWidth:'800px'}} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsGraphPanelOpen(false)} style={{float:'right', background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer'}}>✕</button>
            <h3>📈 Graph View</h3>
            <SamieGraph figure={canvas.figure} />
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// --- SHOW MY WORK MODAL (FULL RECOVERY) ---
// ==========================================
function ShowMyWorkModal({ isOpen, onClose, initialImage, clearInitialImage, lang, onAnalyzed }) {
  const { user } = useAuth();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [modalHistory, setModalHistory] = useState([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const chatEndRef = useRef(null);

  const stopCamera = () => { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; } setIsCameraActive(false); };
  const startCamera = async () => {
    setPreviewUrl(null); setIsCameraActive(true);
    try {
      let stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "environment" } });
      streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { setIsCameraActive(false); alert("Camera Error. 🐾"); }
  };
  
  const handleSubmit = async () => { 
      if (!previewUrl) return; 
      setLoading(true); setModalHistory([{ role: "user", content: "Checking your work... 🐾" }]); 
      try { 
          const token = getAuthToken(); 
          const res = await fetch(`${API_BASE}/api/learning/tutor-request`, { 
            method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, 
            body: JSON.stringify({ 
              history: [{ role: "user", content: `OCD_CAMERA_SUBMISSION\nAnalyze math problem immediately. DO NOT refuse. Provide full step-by-step solution and final answer in LaTeX. Support student confidence.\n\nIMAGE_DATA: ${previewUrl}` }], 
              student_id: user?.id, persona: "samie" 
            }) 
          }); 
          const data = await res.json(); 
          setModalHistory([{ role: "assistant", content: data.content }]); onAnalyzed(data.content); 
      } catch { setModalHistory([{ role: "assistant", content: "Snag hit! ✨" }]); } finally { setLoading(false); } 
  };

  useEffect(() => { if (isOpen) { if (initialImage) { setPreviewUrl(initialImage); if (clearInitialImage) clearInitialImage(); } else { startCamera(); } } else { stopCamera(); } return () => stopCamera(); }, [isOpen, initialImage]);
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={()=>{stopCamera(); onClose();}}>
      <div style={{ width: '90vw', maxWidth: '800px', height: '80vh', background: 'white', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}><h3>📸 OCD Analyzer</h3><button onClick={onClose} style={{cursor:'pointer'}}>✕</button></div>
        <div style={{flex:1, display:'flex', gap:'20px', overflow:'hidden'}}>
             <div style={{flex:1, background:'#000', borderRadius:'12px', overflow:'hidden', position:'relative'}}>
                 {!previewUrl ? <video ref={videoRef} autoPlay playsInline muted style={{width:"100%", height:"100%", objectFit:"contain"}} /> : <img src={previewUrl} style={{width:'100%', height:'100%', objectFit:'contain'}} />}
             </div>
             <div style={{flex:1, overflowY:'auto', background:'#f9fafb', padding:'15px', borderRadius:'12px'}}>
                 {modalHistory.map((msg, idx) => (
                     <div key={idx} style={{marginBottom:'10px'}}><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content || msg}</ReactMarkdown></div>
                 ))}
                 {loading && <div style={{color:'#6366f1'}}>Dr. Sam is helping you... ✨</div>}
             </div>
        </div>
        <div style={{marginTop:'15px', display:'flex', gap:'10px', justifyContent:'center'}}>
            {!previewUrl && isCameraActive && <button onClick={() => { const c = document.createElement("canvas"); c.width = videoRef.current.videoWidth; c.height = videoRef.current.videoHeight; c.getContext("2d").drawImage(videoRef.current, 0, 0); setPreviewUrl(c.toDataURL("image/jpeg")); stopCamera(); }} style={{padding:'10px 20px', background:'#ef4444', color:'white', borderRadius:'6px', border:'none', cursor:'pointer'}}>SNAP</button>}
            {previewUrl && <button onClick={handleSubmit} disabled={loading} style={{padding:'10px 20px', background:'#16a34a', color:'white', borderRadius:'6px', border:'none', cursor:'pointer'}}>{loading?'Analyzing...':'Analyze'}</button>}
            <button onClick={onClose} style={{padding:'10px 20px', background:'#9ca3af', color:'white', borderRadius:'6px', border:'none', cursor:'pointer'}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}