# Scrobble Comments

Full-stack Last.fm comment app using React, TypeScript, Tailwind, Vite, FastAPI, Python, and Supabase.

## Local setup

1. Apply `supabase/schema.sql` in your Supabase SQL editor.
2. Copy `backend/.env.example` to `backend/.env` and fill in Last.fm and Supabase values.
3. Copy `frontend/.env.example` to `frontend/.env` and fill in public frontend values.
4. Start the backend:
   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\pip install -r requirements.txt
   .\.venv\Scripts\uvicorn main:app --reload
   ```
5. Start the frontend:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

## Auth note

The backend mints Supabase-compatible authenticated JWTs with `SUPABASE_JWT_SECRET`. Supabase service role is used only for the OAuth-time admin user/profile upsert.
