import os
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
from models import User, Zone, Slot, Task
from auth import get_password_hash
from routers import auth as auth_router
from routers import users as users_router
from routers import zones as zones_router
from routers import tasks as tasks_router
from routers import dashboard as dashboard_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="苗圃任务管理平台", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(zones_router.router)
app.include_router(tasks_router.router)
app.include_router(dashboard_router.router)


def seed_data():
    db: Session = SessionLocal()
    try:
        if db.query(User).first():
            return

        admin = User(username="admin", hashed_password=get_password_hash("admin123"), role="admin")
        worker1 = User(username="worker1", hashed_password=get_password_hash("worker123"), role="worker")
        worker2 = User(username="worker2", hashed_password=get_password_hash("worker123"), role="worker")
        reviewer1 = User(username="reviewer1", hashed_password=get_password_hash("reviewer123"), role="reviewer")
        db.add_all([admin, worker1, worker2, reviewer1])
        db.flush()

        zone_a = Zone(name="A棚", description="A区育苗棚")
        zone_b = Zone(name="B棚", description="B区育苗棚")
        zone_c = Zone(name="C棚", description="C区育苗棚")
        db.add_all([zone_a, zone_b, zone_c])
        db.flush()

        for zone in [zone_a, zone_b, zone_c]:
            for pos in range(1, 21):
                slot = Slot(zone_id=zone.id, position=pos, status="empty")
                db.add(slot)
        db.flush()

        now = datetime.utcnow()

        tasks_data = [
            Task(title="播种-番茄苗A3", status="pending", zone_id=zone_a.id, slot_id=None, assignee_id=worker1.id, reviewer_id=reviewer1.id, planned_time=now + timedelta(days=3), notes="番茄种子播种"),
            Task(title="浇水-黄瓜苗B5", status="in_progress", zone_id=zone_b.id, slot_id=None, assignee_id=worker1.id, reviewer_id=None, planned_time=now + timedelta(days=1), notes="黄瓜苗日常浇水"),
            Task(title="施肥-辣椒苗C10", status="pending_review", zone_id=zone_c.id, slot_id=None, assignee_id=worker2.id, reviewer_id=reviewer1.id, planned_time=now + timedelta(days=2), notes="辣椒苗追肥"),
            Task(title="移栽-茄子苗A15", status="completed", zone_id=zone_a.id, slot_id=None, assignee_id=worker2.id, reviewer_id=reviewer1.id, planned_time=now - timedelta(days=1), notes="茄子苗移栽完成"),
            Task(title="喷药-西瓜苗B8", status="pending", zone_id=zone_b.id, slot_id=None, assignee_id=None, reviewer_id=reviewer1.id, planned_time=now + timedelta(days=5), notes="西瓜苗防病喷药"),
            Task(title="除草-草莓苗C2", status="cancelled", zone_id=zone_c.id, slot_id=None, assignee_id=worker1.id, reviewer_id=None, planned_time=now - timedelta(days=2), notes="草莓苗除草-已取消"),
        ]
        db.add_all(tasks_data)

        db.commit()
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seedling.db")
    if not os.path.exists(db_path):
        Base.metadata.create_all(bind=engine)
    seed_data()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8017, reload=True)
