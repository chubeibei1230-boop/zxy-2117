from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "worker"


class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class ZoneOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = ""
    slot_count: int = 0
    utilization: float = 0.0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ZoneCreate(BaseModel):
    name: str
    description: Optional[str] = ""


class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class SlotOut(BaseModel):
    id: int
    zone_id: int
    position: str
    status: str
    current_task_id: Optional[int] = None

    class Config:
        from_attributes = True


class SlotCreate(BaseModel):
    position: int
    status: Optional[str] = "empty"


class SlotUpdate(BaseModel):
    status: Optional[str] = None
    current_task_id: Optional[int] = None


class TaskHistoryOut(BaseModel):
    id: int
    task_id: int
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    undone: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskOut(BaseModel):
    id: int
    title: str
    status: str
    zone_id: int
    slot_id: Optional[int] = None
    assignee_id: Optional[int] = None
    reviewer_id: Optional[int] = None
    planned_time: Optional[str] = None
    notes: Optional[str] = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_str(cls, obj):
        data = {
            "id": obj.id,
            "title": obj.title,
            "status": obj.status,
            "zone_id": obj.zone_id,
            "slot_id": obj.slot_id,
            "assignee_id": obj.assignee_id,
            "reviewer_id": obj.reviewer_id,
            "planned_time": obj.planned_time.isoformat() if obj.planned_time else None,
            "notes": obj.notes,
            "created_at": obj.created_at,
            "updated_at": obj.updated_at,
        }
        return cls(**data)


class TaskDetailOut(BaseModel):
    id: int
    title: str
    status: str
    zone_id: int
    slot_id: Optional[int] = None
    assignee_id: Optional[int] = None
    reviewer_id: Optional[int] = None
    planned_time: Optional[str] = None
    notes: Optional[str] = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    undo_count: int = 0
    redo_count: int = 0
    history: List[TaskHistoryOut] = []

    class Config:
        from_attributes = True


class TaskCreate(BaseModel):
    title: str
    zone_id: int
    slot_id: Optional[int] = None
    assignee_id: Optional[int] = None
    reviewer_id: Optional[int] = None
    planned_time: Optional[datetime] = None
    notes: Optional[str] = ""


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    zone_id: Optional[int] = None
    slot_id: Optional[int] = None
    assignee_id: Optional[int] = None
    reviewer_id: Optional[int] = None
    planned_time: Optional[datetime] = None
    notes: Optional[str] = None


class TaskTransition(BaseModel):
    action: str


class ActivityLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    detail: Optional[str] = ""
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UndoRedoResponse(BaseModel):
    success: bool
    message: str
    history_entry: Optional[TaskHistoryOut] = None


TokenResponse.model_rebuild()
