from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, ActivityLog
from schemas import UserOut, UserCreate, UserUpdate
from auth import get_current_user, get_password_hash, require_role

router = APIRouter(prefix="/api/users", tags=["用户管理"])


@router.get("", response_model=List[UserOut])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(User).order_by(User.id).offset(skip).limit(limit).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user


@router.post("", response_model=UserOut)
def create_user(data: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已存在")
    user = User(
        username=data.username,
        hashed_password=get_password_hash(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log = ActivityLog(user_id=current_user.id, action="create_user", detail=f"创建用户 {user.username}")
    db.add(log)
    db.commit()

    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)

    log = ActivityLog(user_id=current_user.id, action="update_user", detail=f"更新用户 {user.username}")
    db.add(log)
    db.commit()

    return user


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="不能删除自己")

    username = user.username
    db.delete(user)
    db.commit()

    log = ActivityLog(user_id=current_user.id, action="delete_user", detail=f"删除用户 {username}")
    db.add(log)
    db.commit()

    return {"success": True, "message": "用户已删除"}
