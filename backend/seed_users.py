#!/usr/bin/env python3
"""
Seed script to populate users with email and HASHED password credentials.
Run: python backend/seed_users.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, engine
from backend import models
from backend.password_utils import hash_password

# Create tables if not exist
models.Base.metadata.create_all(bind=engine)

# User credentials - Email ID and Password
USER_CREDENTIALS = [
    ("annotator11_theta@encord.ai", "annotator11"),
    ("annotator14_theta@encord.ai", "annotator14"),
    ("annotator17_theta@encord.ai", "annotator17"),
    ("annotator24_theta@encord.ai", "annotator24"),
    ("annotator25_theta@encord.ai", "annotator25"),
    ("annotator26_theta@encord.ai", "annotator26"),
    ("annotator27_theta@encord.ai", "annotator27"),
    ("annotator28_theta@encord.ai", "annotator28"),
    ("annotator29_theta@encord.ai", "annotator29"),
    ("annotator30_theta@encord.ai", "annotator30"),
    ("annotator31_theta@encord.ai", "annotator31"),
    ("annotator32_theta@encord.ai", "annotator32"),
    ("annotator33_theta@encord.ai", "annotator33"),
    ("annotator34_theta@encord.ai", "annotator34"),
    ("annotator35_theta@encord.ai", "annotator35"),
    ("annotator36_theta@encord.ai", "annotator36"),
    ("annotator37_theta@encord.ai", "annotator37"),
    ("annotator38_theta@encord.ai", "annotator38"),
    ("annotator39_theta@encord.ai", "annotator39"),
]

def seed_users():
    db = SessionLocal()
    
    print("--- Seeding Users with HASHED Passwords (bcrypt) ---")
    
    for email, password in USER_CREDENTIALS:
        # Hash the password with bcrypt
        hashed = hash_password(password)
        
        # Check if user exists
        existing = db.query(models.User).filter(models.User.username == email).first()
        
        if existing:
            # Update password if user exists
            existing.password_hash = hashed
            print(f"Updated: {email}")
        else:
            # Create new user
            user = models.User(
                username=email,
                password_hash=hashed,
                is_active=True,
                is_admin=False
            )
            db.add(user)
            print(f"Created: {email}")
    
    # Create admin user with hashed password
    admin_password = hash_password("admin123")
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if admin:
        admin.password_hash = admin_password
        print("Updated: admin")
    else:
        admin = models.User(
            username="admin",
            password_hash=admin_password,
            is_active=True,
            is_admin=True
        )
        db.add(admin)
        print("Created: admin")
    
    db.commit()
    db.close()
    
    print("--- Done! ---")
    print(f"Total users: {len(USER_CREDENTIALS) + 1}")
    print("⚠️  Remember to run this script to update passwords in database!")

if __name__ == "__main__":
    seed_users()
