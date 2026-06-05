from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models import User, Task, Zone, Slot, ActivityLog
from schemas import ActivityLogOut
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["仪表盘"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    status_counts = db.query(Task.status, func.count(Task.id)).group_by(Task.status).all()
    by_status = {}
    for status, count in status_counts:
        by_status[status] = count
    all_statuses = ["pending", "in_progress", "pending_review", "completed", "cancelled"]
    for s in all_statuses:
        if s not in by_status:
            by_status[s] = 0
    return {"by_status": by_status, "total": sum(by_status.values())}


@router.get("/exceptions")
def get_exceptions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    abnormal_counts = (
        db.query(Zone.name, func.count(Slot.id))
        .join(Slot, Zone.id == Slot.zone_id)
        .filter(Slot.status == "abnormal")
        .group_by(Zone.id, Zone.name)
        .all()
    )
    by_zone = {}
    for name, count in abnormal_counts:
        by_zone[name] = count
    return {"by_zone": by_zone}


@router.get("/workload")
def get_workload(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    workload = (
        db.query(User.username, func.count(Task.id))
        .join(Task, User.id == Task.assignee_id, isouter=True)
        .filter(User.role == "worker", User.is_active == True)
        .filter(Task.status.in_(["pending", "in_progress", "pending_review"]))
        .group_by(User.id, User.username)
        .all()
    )
    by_user = {}
    for username, count in workload:
        by_user[username] = count
    return {"by_user": by_user}


@router.get("/recent", response_model=List[ActivityLogOut])
def get_recent_logs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(10).all()
    return logs
