from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import random
import pandas as pd
import os
import shutil

from . import models, schemas
from .database import engine, get_db, SessionLocal
from .password_utils import verify_password

# Create Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Enable CORS with optimized settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Specific methods
    allow_headers=["*"],
)

# ============== CONSTANTS ============== #
GENERAL_INSTRUCTION = "Solve the task and write the task status, task explanation, and critical error if task is failure."

# ============== ADMIN ENDPOINTS ============== #

# --- ADMIN: 1. DASHBOARD DATA ---
@app.get("/admin/tests")
def get_all_tests(db: Session = Depends(get_db)):
    # Single optimized query with question count (no N+1)
    results = db.query(
        models.Test.id,
        models.Test.title,
        models.Test.duration_minutes,
        models.Test.is_active,
        func.count(models.Question.id).label('question_count')
    ).outerjoin(
        models.Question, models.Test.id == models.Question.test_id
    ).group_by(models.Test.id).all()
    
    return [
        {
            "id": r.id,
            "title": r.title,
            "duration_minutes": r.duration_minutes,
            "is_active": r.is_active,
            "question_count": r.question_count
        }
        for r in results
    ]

# --- ADMIN: 1.1 GET ACTIVE TEST ---
@app.get("/admin/active-test")
def get_active_test(db: Session = Depends(get_db)):
    # Single query with COUNT (was 2 queries)
    result = db.query(
        models.Test.id,
        models.Test.title,
        func.count(models.Question.id).label('question_count')
    ).outerjoin(
        models.Question, models.Test.id == models.Question.test_id
    ).filter(
        models.Test.is_active == True
    ).group_by(models.Test.id).first()
    
    if not result:
        return None
    return {"id": result.id, "title": result.title, "question_count": result.question_count}

# --- ADMIN: 2. CREATE TEST ---
@app.post("/admin/create-test")
def create_test(test: schemas.TestCreate, db: Session = Depends(get_db)):
    new_test = models.Test(
        title=test.title,
        duration_minutes=test.duration_minutes,
        is_active=False
    )
    db.add(new_test)
    db.commit()
    return {"message": "Test Created", "id": new_test.id}

# --- ADMIN: 2.1 ACTIVATE TEST ---
@app.post("/admin/test/{test_id}/activate")
def activate_test(test_id: int, db: Session = Depends(get_db)):
    # Single UPDATE for deactivation + activate specific one
    db.query(models.Test).filter(models.Test.id != test_id).update({"is_active": False})
    result = db.query(models.Test).filter(models.Test.id == test_id).update({"is_active": True})
    
    if result == 0:
        raise HTTPException(status_code=404, detail="Test not found")
    
    db.commit()
    return {"message": "Test activated"}

# --- ADMIN: 2.2 DEACTIVATE TEST ---
@app.post("/admin/test/{test_id}/deactivate")
def deactivate_test(test_id: int, db: Session = Depends(get_db)):
    result = db.query(models.Test).filter(models.Test.id == test_id).update({"is_active": False})
    if result == 0:
        raise HTTPException(status_code=404, detail="Test not found")
    db.commit()
    return {"message": "Test deactivated"}

# --- ADMIN: 2.3 DELETE TEST ---
@app.delete("/admin/test/{test_id}")
def delete_test(test_id: int, db: Session = Depends(get_db)):
    # Check existence
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    title = test.title
    
    # Get all sessions for this test
    session_ids = [s.id for s in db.query(models.TestSession.id).filter(models.TestSession.test_id == test_id).all()]
    
    # Delete user responses for these sessions
    if session_ids:
        db.query(models.UserResponse).filter(models.UserResponse.session_id.in_(session_ids)).delete(synchronize_session=False)
    
    # Delete test sessions
    db.query(models.TestSession).filter(models.TestSession.test_id == test_id).delete(synchronize_session=False)
    
    # Delete questions
    db.query(models.Question).filter(models.Question.test_id == test_id).delete(synchronize_session=False)
    
    # Delete test
    db.delete(test)
    db.commit()
    
    return {"message": f"Test '{title}' deleted"}


