
Dream ARC - Full Stack Setup Guide (C:\VT)

This folder contains the full backend and frontend implementation for the Dream ARC system.
Please follow the instructions below to run the system locally.

===========================
📁 Folder Structure
===========================
C:\VT
├── backend
│   └── app.py
│   └── requirements.txt
│   └── .env.template
├── frontend
    └── app
        └── dashboard
            ├── student
            │   └── page.tsx
            ├── teacher
            │   └── page.tsx
            └── gamechanger
                └── page.tsx

===========================
🔧 Backend Setup
===========================
1. Install dependencies:
   pip install -r requirements.txt

2. Rename `.env.template` to `.env` and add your API keys:
   - GEMINI_API_KEY
   - OPENAI_API_KEY

3. Run the FastAPI backend:
   uvicorn app:app --reload --host 0.0.0.0 --port 5001

===========================
💻 Frontend Setup
===========================
1. Navigate to frontend directory:
   cd frontend

2. Install Node dependencies (after initializing a Next.js project):
   npm install

3. Start the dev server:
   npm run dev

Make sure CORS is enabled on your backend and the frontend is set to fetch from http://localhost:5001.

===========================
🧠 Features
===========================
- Student Dashboard: PQ + Mastery Radar Charts
- Teacher Dashboard: AI Command Assistant
- GameChanger: AI image feedback on work
- Adaptive Sessions (ANSM), Digital Journal, Mentor Reports

Contact the developer for licensing and educational partnership.
