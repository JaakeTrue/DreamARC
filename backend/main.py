
import logging
import os
import json
import sqlite3
import re
from pathlib import Path
from datetime import date
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import Response
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt
from dotenv import load_dotenv
import requests

# OpenAI Import
try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None

# =========================================
# --- 1. SETUP ---
# =========================================
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / '.env', override=True)

DB_PATH = os.getenv("DB_PATH", str(BASE_DIR / "dreamarc.db"))
SECRET_KEY = os.getenv("SECRET_KEY", "dreamarc_secret_key_change_this")
ALGORITHM = "HS256"
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

openai_client = None
if AsyncOpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        openai_client = AsyncOpenAI(api_key=api_key)
        logger.info(f"✅ OpenAI Client Initialized (Model: {LLM_MODEL})")

app = FastAPI(title="DreamARC", version="8.9 Fixed-Login")

@app.get("/health")
def health():
    return {"status": "ok"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# ==========================================
# --- 2. DATABASE UTILITIES ---
# ==========================================
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    try: yield conn
    finally: conn.close()

def setup_database():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, hashed_password TEXT, role TEXT DEFAULT 'student')")
    cur.execute("CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE, grade TEXT, FOREIGN KEY(user_id) REFERENCES users(id))")
    cur.execute("CREATE TABLE IF NOT EXISTS pq_scores (id INTEGER PRIMARY KEY, student_id INTEGER, session_date DATE, homework INTEGER DEFAULT 0, attitude INTEGER DEFAULT 0, valid_question INTEGER DEFAULT 0, solving_question INTEGER DEFAULT 0, organization INTEGER DEFAULT 0, test_prep INTEGER DEFAULT 0, review INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    cur.execute("CREATE TABLE IF NOT EXISTS tutoring_logs (id INTEGER PRIMARY KEY, student_id INTEGER, log_date DATE, log_content TEXT, duration_minutes INTEGER DEFAULT 0, tutor_name TEXT)")
    cur.execute("CREATE TABLE IF NOT EXISTS topic_mastery (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, topic_name TEXT, lambda_val REAL DEFAULT 1.0, last_practiced_at DATETIME DEFAULT CURRENT_TIMESTAMP, consecutive_correct INTEGER DEFAULT 0)")
    cur.execute("CREATE TABLE IF NOT EXISTS rmsq_weekly_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT NOT NULL, week_label TEXT, lambda_score REAL, rmsq_score INTEGER, context_note TEXT, recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
    cur.execute("CREATE TABLE IF NOT EXISTS game_monsters (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, monster_name TEXT, monster_type TEXT, topic_name TEXT, question_text TEXT, correct_answer TEXT, hp_max INTEGER, hp_current INTEGER, xp_reward INTEGER, is_defeated BOOLEAN DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    cur.execute("CREATE TABLE IF NOT EXISTS diary_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, entry_date DATE, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    cur.execute("CREATE TABLE IF NOT EXISTS pq_waterfall_state (student_id INTEGER, metric_name TEXT, history_json TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (student_id, metric_name))")
    cur.execute("CREATE TABLE IF NOT EXISTS atoz_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, current_score INTEGER, future_score INTEGER, rms_plan TEXT, future_goal TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    cur.execute("CREATE TABLE IF NOT EXISTS gc_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, sender_id TEXT, sender_name TEXT, message_content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
    conn.commit()
    conn.close()

def seed_default_users():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    hashed = pwd_context.hash("student01")
    if not cur.execute("SELECT id FROM users WHERE username = 'STUDENT01'").fetchone():
        cur.execute("INSERT INTO users (username, hashed_password, role) VALUES (?, ?, 'student')", ("STUDENT01", hashed))
        uid = cur.lastrowid
        cur.execute("INSERT INTO students (user_id, grade) VALUES (?, ?)", (uid, "9"))
        sid = cur.lastrowid
        cur.execute("INSERT INTO pq_scores (student_id, homework, attitude) VALUES (?, 9, 8)", (sid,))
        cur.execute("INSERT INTO game_monsters (student_id, monster_name, monster_type, topic_name, question_text, correct_answer, hp_max, hp_current, xp_reward) VALUES (?, 'Exponent Dragon', 'BOSS', 'Math', 'Simplify 3^2 * 3^5', '3^7', 1500, 1500, 500)", (sid,))
    conn.commit()
    conn.close()

# ==========================================
# --- 3. MODELS & HELPERS ---
# ==========================================
class UserCreate(BaseModel):
    username: str; password: str; grade: Optional[str] = None
class LearningRequest(BaseModel):
    history: List[Dict[str, Any]]; language: str = "en"; student_id: Optional[int] = None; message: Optional[str] = None; persona: str = "judy"
class AtozUpdateRequest(BaseModel):
    current_score: int; future_score: int; rms_plan: str; future_goal: str
class SpeakRequest(BaseModel):
    text: str; persona: str = "samie"
class LoginBody(BaseModel):
    username: str; password: str
class LambdaAttemptRequest(BaseModel):
    student_id: int; topic_name: str; correctness: int; latency_tau: float; dependency_h: int = 0
class GameAttackRequest(BaseModel):
    student_id: int; monster_id: int; answer: str
class JudyHelpRequest(BaseModel):
    student_id: int; monster_id: int; student_answer: str
class DiaryEntryRequest(BaseModel):
    student_id: int; date: str; content: str
class WaterfallUpdate(BaseModel):
    metric_name: str; new_entry: Dict[str, Any]; full_history: List[Dict[str, Any]]
class GCMessageRequest(BaseModel):
    sender_id: str; sender_name: str; message: str

def get_voice_id(persona: str):
    if persona == "judy": return os.getenv("JUDY_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
    if persona == "samie": return os.getenv("SAM_VOICE_ID", "AZnzlk1XvdvUeBnXmlld")
    return os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")

def _alpha_tau(tau: float) -> float:
    if tau <= 30: return 1.0
    if tau <= 60: return 0.8
    return 0.5

def _beta_h(h: int) -> float:
    return 1.0 if (h is None or h == 0) else 0.5

METRIC_RUBRIC = {"lambda": {"range": [0.0, 5.0]}, "rmsq": {"range": [0.0, 100.0]}}

# ==========================================
# --- 4. API ROUTES ---
# ==========================================

@api.post("/auth/register")
async def register(user: UserCreate, db: sqlite3.Connection = Depends(get_db)):
    if db.execute("SELECT * FROM users WHERE username=?", (user.username,)).fetchone(): raise HTTPException(400, "Username taken")
    hashed = pwd_context.hash(user.password)
    cur = db.cursor()
    cur.execute("INSERT INTO users (username, hashed_password, role) VALUES (?, ?, 'student')", (user.username, hashed))
    uid = cur.lastrowid
    cur.execute("INSERT INTO students (user_id, grade) VALUES (?, ?)", (uid, user.grade))
    sid = cur.lastrowid
    cur.execute("INSERT INTO pq_scores (student_id, homework, attitude) VALUES (?, 5, 5)", (sid,))
    db.commit()
    return {"message": "Created", "student_id": sid, "id": sid, "name": user.username, "access_token": "temp_token"}

@api.post("/auth/token")
async def login(form: OAuth2PasswordRequestForm = Depends(), db: sqlite3.Connection = Depends(get_db)):
    user = db.execute("SELECT * FROM users WHERE username = ?", (form.username,)).fetchone()
    if not user or not pwd_context.verify(form.password, user["hashed_password"]): raise HTTPException(400, "Bad credentials")
    student = db.execute("SELECT id FROM students WHERE user_id = ?", (user["id"],)).fetchone()
    real_id = student["id"] if student else user["id"]
    return {"access_token": jwt.encode({"sub": user["username"]}, SECRET_KEY, algorithm=ALGORITHM), "token_type": "bearer", "id": real_id, "name": user["username"], "role": user["role"]}

@api.post("/auth/login")
def login_json(body: LoginBody, db=Depends(get_db)):
    cur = db.cursor()
    cur.execute("SELECT * FROM users WHERE username = ?", (body.username,))
    row = cur.fetchone()
    if not row or not pwd_context.verify(body.password, row['hashed_password']): raise HTTPException(status_code=401, detail="Incorrect")
    
    student = db.execute("SELECT id FROM students WHERE user_id = ?", (row["id"],)).fetchone()
    real_id = student["id"] if student else row["id"]
    
    # FIXED: using 'row' instead of undefined 'user'
    token = jwt.encode({"sub": row["username"], "id": real_id, "role": row["role"]}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "id": real_id, "name": row["username"], "role": row["role"]}

@api.get("/metrics/rubric")
def get_metric_rubric():
    return METRIC_RUBRIC

@api.post("/tts/speak")
async def speak(req: SpeakRequest):
    if not ELEVENLABS_API_KEY: return Response(content=b"", media_type="audio/mpeg")
    try:
        r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{get_voice_id(req.persona)}", json={"text": req.text}, headers={"xi-api-key": ELEVENLABS_API_KEY})
        return Response(content=r.content, media_type="audio/mpeg")
    except: raise HTTPException(500, "TTS Failed")

@api.post("/learning/tutor-request")
async def tutor_request(req: LearningRequest, db: sqlite3.Connection = Depends(get_db)):
    if not openai_client:
        return {"role": "assistant", "content": json.dumps({"content": "AI Offline"})}

    mem_str = ""
    if req.student_id:
        logs = db.execute(
            "SELECT log_content FROM tutoring_logs WHERE student_id=? ORDER BY id DESC LIMIT 3",
            (req.student_id,)
        ).fetchall()
        mem_str = "\n".join([l["log_content"] for l in logs])

    try:
        # ---------------------------
        # Samie: flexible text mode
        # ---------------------------
        if req.persona == "samie":
            # ✅ OCD Camera: if the user message contains a Data URL image, use vision
            last_user_msg = ""
            for m in reversed(req.history or []):
                if m.get("role") == "user":
                    last_user_msg = m.get("content", "") or ""
                    break

            if "data:image" in last_user_msg:
                # Extract base64 Data URL
                match = re.search(r"(data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+)", last_user_msg)
                image_data = match.group(1) if match else None

                if (not image_data) or (not hasattr(openai_client, "responses")):
                    # Fallback: proceed as text-only (still try)
                    # --- A2G CONTEXTUAL MEMORY (Big Brother/Sister Logic) ---
                    # 1. Fetch recent life context (Diary)
                    life_log = db.execute("SELECT content FROM diary_entries WHERE student_id=? ORDER BY created_at DESC LIMIT 1", (req.student_id,)).fetchone()
    
                    # 2. Fetch recent struggles (High Lambda topics from last 7 days)
                    past_struggles = db.execute("SELECT topic FROM lambda_logs WHERE student_id=? AND lambda_val > 3.5 ORDER BY timestamp DESC LIMIT 1", (req.student_id,)).fetchone()
    
                    memory_context = "\n[SYSTEM MEMORY ADVICE]: "
                    if life_log: memory_context += f"The student recently mentioned: '{life_log['content']}'. "
                    if past_struggles: memory_context += f"They struggled with '{past_struggles['topic']}' recently; check if they've recovered. "
    
                    # Inject memory into the system prompt
                    clean_history[0]["content"] += memory_context
                    # --- A2G CONTEXTUAL MEMORY (Big Brother/Sister Logic) ---
                    # 1. Fetch recent life context (Diary)
                    life_log = db.execute("SELECT content FROM diary_entries WHERE student_id=? ORDER BY created_at DESC LIMIT 1", (req.student_id,)).fetchone()
    
                    # 2. Fetch recent struggles (High Lambda topics from last 7 days)
                    past_struggles = db.execute("SELECT topic FROM lambda_logs WHERE student_id=? AND lambda_val > 3.5 ORDER BY timestamp DESC LIMIT 1", (req.student_id,)).fetchone()
    
                    memory_context = "\n[SYSTEM MEMORY ADVICE]: "
                    if life_log: memory_context += f"The student recently mentioned: '{life_log['content']}'. "
                    if past_struggles: memory_context += f"They struggled with '{past_struggles['topic']}' recently; check if they've recovered. "
    
                    # Inject memory into the system prompt
                    clean_history[0]["content"] += memory_context
                    resp = await openai_client.chat.completions.create(
                        model=LLM_MODEL,
                        messages=req.history
                    )
                    ai_text = resp.choices[0].message.content or ""
                    final_response = ai_text
                    else:
                    r = await openai_client.responses.create(
                        model=LLM_MODEL,
                        input=[{
                            "role": "user",
                            "content": [
                                {"type": "input_text", "text": vision_prompt},
                                {"type": "input_image", "image_url": image_data}
                            ]
                        }],
                        max_output_tokens=900
                    )
                    ai_text = getattr(r, "output_text", "") or ""
                    final_response = ai_text

            else:
                # Normal Samie text chat
    # --- A2G CONTEXTUAL MEMORY (Big Brother/Sister Logic) ---
    # 1. Fetch recent life context (Diary)
    life_log = db.execute("SELECT content FROM diary_entries WHERE student_id=? ORDER BY created_at DESC LIMIT 1", (req.student_id,)).fetchone()
    
    # 2. Fetch recent struggles (High Lambda topics from last 7 days)
    past_struggles = db.execute("SELECT topic FROM lambda_logs WHERE student_id=? AND lambda_val > 3.5 ORDER BY timestamp DESC LIMIT 1", (req.student_id,)).fetchone()
    
    memory_context = "\n[SYSTEM MEMORY ADVICE]: "
    if life_log: memory_context += f"The student recently mentioned: '{life_log['content']}'. "
    if past_struggles: memory_context += f"They struggled with '{past_struggles['topic']}' recently; check if they've recovered. "
    
    # Inject memory into the system prompt
    clean_history[0]["content"] += memory_context
    # --- A2G CONTEXTUAL MEMORY (Big Brother/Sister Logic) ---
    # 1. Fetch recent life context (Diary)
    life_log = db.execute("SELECT content FROM diary_entries WHERE student_id=? ORDER BY created_at DESC LIMIT 1", (req.student_id,)).fetchone()
    
    # 2. Fetch recent struggles (High Lambda topics from last 7 days)
    past_struggles = db.execute("SELECT topic FROM lambda_logs WHERE student_id=? AND lambda_val > 3.5 ORDER BY timestamp DESC LIMIT 1", (req.student_id,)).fetchone()
    
    memory_context = "\n[SYSTEM MEMORY ADVICE]: "
    if life_log: memory_context += f"The student recently mentioned: '{life_log['content']}'. "
    if past_struggles: memory_context += f"They struggled with '{past_struggles['topic']}' recently; check if they've recovered. "
    
    # Inject memory into the system prompt
    clean_history[0]["content"] += memory_context
                resp = await openai_client.chat.completions.create(
                    model=LLM_MODEL,
                    messages=req.history
                )
                ai_text = resp.choices[0].message.content or ""
                final_response = ai_text

        # ---------------------------
        # Judy: strict JSON mode
        # ---------------------------
        else:
            prompt = (
                f"You are Judy. Memory: {mem_str}. "
                "You must ALWAYS respond in valid JSON with a single key named 'content'. "
                "Do not include markdown, code fences, or extra keys."
            )
            messages_to_send = [{"role": "system", "content": prompt}] + req.history

    # --- A2G CONTEXTUAL MEMORY (Big Brother/Sister Logic) ---
    # 1. Fetch recent life context (Diary)
    life_log = db.execute("SELECT content FROM diary_entries WHERE student_id=? ORDER BY created_at DESC LIMIT 1", (req.student_id,)).fetchone()
    
    # 2. Fetch recent struggles (High Lambda topics from last 7 days)
    past_struggles = db.execute("SELECT topic FROM lambda_logs WHERE student_id=? AND lambda_val > 3.5 ORDER BY timestamp DESC LIMIT 1", (req.student_id,)).fetchone()
    
    memory_context = "\n[SYSTEM MEMORY ADVICE]: "
    if life_log: memory_context += f"The student recently mentioned: '{life_log['content']}'. "
    if past_struggles: memory_context += f"They struggled with '{past_struggles['topic']}' recently; check if they've recovered. "
    
    # Inject memory into the system prompt
    clean_history[0]["content"] += memory_context
    # --- A2G CONTEXTUAL MEMORY (Big Brother/Sister Logic) ---
    # 1. Fetch recent life context (Diary)
    life_log = db.execute("SELECT content FROM diary_entries WHERE student_id=? ORDER BY created_at DESC LIMIT 1", (req.student_id,)).fetchone()
    
    # 2. Fetch recent struggles (High Lambda topics from last 7 days)
    past_struggles = db.execute("SELECT topic FROM lambda_logs WHERE student_id=? AND lambda_val > 3.5 ORDER BY timestamp DESC LIMIT 1", (req.student_id,)).fetchone()
    
    memory_context = "\n[SYSTEM MEMORY ADVICE]: "
    if life_log: memory_context += f"The student recently mentioned: '{life_log['content']}'. "
    if past_struggles: memory_context += f"They struggled with '{past_struggles['topic']}' recently; check if they've recovered. "
    
    # Inject memory into the system prompt
    clean_history[0]["content"] += memory_context
            resp = await openai_client.chat.completions.create(
                model=LLM_MODEL,
                messages=messages_to_send,
                response_format={"type": "json_object"}
            )

            raw_json = (resp.choices[0].message.content or "").strip()

            # Hard safety: extract only JSON block (prevents prefix/suffix breaking json.loads)
            match = re.search(r"\{.*\}", raw_json, re.S)
            if not match:
                final_response = json.dumps({"content": "Thinking..."})
            else:
                final_response = match.group(0)

        # ---------------------------
        # Save minimal tutoring log
        # ---------------------------
        if req.student_id:
            user_text = (req.message or "").lower()
            if "bye" in user_text:
                db.execute(
                    "INSERT INTO tutoring_logs (student_id, log_date, log_content, tutor_name) "
                    "VALUES (?, datetime('now', 'localtime'), ?, ?)",
                    (req.student_id, "Session End", req.persona)
                )
            else:
                db.execute(
                    "INSERT INTO tutoring_logs (student_id, log_date, log_content, tutor_name) "
                    "VALUES (?, datetime('now', 'localtime'), ?, ?)",
                    (req.student_id, "Chat", req.persona)
                )
            db.commit()

        return {"role": "assistant", "content": final_response}

    except Exception as e:
        print(f"Error: {e}")
        return {"role": "assistant", "content": json.dumps({"content": "Thinking error..."})}

@api.post("/lambda/attempt")
async def lambda_attempt(req: LambdaAttemptRequest, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute("SELECT * FROM topic_mastery WHERE student_id=? AND topic_name=?", (req.student_id, req.topic_name)).fetchone()
    if not row:
        db.execute("INSERT INTO topic_mastery (student_id, topic_name, lambda_val, consecutive_correct) VALUES (?, ?, ?, ?)", (req.student_id, req.topic_name, 1.0, 0))
        db.commit()
        row = db.execute("SELECT * FROM topic_mastery WHERE student_id=? AND topic_name=?", (req.student_id, req.topic_name)).fetchone()
    old_lambda = float(row["lambda_val"]) if row and row["lambda_val"] else 1.0
    k_before = int(row["consecutive_correct"])
    alpha = _alpha_tau(float(req.latency_tau))
    beta = _beta_h(int(req.dependency_h))
    eta = alpha * beta
    C = 1 if int(req.correctness) == 1 else 0
    if C == 1:
        R_base = 0.5 if k_before >= 3 else 0.8
        delta = R_base + (1.0 - R_base) * (1.0 - eta)
        new_lambda = max(0.1, old_lambda * delta)
        k_after = k_before + 1
    else:
        new_lambda = min(5.0, old_lambda + 1.5)
        k_after = 0
    db.execute("UPDATE topic_mastery SET lambda_val=?, consecutive_correct=?, last_practiced_at=CURRENT_TIMESTAMP WHERE student_id=? AND topic_name=?", (new_lambda, k_after, req.student_id, req.topic_name))
    db.commit()
    return {"old_lambda": old_lambda, "new_lambda": new_lambda}

# --- RESTORED GAME ENDPOINTS ---
@api.get("/game/{student_id}/monsters")
async def get_monsters(student_id: int, db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT * FROM game_monsters WHERE student_id=? AND is_defeated=0", (student_id,)).fetchall()
    if not rows:
        monsters = [("Linear Lizard", "MOB", "Math", "Solve 2x=10", "5", 100, 100, 50)]
        for m in monsters:
            db.execute("INSERT INTO game_monsters (student_id, monster_name, monster_type, topic_name, question_text, correct_answer, hp_max, hp_current, xp_reward) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", (student_id, m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7]))
        db.commit()
        rows = db.execute("SELECT * FROM game_monsters WHERE student_id=? AND is_defeated=0", (student_id,)).fetchall()
    return [dict(r) for r in rows]

@api.post("/game/attack")
async def game_attack(req: GameAttackRequest, db: sqlite3.Connection = Depends(get_db)):
    monster = db.execute("SELECT * FROM game_monsters WHERE id=? AND student_id=?", (req.monster_id, req.student_id)).fetchone()
    if not monster: raise HTTPException(404, "Monster not found")
    def _norm(s): return re.sub(r"\s+", "", (s or "").strip().lower())
    is_correct = (_norm(req.answer) == _norm(monster["correct_answer"]))
    if is_correct:
        db.execute("UPDATE game_monsters SET is_defeated=1 WHERE id=?", (req.monster_id,))
        db.execute("UPDATE pq_scores SET attitude = attitude + 1 WHERE student_id=?", (req.student_id,))
        db.commit()
        return {"status": "defeated", "xp_gained": monster["xp_reward"], "message": f"Defeated {monster['monster_name']}!"}
    return {"status": "missed", "xp_gained": 0, "message": "Missed!"}

# --- RESTORED DIARY ENDPOINTS ---
@api.get("/diary/{student_id}")
async def get_diary(student_id: int, db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT entry_date, content FROM diary_entries WHERE student_id=? ORDER BY entry_date DESC", (student_id,)).fetchall()
    return [dict(r) for r in rows]

@api.post("/diary/save")
async def save_diary(req: DiaryEntryRequest, db: sqlite3.Connection = Depends(get_db)):
    db.execute("INSERT INTO diary_entries (student_id, entry_date, content) VALUES (?, ?, ?)", (req.student_id, req.date, req.content))
    db.commit()
    return {"status": "saved"}

# --- RESTORED WATERFALL ENDPOINTS ---
@api.get("/students/{student_id}/pq-waterfall")
async def get_pq_waterfall(student_id: int, db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT metric_name, history_json FROM pq_waterfall_state WHERE student_id=?", (student_id,)).fetchall()
    result = {}
    for r in rows:
        try: result[r["metric_name"]] = json.loads(r["history_json"])
        except: result[r["metric_name"]] = [{"value": 50}] 
    return result

@api.post("/students/{student_id}/pq-waterfall/update")
async def update_pq_waterfall(student_id: int, req: WaterfallUpdate, db: sqlite3.Connection = Depends(get_db)):
    history_str = json.dumps(req.full_history)
    db.execute("INSERT INTO pq_waterfall_state (student_id, metric_name, history_json, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(student_id, metric_name) DO UPDATE SET history_json=excluded.history_json, updated_at=CURRENT_TIMESTAMP", (student_id, req.metric_name, history_str))
    db.commit()
    return {"status": "saved"}

# --- RESTORED MESSAGE BOARD ENDPOINTS ---
@api.get("/students/{student_id}/gc-messages")
async def get_gc_messages(student_id: int, db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT sender_name, message_content, created_at FROM gc_messages WHERE student_id=? ORDER BY created_at DESC", (student_id,)).fetchall()
    return [dict(r) for r in rows]

@api.post("/students/{student_id}/gc-messages")
async def post_gc_message(student_id: int, req: GCMessageRequest, db: sqlite3.Connection = Depends(get_db)):
    if not req.sender_id.lower().startswith("mt"): raise HTTPException(403, "Access Denied")
    db.execute("INSERT INTO gc_messages (student_id, sender_id, sender_name, message_content) VALUES (?, ?, ?, ?)", (student_id, req.sender_id, req.sender_name, req.message))
    db.commit()
    return {"status": "posted"}

# --- ATOZ ENDPOINTS ---
@api.get("/students/{student_id}/atoz")
async def get_atoz_log(student_id: int, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute("SELECT * FROM atoz_logs WHERE student_id=? ORDER BY id DESC LIMIT 1", (student_id,)).fetchone()
    if row: return dict(row)
    else: return {"current_score": 50, "future_score": 80, "rms_plan": "", "future_goal": ""}

@api.post("/students/{student_id}/atoz")
async def save_atoz_log(student_id: int, req: AtozUpdateRequest, db: sqlite3.Connection = Depends(get_db)):
    db.execute("INSERT INTO atoz_logs (student_id, current_score, future_score, rms_plan, future_goal) VALUES (?, ?, ?, ?, ?)", (student_id, req.current_score, req.future_score, req.rms_plan, req.future_goal))
    db.commit()
    return {"status": "saved"}

# ==========================================
# --- 5. DASHBOARD & STATS ENDPOINTS ---
# ==========================================

@api.get("/students/{student_id}/dashboard")
async def get_dashboard(student_id: int, db: sqlite3.Connection = Depends(get_db)):
    pq = db.execute("SELECT * FROM pq_scores WHERE student_id=? ORDER BY updated_at DESC LIMIT 1", (student_id,)).fetchone()
    pq_data = dict(pq) if pq else {"homework": 0, "attitude": 0, "organization": 0, "test_prep": 0, "review": 0}
    log_rows = db.execute("SELECT log_date as date, tutor_name as tutor, log_content as content FROM tutoring_logs WHERE student_id=? ORDER BY log_date DESC LIMIT 10", (student_id,)).fetchall()
    logs = [dict(r) for r in log_rows]
    if not logs: logs = [{"date": str(date.today()), "tutor": "System", "content": "Welcome to DreamARC!"}]
    return {"pq_scores": pq_data, "recent_logs": logs}

# FIX: URL now matches frontend (no double /api)
@api.get("/students/{student_id}/rmsq-stats")
async def get_rmsq_stats(student_id: int, db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT week_label as label, lambda_score as lambda_val, rmsq_score as rmsq FROM rmsq_weekly_logs WHERE student_id=? ORDER BY id ASC", (str(student_id),)).fetchall()
    data = [dict(r) for r in rows]
    insight = {"status": "Ready", "color": "#94a3b8", "judy_advice": "Waiting for data.", "samie_advice": "Let's begin!"}
    
    if data:
        curr = data[-1]
        prev = data[-2] if len(data) > 1 else curr
        lam = float(curr["lambda_val"])
        d_lam = lam - float(prev["lambda_val"])
        if lam >= 4.0:
            insight = {"status": "Critical", "color": "#ef4444", "judy_advice": "Stop new topics. Review basics.", "samie_advice": "It's okay to pause. Let's do one small step."}
        elif d_lam < 0:
            insight = {"status": "Golden Path", "color": "#10b981", "judy_advice": "Retention is improving.", "samie_advice": "You are fighting back against the entropy!"}
            
    return { "graph_data": data, "insight": insight }

app.include_router(api)

@app.on_event("startup")
def startup():
    setup_database()
    seed_default_users()
    logger.info("🚀 DreamARC Hybrid Server Restored")

