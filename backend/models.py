from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

# 1. User Model (Email + Password)
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)  # Email ID - indexed for fast lookup
    password_hash = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, index=True)  # Indexed for filtering
    is_admin = Column(Boolean, default=False, index=True)  # Indexed for filtering

# 2. Test Container
class Test(Base):
    __tablename__ = "tests"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    duration_minutes = Column(Integer, default=360)
    is_active = Column(Boolean, default=False, index=True)  # Indexed for active test lookup
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    questions = relationship("Question", back_populates="test", lazy="dynamic")

# 3. Question Bank
class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"), index=True)  # Indexed FK
    
    task_id = Column(String, nullable=True)
    link = Column(String)
    description = Column(Text)
    
    # Ideal Answers (Hidden from user)
    ideal_status = Column(String, nullable=True)
    ideal_explanation = Column(Text, nullable=True)
    ideal_error = Column(Text, nullable=True)
    
    test = relationship("Test", back_populates="questions")

# 4. User Session
class TestSession(Base):
    __tablename__ = "test_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)  # Indexed FK
    test_id = Column(Integer, ForeignKey("tests.id"), index=True)  # Indexed FK
    
    question_order = Column(JSON, default=[])
    current_index = Column(Integer, default=0)
    is_completed = Column(Boolean, default=False, index=True)  # Indexed for completion filters
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    
    # Composite index for common query pattern
    __table_args__ = (
        Index('ix_session_user_test', 'user_id', 'test_id'),
    )

# 5. User Responses
class UserResponse(Base):
    __tablename__ = "user_responses"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("test_sessions.id"), index=True)  # Indexed FK
    question_id = Column(Integer, ForeignKey("questions.id"), index=True)  # Indexed FK
    
    status = Column(String)
    explanation = Column(Text)
    critical_error = Column(Text)
    
    # AI Evaluation
    ai_score = Column(Integer, nullable=True)
    ai_feedback = Column(Text, nullable=True)
    
    # Composite index for common query pattern
    __table_args__ = (
        Index('ix_response_session_question', 'session_id', 'question_id'),
    )
