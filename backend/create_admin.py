
from getpass import getpass

from database import SessionLocal
from models import User
from auth_utils import hash_password

db = SessionLocal()

try:
    name = input("Admin name: ").strip()
    email = input("Admin email: ").strip().lower()
    password = getpass("Admin password: ")

    if not name or not email:
        print("Name and email are required.")

    elif len(password) < 8:
        print("Password must contain at least 8 characters.")

    else:
        existing = db.query(User).filter(
            User.email == email
        ).first()

        if existing:
            print("An account with this email already exists.")
        else:
            admin = User(
                name=name,
                email=email,
                hashed_password=hash_password(password),
                role="admin"
            )

            db.add(admin)
            db.commit()

            print("Admin account created successfully!")

finally:
    db.close()
