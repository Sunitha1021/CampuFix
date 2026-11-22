
from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ai_service import classify_issue
import os
import uuid
from pathlib import Path
import re
from difflib import SequenceMatcher
from datetime import datetime, timezone

from database import engine, get_db
from models import Base, Issue, User, IssueHistory, Notification
from email_service import send_status_email
from schemas import (
    IssueCreate,
    IssueResponse,
    AdminIssueResponse,
    IssueStatusUpdate,
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse
)
from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    SECRET_KEY,
    ALGORITHM
)
from jose import JWTError, jwt

from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="CampusFix API")

security = HTTPBearer()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# Image upload configuration
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
}

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

# Make uploaded images accessible through the API
from fastapi.staticfiles import StaticFiles

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# Home
@app.get("/")
def home():
    return {"message": "Welcome to CampusFix Backend!"}


# Health check
@app.get("/health")
def health():
    return {"status": "Backend is healthy"}


# Reusable authentication dependency
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )

        user = db.query(User).filter(
            User.id == int(user_id)
        ).first()

        if user is None:
            raise HTTPException(
                status_code=401,
                detail="User not found"
            )

        return user

    except (JWTError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )


# Reusable admin authorization dependency
def get_current_admin(
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user


# Register student
@app.post("/register", response_model=UserResponse)
def register_user(
    user: UserRegister,
    db: Session = Depends(get_db)
):
    if len(user.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 8 characters"
        )

    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = User(
        name=user.name,
        email=user.email,
        hashed_password=hash_password(user.password),
        role="student"
    )

    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    return new_user


# Login
@app.post("/login", response_model=TokenResponse)
def login_user(
    user: UserLogin,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if not existing_user or not verify_password(
        user.password,
        existing_user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token({
        "sub": str(existing_user.id)
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": existing_user
    }


# Get logged-in user's profile
@app.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user)
):
    return current_user


# Create a new issue using Gemini AI
@app.post("/issues", response_model=IssueResponse)
def create_issue(
    issue: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Analyse the issue using Gemini AI
        ai_result = classify_issue(
            issue.title,
            issue.description
        )

        category = ai_result["category"]
        priority = ai_result["priority"]
        department = ai_result["department"]
        recommendation = ai_result["recommendation"]

        print("Gemini AI classification successful!")

    except Exception as e:
        # Keep issue reporting available if Gemini is temporarily unavailable
        print(f"Gemini AI unavailable: {e}")

        department_mapping = {
            "Electrical": "Electrical Department",
            "Plumbing": "Maintenance Department",
            "Wi-Fi": "IT Department",
            "Cleanliness": "Housekeeping Department",
            "Infrastructure": "Maintenance Department"
        }

        category = issue.category
        priority = "Medium"
        department = department_mapping.get(
            category,
            "General Administration"
        )
        recommendation = (
            "The issue has been submitted for manual review."
        )

    # Save the issue and AI results in SQLite
    new_issue = Issue(
        title=issue.title,
        description=issue.description,
        category=category,
        priority=priority,
        status="Pending",
        department=department,
        recommendation=recommendation,
        user_id=current_user.id,
        created_at=datetime.now(timezone.utc)
    )

    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)
    print("NEW ISSUE CREATED AT:", new_issue.created_at)

    return new_issue
# Create an issue with an optional image
@app.post("/issues/with-image", response_model=IssueResponse)
async def create_issue_with_image(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    image_url = None
    saved_image_path = None

    # Validate and save the uploaded image
    if image and image.filename:
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Only JPG, PNG and WEBP images are allowed."
            )

        image_data = await image.read(MAX_IMAGE_SIZE + 1)

        if len(image_data) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Image size must not exceed 5 MB."
            )

        if not image_data:
            raise HTTPException(
                status_code=400,
                detail="The uploaded image is empty."
            )

        # Check the actual file signature, not only its MIME type
        valid_signature = (
            image_data.startswith(b"\xff\xd8\xff")
            if image.content_type == "image/jpeg"
            else image_data.startswith(b"\x89PNG\r\n\x1a\n")
            if image.content_type == "image/png"
            else (
                len(image_data) >= 12
                and image_data[:4] == b"RIFF"
                and image_data[8:12] == b"WEBP"
            )
        )

        if not valid_signature:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid image."
            )

        filename = f"{uuid.uuid4().hex}{ALLOWED_IMAGE_TYPES[image.content_type]}"
        saved_image_path = UPLOAD_DIR / filename

        with open(saved_image_path, "wb") as file:
            file.write(image_data)

        image_url = f"/uploads/{filename}"

    # Run Gemini AI classification
    try:
        ai_result = classify_issue(title, description)

        issue_category = ai_result["category"]
        priority = ai_result["priority"]
        department = ai_result["department"]
        recommendation = ai_result["recommendation"]

        print("Gemini AI classification successful!")

    except Exception as e:
        print(f"Gemini AI unavailable: {e}")

        department_mapping = {
            "Electrical": "Electrical Department",
            "Plumbing": "Maintenance Department",
            "Wi-Fi": "IT Department",
            "Cleanliness": "Housekeeping Department",
            "Infrastructure": "Maintenance Department"
        }

        issue_category = category
        priority = "Medium"
        department = department_mapping.get(
            category,
            "General Administration"
        )
        recommendation = (
            "The issue has been submitted for manual review."
        )

    # Save issue details
    try:
        new_issue = Issue(
            title=title,
            description=description,
            category=issue_category,
            priority=priority,
            status="Pending",
            department=department,
            recommendation=recommendation,
            image_url=image_url,
            user_id=current_user.id,
            created_at=datetime.now(timezone.utc)
        )

        db.add(new_issue)
        db.commit()
        db.refresh(new_issue)

        return new_issue

    except Exception:
        db.rollback()

        # Remove the image if saving the issue fails
        if saved_image_path and saved_image_path.exists():
            saved_image_path.unlink()

        raise HTTPException(
            status_code=500,
            detail="Unable to save the issue. Please try again."
        )