# --- ADMIN: 2.4 GET TEST QUESTIONS ---
@app.get("/admin/test/{test_id}/questions")
def get_test_questions(test_id: int, db: Session = Depends(get_db)):
    # Only select needed columns
    questions = db.query(
        models.Question.id,
        models.Question.task_id,
        models.Question.link
    ).filter(models.Question.test_id == test_id).all()
    
    return [{"id": q.id, "task_id": q.task_id, "link": q.link} for q in questions]

# --- ADMIN: 2.5 DELETE QUESTION ---
@app.delete("/admin/question/{question_id}")
def delete_question(question_id: int, db: Session = Depends(get_db)):
    result = db.query(models.Question).filter(models.Question.id == question_id).delete()
    if result == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    db.commit()
    return {"message": "Question deleted"}

# --- ADMIN: 3. UPLOAD QUESTIONS (EXCEL) ---
@app.post("/admin/test/{test_id}/upload")
async def upload_questions(test_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    temp_file = f"temp_{file.filename}"
    try:
        # Save temp file
        with open(temp_file, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Issue #5 fix: Read file ONCE (was reading twice before)
        df = pd.read_excel(temp_file)
        
        # Determine which columns exist
        has_link = 'link' in df.columns
        has_task_id = 'task_id' in df.columns
        
        if not has_link:
            raise HTTPException(status_code=400, detail="Excel file must have a 'link' column")
        
        # Bulk insert for performance
        questions = [
            models.Question(
                test_id=test_id,
                task_id=str(row['task_id']) if has_task_id and pd.notna(row.get('task_id')) else None,
                link=str(row['link']),
                description=GENERAL_INSTRUCTION,
                ideal_status=str(row.get('ideal_status', '')) if pd.notna(row.get('ideal_status')) else '',
                ideal_explanation=str(row.get('ideal_explanation', '')) if pd.notna(row.get('ideal_explanation')) else '',
                ideal_error=str(row.get('ideal_error', '')) if pd.notna(row.get('ideal_error')) else ''
            )
            for _, row in df.iterrows()
        ]
        
        db.bulk_save_objects(questions)
        db.commit()
        return {"message": f"Uploaded {len(questions)} questions"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)

# --- ADMIN: 3.1 ADD SINGLE QUESTION ---
from pydantic import BaseModel

class SingleQuestionAdd(BaseModel):
    task_id: Optional[str] = None
    link: str

@app.post("/admin/test/{test_id}/add-question")
def add_single_question(test_id: int, question_data: SingleQuestionAdd, db: Session = Depends(get_db)):
    # Check test exists with COUNT (faster than fetching object)
    exists = db.query(func.count(models.Test.id)).filter(models.Test.id == test_id).scalar()
    if not exists:
        raise HTTPException(status_code=404, detail="Test not found")
    
    new_question = models.Question(
        test_id=test_id,
        task_id=question_data.task_id,
        link=question_data.link,
        description=GENERAL_INSTRUCTION,
        ideal_status="",
        ideal_explanation="",
        ideal_error=""
    )
    db.add(new_question)
    db.commit()
    return {"message": "Question added", "question_id": new_question.id}

# --- ADMIN: 4. VIEW RESULTS ---
@app.get("/admin/test/{test_id}/results")
def get_test_results(test_id: int, db: Session = Depends(get_db)):
    # Optimized JOIN query
    results = db.query(
        models.TestSession.id,
        models.TestSession.is_completed,
        models.TestSession.current_index,
        models.User.username
    ).join(
        models.User, models.TestSession.user_id == models.User.id
    ).filter(models.TestSession.test_id == test_id).all()
    
    return [
        {
            "id": r.id,
            "username": r.username,
            "is_completed": r.is_completed,
            "current_index": r.current_index
        }
        for r in results
    ]

# --- ADMIN: CHECK IF USER IS ADMIN ---
@app.get("/admin/check/{user_id}")
def check_admin_status(user_id: int, db: Session = Depends(get_db)):
    # Only select needed columns
    user = db.query(models.User.is_admin, models.User.username).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"is_admin": user.is_admin, "username": user.username}

# --- ADMIN: 5. LIST ALL USERS ---
@app.get("/admin/users")
def get_all_users(db: Session = Depends(get_db)):
    # Single optimized query with LEFT JOIN - now includes test info
    results = db.query(
        models.User.id,
        models.User.username,
        models.TestSession.id.label('session_id'),
        models.TestSession.is_completed,
        models.TestSession.test_id,
        models.Test.title.label('test_title')
    ).outerjoin(
        models.TestSession, models.User.id == models.TestSession.user_id
    ).outerjoin(
        models.Test, models.TestSession.test_id == models.Test.id
    ).filter(
        models.User.is_active == True,
        models.User.is_admin == False
    ).all()
    
    return [
        {
            "id": r.id,
            "username": r.username,
            "status": "Completed" if r.is_completed else ("In Progress" if r.session_id else "Not Started"),
            "session_id": r.session_id,
            "test_id": r.test_id,
            "test_title": r.test_title
        }
        for r in results
    ]


# --- ADMIN: 6. GET SPECIFIC USER REPORT ---
@app.get("/admin/report/{session_id}")
def get_user_report(session_id: int, db: Session = Depends(get_db)):
    # Single query with JOIN to get session + user + responses + questions
    session_data = db.query(
        models.TestSession.id,
        models.User.username
    ).join(
        models.User, models.TestSession.user_id == models.User.id
    ).filter(models.TestSession.id == session_id).first()
    
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get responses with questions in single query (fixed N+1)
    responses = db.query(
        models.UserResponse.status,
        models.UserResponse.explanation,
        models.UserResponse.critical_error,
        models.UserResponse.ai_score,
        models.UserResponse.ai_feedback,
        models.Question.id.label('question_id'),
        models.Question.link,
        models.Question.description,
        models.Question.ideal_status,
        models.Question.ideal_explanation
    ).join(
        models.Question, models.UserResponse.question_id == models.Question.id
    ).filter(models.UserResponse.session_id == session_id).all()
    
    return {
        "user": session_data.username,
        "answers": [
            {
                "question_id": r.question_id,
                "link": r.link,
                "description": r.description,
                "user_status": r.status,
                "user_explanation": r.explanation,
                "user_error": r.critical_error,
                "ideal_status": r.ideal_status,
                "ideal_explanation": r.ideal_explanation,
                "ai_score": r.ai_score,
                "ai_feedback": r.ai_feedback
            }
            for r in responses
        ]
    }

# --- ADMIN: 7. TRIGGER AI EVALUATION (BACKGROUND TASK) ---
from .ai_agent import evaluate_single_answer

def run_evaluation_loop(session_id: int):
    from .database import SessionLocal
    db = SessionLocal()
    try:
        # Optimized: Single query with JOIN (fixed N+1)
        responses = db.query(
            models.UserResponse,
            models.Question
        ).join(
            models.Question, models.UserResponse.question_id == models.Question.id
        ).filter(models.UserResponse.session_id == session_id).all()
        
        for resp, question in responses:
            score, feedback = evaluate_single_answer(resp, question)
            resp.ai_score = score
            resp.ai_feedback = feedback
        
        db.commit()
    finally:
        db.close()

@app.post("/admin/evaluate/{session_id}")
def start_evaluation(session_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    background_tasks.add_task(run_evaluation_loop, session_id)
    return {"message": "Evaluation started. Refresh page in a few moments."}

# ============== SESSION/TIMER ENDPOINTS ============== #

# --- SESSION INFO (For Timer Sync) ---
@app.get("/session/{session_id}/info")
def get_session_info(session_id: int, db: Session = Depends(get_db)):
    # Single query with JOIN (was 2 queries)
    result = db.query(
        models.TestSession.id,
        models.TestSession.start_time,
        models.TestSession.is_completed,
        models.Test.duration_minutes
    ).join(
        models.Test, models.TestSession.test_id == models.Test.id
    ).filter(models.TestSession.id == session_id).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": result.id,
        "start_time": result.start_time.isoformat() if result.start_time else None,
        "duration_minutes": result.duration_minutes or 360,
        "is_completed": result.is_completed
    }

# ============== USER ENDPOINTS ============== #

# --- 1. AUTHENTICATION (Email + Password) ---
@app.post("/login", response_model=schemas.Token)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    # Only select needed columns
    user = db.query(
        models.User.id,
        models.User.username,
        models.User.password_hash,
        models.User.is_active,
        models.User.is_admin
    ).filter(models.User.username == request.username).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Secure password verification with bcrypt
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User is inactive")
    
    return {
        "access_token": str(user.id),
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "is_admin": user.is_admin  # Issue #12 fix: Return is_admin
    }

# --- 2. START TEST (Shuffling Logic) ---
@app.post("/start-test/{test_id}/{user_id}", response_model=schemas.SessionInfo)
def start_test(test_id: int, user_id: int, db: Session = Depends(get_db)):
    # Check for existing session first
    session = db.query(
        models.TestSession.id,
        models.TestSession.current_index,
        models.TestSession.is_completed,
        models.TestSession.question_order
    ).filter(
        models.TestSession.user_id == user_id,
        models.TestSession.test_id == test_id
    ).first()

    if session:
        return {
            "session_id": session.id,
            "current_index": session.current_index,
            "total_questions": len(session.question_order) if session.question_order else 0,
            "is_completed": session.is_completed
        }

    # Get question IDs only (faster)
    q_ids = db.query(models.Question.id).filter(models.Question.test_id == test_id).all()
    if not q_ids:
        raise HTTPException(status_code=404, detail="Test has no questions")
    
    q_ids = [q.id for q in q_ids]
    random.shuffle(q_ids)
    
    new_session = models.TestSession(
        user_id=user_id,
        test_id=test_id,
        question_order=q_ids,
        current_index=0
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return {
        "session_id": new_session.id,
        "current_index": 0,
        "total_questions": len(q_ids),
        "is_completed": False
    }

# --- 3. GET CURRENT QUESTION (Blocking Logic) ---
@app.get("/session/{session_id}/question", response_model=schemas.QuestionOut)
def get_current_question(session_id: int, db: Session = Depends(get_db)):
    # Get session with minimal data
    session = db.query(
        models.TestSession.id,
        models.TestSession.is_completed,
        models.TestSession.current_index,
        models.TestSession.question_order
    ).filter(models.TestSession.id == session_id).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.is_completed:
        raise HTTPException(status_code=400, detail="Test is already completed")
    
    try:
        current_q_id = session.question_order[session.current_index]
    except (IndexError, TypeError):
        # Mark as completed
        db.query(models.TestSession).filter(models.TestSession.id == session_id).update({"is_completed": True})
        db.commit()
        raise HTTPException(status_code=200, detail="Test Completed")

    # Get question with only needed fields
    question = db.query(models.Question).filter(models.Question.id == current_q_id).first()
    return question

# --- 4. SUBMIT ANSWER (State Update) ---
@app.post("/session/{session_id}/submit")
def submit_answer(session_id: int, answer: schemas.AnswerSubmit, db: Session = Depends(get_db)):
    # Get session
    session = db.query(models.TestSession).filter(models.TestSession.id == session_id).first()
    
    if not session or session.is_completed:
        raise HTTPException(status_code=400, detail="Invalid session")

    expected_q_id = session.question_order[session.current_index]
    
    if answer.question_id != expected_q_id:
        raise HTTPException(status_code=400, detail="Sync Error. You are answering the wrong question.")

    # Save answer
    new_response = models.UserResponse(
        session_id=session.id,
        question_id=answer.question_id,
        status=answer.status,
        explanation=answer.explanation,
        critical_error=answer.critical_error
    )
    db.add(new_response)
    
    # Move forward
    session.current_index += 1
    
    if session.current_index >= len(session.question_order):
        session.is_completed = True
    
    db.commit()
    return {"message": "Answer saved", "next_index": session.current_index}
