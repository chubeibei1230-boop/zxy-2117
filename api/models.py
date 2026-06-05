from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(128), nullable=False)
    role = Column(String(20), nullable=False, default="worker")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks_assigned = relationship("Task", foreign_keys="Task.assignee_id", back_populates="assignee")
    tasks_reviewing = relationship("Task", foreign_keys="Task.reviewer_id", back_populates="reviewer")
    activity_logs = relationship("ActivityLog", back_populates="user")


class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    slots = relationship("Slot", back_populates="zone", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="zone")


class Slot(Base):
    __tablename__ = "slots"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    position = Column(Integer, nullable=False)
    status = Column(String(20), default="empty")
    current_task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)

    zone = relationship("Zone", back_populates="slots")
    current_task = relationship("Task", foreign_keys=[current_task_id])


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    status = Column(String(30), default="pending")
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("slots.id"), nullable=True)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    planned_time = Column(DateTime, nullable=True)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    zone = relationship("Zone", back_populates="tasks")
    slot = relationship("Slot", foreign_keys=[slot_id])
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="tasks_assigned")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="tasks_reviewing")
    history_entries = relationship("TaskHistory", back_populates="task", cascade="all, delete-orphan")


class TaskHistory(Base):
    __tablename__ = "task_history"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    field_name = Column(String(50), nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    undone = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="history_entries")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    detail = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="activity_logs")
