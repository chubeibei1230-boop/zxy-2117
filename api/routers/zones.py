from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, Zone, Slot, Task, ActivityLog
from schemas import ZoneOut, ZoneCreate, ZoneUpdate, SlotOut, SlotCreate, SlotUpdate
from auth import get_current_user, require_role

router = APIRouter(prefix="/api/zones", tags=["区域管理"])


def zone_to_out(zone: Zone, db: Session) -> ZoneOut:
    slot_count = db.query(func.count(Slot.id)).filter(Slot.zone_id == zone.id).scalar() or 0
    in_use_count = db.query(func.count(Slot.id)).filter(Slot.zone_id == zone.id, Slot.status == "in_use").scalar() or 0
    utilization = (in_use_count / slot_count * 100) if slot_count > 0 else 0
    return ZoneOut(
        id=zone.id,
        name=zone.name,
        description=zone.description or "",
        slot_count=slot_count,
        utilization=round(utilization, 1),
        created_at=zone.created_at,
    )


@router.get("", response_model=List[ZoneOut])
def list_zones(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    zones = db.query(Zone).offset(skip).limit(limit).all()
    return [zone_to_out(z, db) for z in zones]


@router.get("/{zone_id}", response_model=ZoneOut)
def get_zone(zone_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="区域不存在")
    return zone_to_out(zone, db)


@router.post("", response_model=ZoneOut)
def create_zone(data: ZoneCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    zone = Zone(name=data.name, description=data.description)
    db.add(zone)
    db.commit()
    db.refresh(zone)

    log = ActivityLog(user_id=current_user.id, action="create_zone", detail=f"创建区域 {zone.name}")
    db.add(log)
    db.commit()

    return zone_to_out(zone, db)


@router.put("/{zone_id}", response_model=ZoneOut)
def update_zone(zone_id: int, data: ZoneUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="区域不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(zone, key, value)

    db.commit()
    db.refresh(zone)

    log = ActivityLog(user_id=current_user.id, action="update_zone", detail=f"更新区域 {zone.name}")
    db.add(log)
    db.commit()

    return zone_to_out(zone, db)


@router.delete("/{zone_id}")
def delete_zone(zone_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role("admin"))):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="区域不存在")

    zone_name = zone.name
    db.delete(zone)
    db.commit()

    log = ActivityLog(user_id=current_user.id, action="delete_zone", detail=f"删除区域 {zone_name}")
    db.add(log)
    db.commit()

    return {"success": True, "message": "区域已删除"}


def slot_to_out(slot: Slot) -> SlotOut:
    zone = slot.zone
    row = (slot.position - 1) // 5 + 1
    col = (slot.position - 1) % 5 + 1
    zone_prefix = zone.name[0] if zone else "X"
    return SlotOut(
        id=slot.id,
        zone_id=slot.zone_id,
        position=f"{zone_prefix}{row}-{col}",
        status=slot.status,
        current_task_id=slot.current_task_id,
    )


@router.get("/{zone_id}/slots", response_model=List[SlotOut])
def list_slots(zone_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="区域不存在")
    slots = db.query(Slot).filter(Slot.zone_id == zone_id).order_by(Slot.position).all()
    return [slot_to_out(s) for s in slots]


@router.post("/{zone_id}/slots", response_model=SlotOut)
def create_slot(zone_id: int, data: SlotCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="区域不存在")

    slot = Slot(zone_id=zone_id, position=data.position, status=data.status)
    db.add(slot)
    db.commit()
    db.refresh(slot)

    log = ActivityLog(user_id=current_user.id, action="create_slot", detail=f"在区域 {zone.name} 创建槽位 {slot.position}")
    db.add(log)
    db.commit()

    return slot


@router.put("/slots/{slot_id}", response_model=SlotOut)
def update_slot(slot_id: int, data: SlotUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="槽位不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(slot, key, value)

    db.commit()
    db.refresh(slot)

    log = ActivityLog(user_id=current_user.id, action="update_slot", detail=f"更新槽位 {slot.position}")
    db.add(log)
    db.commit()

    return slot
