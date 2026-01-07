import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool, NullPool
from dotenv import load_dotenv

# Load environment variables from backend/.env
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

# Database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./ai_test.db"
)

# Check if using SQLite
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,  # Disable SQL logging for performance
    )
else:
    # PostgreSQL with optimized connection pooling
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=10,           # Increased from 5 for more concurrent connections
        max_overflow=20,        # Increased from 10 for burst handling
        pool_pre_ping=True,     # Check connection health before use
        pool_recycle=1800,      # Recycle connections every 30 min (was 1 hour)
        pool_timeout=30,        # Connection timeout
        echo=False,             # Disable SQL logging for performance
        connect_args={
            "connect_timeout": 10,           # Connection timeout
            "application_name": "ai_test_app",
            "options": "-c statement_timeout=30000",  # 30s query timeout
        }
    )

# Optimized session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # Don't expire objects after commit (reduces DB calls)
)

Base = declarative_base()

# Dependency to get DB session in routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