# Duplicate issue detection

def normalize_text(text: str) -> str:
    """Convert text to lowercase and remove unnecessary characters."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return " ".join(text.split())


def calculate_similarity(text1: str, text2: str) -> float:
    """Calculate similarity using sequence and word overlap."""
    text1 = normalize_text(text1)
    text2 = normalize_text(text2)

    if not text1 or not text2:
        return 0.0

    sequence_score = SequenceMatcher(
        None, text1, text2
    ).ratio()

    words1 = set(text1.split())
    words2 = set(text2.split())

    union = words1 | words2
    jaccard_score = (
        len(words1 & words2) / len(union)
        if union else 0.0
    )

    return max(sequence_score, jaccard_score)


@app.post("/issues/check-duplicate")
def check_duplicate_issue(
    issue: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    submitted_text = f"{issue.title} {issue.description}"

    # Compare against issues that are not yet resolved
    existing_issues = (
        db.query(Issue)
        .filter(Issue.status.in_(["Pending", "In Progress"]))
        .order_by(Issue.id.desc())
        .limit(200)
        .all()
    )

    matches = []

    for existing in existing_issues:
        existing_text = (
            f"{existing.title} {existing.description}"
        )

        similarity = calculate_similarity(
            submitted_text,
            existing_text
        )

        if similarity >= 0.55:
            matches.append({
                "id": existing.id,
                "title": existing.title,
                "category": existing.category,
                "status": existing.status,
                "similarity": round(similarity * 100, 1)
            })

    matches.sort(
        key=lambda item: item["similarity"],
        reverse=True
    )

    return {
        "has_duplicates": len(matches) > 0,
        "matches": matches[:3],
        "message": (
            "Similar issues were found."
            if matches
            else "No similar issues found."
        )
    }


# Get only the logged-in student's issues
@app.get("/issues/my", response_model=list[IssueResponse])
def get_my_issues(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(Issue)
        .filter(Issue.user_id == current_user.id)
        .order_by(Issue.id.desc())
        .all()
    )


# Admin: Get all issues with student details
@app.get("/issues", response_model=list[AdminIssueResponse])
def get_all_issues(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    results = (
        db.query(Issue, User.name, User.email)
        .outerjoin(User, Issue.user_id == User.id)
        .order_by(Issue.id.desc())
        .all()
    )

    return [
        {
            "id": issue.id,
            "title": issue.title,
            "description": issue.description,
            "category": issue.category,
            "priority": issue.priority,
            "status": issue.status,
            "department": issue.department,
            "user_id": issue.user_id,
            "recommendation": issue.recommendation,
            "image_url": issue.image_url,
            "created_at": issue.created_at,
            "student_name": student_name,
            "student_email": student_email
        }
        for issue, student_name, student_email in results
    ]


# Get one issue (owner or admin)
@app.get("/issues/{issue_id}", response_model=IssueResponse)
def get_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    issue = db.query(Issue).filter(
        Issue.id == issue_id
    ).first()

    if issue is None:
        raise HTTPException(
            status_code=404,
            detail="Issue not found"
        )

    if (
        current_user.role != "admin"
        and issue.user_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="You cannot access another student's issue"
        )

    return issue

# Get status history of an issue
@app.get("/issues/{issue_id}/history")
def get_issue_history(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    issue = db.query(Issue).filter(
        Issue.id == issue_id
    ).first()

    if issue is None:
        raise HTTPException(
            status_code=404,
            detail="Issue not found"
        )

    # Students can view only their own issue history
    if current_user.role != "admin" and issue.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to view this issue history"
        )

    history = (
        db.query(IssueHistory)
        .filter(IssueHistory.issue_id == issue_id)
        .order_by(IssueHistory.changed_at.asc())
        .all()
    )

    return [
        {
            "id": item.id,
            "issue_id": item.issue_id,
            "old_status": item.old_status,
            "new_status": item.new_status,
            "changed_by": item.changed_by,
            "changed_at": item.changed_at.isoformat() if item.changed_at else None
        }
        for item in history
    ]



@app.patch("/issues/{issue_id}/status", response_model=IssueResponse)
async def update_issue_status(
    issue_id: int,
    update: IssueStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    allowed_statuses = ["Pending", "In Progress", "Resolved"]

    if update.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    old_status = issue.status

    if old_status == update.status:
        return issue

    # Find the student who reported this issue
    student = None

    if issue.user_id is not None:
        student = db.query(User).filter(
            User.id == issue.user_id
        ).first()

    # Update issue status
    issue.status = update.status

    # Save status history
    history = IssueHistory(
        issue_id=issue.id,
        old_status=old_status,
        new_status=update.status,
        changed_by=admin.id
    )

    db.add(history)

    # Create in-app notification
    if student:
        notification = Notification(
            user_id=student.id,
            issue_id=issue.id,
            title="Issue Status Updated",
            message=(
                f"Your issue #{issue.id} '{issue.title}' "
                f"has been updated from {old_status} "
                f"to {update.status}."
            )
        )

        db.add(notification)

    # Commit database changes first
    try:
        db.commit()
        db.refresh(issue)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to update issue status"
        )

    # Send email after successful database commit
    if student:
        try:
            await send_status_email(
                recipient_email=student.email,
                student_name=student.name,
                issue_id=issue.id,
                issue_title=issue.title,
                old_status=old_status,
                new_status=update.status
            )

            print(f"Status update email sent to {student.email}")

        except Exception as email_error:
            print(f"Email sending failed: {email_error}")

    return issue


# Student: Get notifications
@app.get("/notifications")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )

    unread_count = sum(
        1 for notification in notifications
        if not notification.is_read
    )

    return {
        "unread_count": unread_count,
        "notifications": [
            {
                "id": item.id,
                "issue_id": item.issue_id,
                "title": item.title,
                "message": item.message,
                "is_read": item.is_read,
                "created_at": (
                    item.created_at.isoformat()
                    if item.created_at else None
                )
            }
            for item in notifications
        ]
    }


# Student: Mark a notification as read
@app.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if notification is None:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return {
        "message": "Notification marked as read",
        "notification_id": notification.id,
        "is_read": notification.is_read
    }
