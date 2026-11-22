
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from database import Base


class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    priority = Column(String(50), default="Medium")
    status = Column(String(50), default="Pending")
    department = Column(String(100), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # AI-generated recommendation
    recommendation = Column(Text, nullable=True)

    # Uploaded issue image
    image_url = Column(String(500), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="student")


class IssueHistory(Base):
    __tablename__ = "issue_history"

    id = Column(Integer, primary_key=True, index=True)

    issue_id = Column(
        Integer,
        ForeignKey("issues.id"),
        nullable=False
    )

    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)

    changed_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    changed_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    issue_id = Column(
        Integer,
        ForeignKey("issues.id"),
        nullable=False
    )

    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)

    is_read = Column(Boolean, default=False, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
