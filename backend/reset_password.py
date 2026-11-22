
from getpass import getpass

from database import SessionLocal
from models import User
from auth_utils import hash_password

db = SessionLocal()

try:
    email = input("Enter your registered email: ").strip()

    user = db.query(User).filter(User.email == email).first()

    if user is None:
        print("User not found. Check your registered email.")
    else:
        new_password = getpass("Enter your new password: ")

        if len(new_password) < 8:
            print("Password must contain at least 8 characters.")
        else:
            confirm_password = getpass("Confirm your new password: ")

            if new_password != confirm_password:
                print("Passwords do not match.")
            else:
                user.hashed_password = hash_password(new_password)
                db.commit()
                print("Password reset successfully!")

finally:
    db.close()
