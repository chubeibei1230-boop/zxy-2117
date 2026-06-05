from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import User, Task, Slot, TaskHistory, ActivityLog
from schemas import (
    TaskOut, TaskCreate, TaskUpdate, TaskTransition,
    TaskHistoryOut, TaskDetailOut, UndoRedoResponse,
)
from auth import get_current_user

TRACKED_FIELDS = {"slot_id", "assignee_id", "planned_time", "notes"}

VALID_TRANSITIONS = {
    "pending": {"in_progress", "cancelled"},
    "in_progress": {"pending_review", "cancelled"},
    "pending_review": {"completed", "in_progress"},
}

TRANSITION_ACTION_MAP = {
    "start": ("pending", "in_progress"),
    "submit_review": ("in_progress", "pending_review"),
    "approve": ("pending_review", "completed"),
    "reject": ("pending_review", "in_progress"),
    "cancel": (None, "cancelled"),
}

router = APIRouter(prefix="/api/tasks", tags=["任务管理"])


def record_history(task: Task, field_name: str, old_value, new_value, db: Session):
    entry = TaskHistory(
        task_id=task.id,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        undone=False,
    )
    db.add(entry)


def add_activity_log(db: Session, user_id: int, action: str, detail: str):
    log = ActivityLog(user_id=user_id, action=action, detail=detail)
    db.add(log)


@router.get("", response_model=List[TaskOut])
def list_tasks(
    status: Optional[str] = None,
    zone_id: Optional[int] = None,
    assignee_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Task)
    if status:
        query = query.filter(Task.status == status)
    if zone_id:
        query = query.filter(Task.zone_id == zone_id)
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    tasks = query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()
    return [TaskOut.from_orm_with_str(t) for t in tasks]


@router.get("/{task_id}", response_model=TaskDetailOut)
def get_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    history = db.query(TaskHistory).filter(TaskHistory.task_id == task_id).order_by(TaskHistory.created_at.desc()).all()
    undo_count = sum(1 for h in history if not h.undone)
    redo_count = sum(1 for h in history if h.undone)

    return TaskDetailOut(
        id=task.id,
        title=task.title,
        status=task.status,
        zone_id=task.zone_id,
        slot_id=task.slot_id,
        assignee_id=task.assignee_id,
        reviewer_id=task.reviewer_id,
        planned_time=task.planned_time.isoformat() if task.planned_time else None,
        notes=task.notes,
        created_at=task.created_at,
        updated_at=task.updated_at,
        undo_count=undo_count,
        redo_count=redo_count,
        history=[TaskHistoryOut.model_validate(h) for h in history],
    )


