# AI Test Platform

A full-stack AI-powered test evaluation platform built with FastAPI (Python) and React.

## Features

### Admin Dashboard
- **Test/Batch Management** - Create, activate, and manage multiple tests
- **Excel Upload** - Bulk import questions from Excel files
- **User Progress Tracking** - View user results filtered by test/batch
- **AI Evaluation** - Automatic grading using OpenAI

### User Interface
- **Sequential Questions** - Answer one question at a time
- **Timer Sync** - Server-synced countdown timer
- **Auto-save** - Answers saved on submission

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, SQLite, bcrypt
- **Frontend:** React, Redux Toolkit, Tailwind CSS, Axios
- **AI:** OpenAI GPT API for evaluation

## Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables
Create `backend/.env`:
```
OPENAI_API_KEY=your_api_key_here
```

Create `frontend/.env`:
```
VITE_API_URL=http://localhost:8000
```

## Default Credentials
- **Admin:** admin / admin123
- **Users:** See seed_users.py

## API Documentation
Visit `http://localhost:8000/docs` for Swagger UI
