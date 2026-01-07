from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- Auth Schemas ---
class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    is_admin: bool = False  # Issue #12 fix

# --- Test Taking Schemas ---
# What we send to the frontend (NO ideal answers here!)
class QuestionOut(BaseModel):
    id: int
    task_id: Optional[str] = None  # Issue #13 fix
    link: str
    description: str
    
    class Config:
        from_attributes = True

# What the user sends when submitting
class AnswerSubmit(BaseModel):
    question_id: int
    status: str
    explanation: str
    critical_error: str

# Information about the current session
class SessionInfo(BaseModel):
    session_id: int
    current_index: int
    total_questions: int
    is_completed: bool

# --- Admin Schemas ---
class TestCreate(BaseModel):
    title: str
    duration_minutes: int
    description: str = ""

class TestList(BaseModel):
    id: int
    title: str
    question_count: int
    class Config:
        from_attributes = True

class SessionResult(BaseModel):
    id: int
    user_id: int
    username: str
    is_completed: bool
    score: Optional[int] = 0