@router.post("", response_model=TaskOut)
def create_task(data: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = Task(
        title=data.title,
        zone_id=data.zone_id,
        slot_id=data.slot_id,
        assignee_id=data.assignee_id,
        reviewer_id=data.reviewer_id,
        planned_time=data.planned_time,
        notes=data.notes or "",
        status="pending",
    )
    db.add(task)
    db.flush()

    if data.slot_id:
        slot = db.query(Slot).filter(Slot.id == data.slot_id).first()
        if slot:
            slot.status = "in_use"
            slot.current_task_id = task.id

    add_activity_log(db, current_user.id, "create_task", f"创建任务: {task.title}")
    db.commit()
    db.refresh(task)
    return TaskOut.from_orm_with_str(task)


@router.put("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, data: TaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    update_data = data.model_dump(exclude_unset=True)

    undone_entries = db.query(TaskHistory).filter(
        TaskHistory.task_id == task_id,
        TaskHistory.undone == True,
    ).all()
    for entry in undone_entries:
        entry.undone = True

    for field_name, new_value in update_data.items():
        if field_name in TRACKED_FIELDS:
            old_value = getattr(task, field_name)
            if old_value != new_value:
                record_history(task, field_name, old_value, new_value, db)

    for key, value in update_data.items():
        setattr(task, key, value)

    task.updated_at = datetime.utcnow()

    if "slot_id" in update_data:
        if task.slot_id:
            slot = db.query(Slot).filter(Slot.id == task.slot_id).first()
            if slot:
                slot.status = "in_use"
                slot.current_task_id = task.id

    add_activity_log(db, current_user.id, "update_task", f"更新任务: {task.title}")
    db.commit()
    db.refresh(task)
    return TaskOut.from_orm_with_str(task)


@router.post("/{task_id}/transition", response_model=TaskOut)
def transition_task(task_id: int, data: TaskTransition, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    action = data.action
    if action not in TRANSITION_ACTION_MAP:
        raise HTTPException(status_code=400, detail=f"无效操作: {action}")

    required_from, target_status = TRANSITION_ACTION_MAP[action]

    if required_from is not None and task.status != required_from:
        raise HTTPException(status_code=400, detail=f"当前状态 {task.status} 不允许执行 {action} 操作")

    if action == "cancel" and task.status not in ("pending", "in_progress"):
        raise HTTPException(status_code=400, detail="只有 pending 或 in_progress 状态的任务可以取消")

    old_status = task.status
    record_history(task, "status", old_status, target_status, db)

    task.status = target_status
    task.updated_at = datetime.utcnow()

    if target_status == "in_progress" and not task.assignee_id:
        task.assignee_id = current_user.id

    if target_status == "cancelled" and task.slot_id:
        slot = db.query(Slot).filter(Slot.id == task.slot_id).first()
        if slot:
            slot.status = "empty"
            slot.current_task_id = None

    if target_status == "completed" and task.slot_id:
        slot = db.query(Slot).filter(Slot.id == task.slot_id).first()
        if slot:
            slot.status = "empty"
            slot.current_task_id = None

    add_activity_log(db, current_user.id, f"transition_{action}", f"任务 {task.title}: {old_status} -> {target_status}")
    db.commit()
    db.refresh(task)
    return TaskOut.from_orm_with_str(task)


@router.get("/{task_id}/history", response_model=List[TaskHistoryOut])
def get_task_history(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    entries = db.query(TaskHistory).filter(TaskHistory.task_id == task_id).order_by(TaskHistory.created_at.desc()).all()
    return entries


@router.post("/{task_id}/undo", response_model=UndoRedoResponse)
def undo_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    entry = db.query(TaskHistory).filter(
        TaskHistory.task_id == task_id,
        TaskHistory.undone == False,
    ).order_by(TaskHistory.created_at.desc()).first()

    if not entry:
        return UndoRedoResponse(success=False, message="没有可撤销的操作")

    entry.undone = True
    old_value = entry.old_value
    field_name = entry.field_name

    if field_name in ("slot_id", "assignee_id"):
        setattr(task, field_name, int(old_value) if old_value and old_value != "None" else None)
    elif field_name == "planned_time":
        setattr(task, field_name, datetime.fromisoformat(old_value) if old_value and old_value != "None" else None)
    else:
        setattr(task, field_name, old_value if old_value != "None" else None)

    task.updated_at = datetime.utcnow()

    add_activity_log(db, current_user.id, "undo", f"撤销任务 {task.title} 的 {field_name} 字段")
    db.commit()
    db.refresh(entry)

    return UndoRedoResponse(success=True, message="撤销成功", history_entry=TaskHistoryOut.model_validate(entry))


@router.post("/{task_id}/redo", response_model=UndoRedoResponse)
def redo_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    entry = db.query(TaskHistory).filter(
        TaskHistory.task_id == task_id,
        TaskHistory.undone == True,
    ).order_by(TaskHistory.created_at.desc()).first()

    if not entry:
        return UndoRedoResponse(success=False, message="没有可重做的操作")

    entry.undone = False
    new_value = entry.new_value
    field_name = entry.field_name

    if field_name in ("slot_id", "assignee_id"):
        setattr(task, field_name, int(new_value) if new_value and new_value != "None" else None)
    elif field_name == "planned_time":
        setattr(task, field_name, datetime.fromisoformat(new_value) if new_value and new_value != "None" else None)
    else:
        setattr(task, field_name, new_value if new_value != "None" else None)

    task.updated_at = datetime.utcnow()

    add_activity_log(db, current_user.id, "redo", f"重做任务 {task.title} 的 {field_name} 字段")
    db.commit()
    db.refresh(entry)

    return UndoRedoResponse(success=True, message="重做成功", history_entry=TaskHistoryOut.model_validate(entry))
