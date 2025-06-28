from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db import SessionLocal
from app.models.session import Session as SessionModel
from app.schemas.session import SessionCreate, SessionRead, SessionUpdate
from app.services.auth_dependencies import get_current_user, require_superuser
from app.services.audit import log_action

router = APIRouter(prefix="/sessions", tags=["sessions"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[SessionRead])
def list_sessions(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(SessionModel).all()

@router.get("/{session_id}", response_model=SessionRead)
def get_session(session_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.post("/", response_model=SessionRead)
def create_session(session: SessionCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_session = SessionModel(**session.dict())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    log_action(db, "create_session", current_user.id, "session", db_session.id, meta={"name": db_session.name})
    return db_session

@router.put("/{session_id}", response_model=SessionRead)
def update_session(session_id: int, session: SessionUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    for field, value in session.dict(exclude_unset=True).items():
        setattr(db_session, field, value)
    db.commit()
    db.refresh(db_session)
    log_action(db, "update_session", current_user.id, "session", db_session.id, meta={"fields": list(session.dict(exclude_unset=True).keys())})
    return db_session

@router.delete("/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db), current_user = Depends(require_superuser)):
    db_session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(db_session)
    db.commit()
    log_action(db, "delete_session", current_user.id, "session", session_id)
    return {"ok": True} 