from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db import SessionLocal
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogCreate, AuditLogRead, AuditLogUpdate
from app.services.auth_dependencies import get_current_user, require_superuser
from app.services.audit import log_action

router = APIRouter(prefix="/audit_logs", tags=["audit_logs"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[AuditLogRead])
def list_audit_logs(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(AuditLog).all()

@router.get("/{audit_log_id}", response_model=AuditLogRead)
def get_audit_log(audit_log_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    audit_log = db.query(AuditLog).filter(AuditLog.id == audit_log_id).first()
    if not audit_log:
        raise HTTPException(status_code=404, detail="AuditLog not found")
    return audit_log

@router.post("/", response_model=AuditLogRead)
def create_audit_log(audit_log: AuditLogCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_audit_log = AuditLog(**audit_log.dict())
    db.add(db_audit_log)
    db.commit()
    db.refresh(db_audit_log)
    log_action(db, "create_audit_log", current_user.id, "audit_log", db_audit_log.id)
    return db_audit_log

@router.put("/{audit_log_id}", response_model=AuditLogRead)
def update_audit_log(audit_log_id: int, audit_log: AuditLogUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_audit_log = db.query(AuditLog).filter(AuditLog.id == audit_log_id).first()
    if not db_audit_log:
        raise HTTPException(status_code=404, detail="AuditLog not found")
    for field, value in audit_log.dict(exclude_unset=True).items():
        setattr(db_audit_log, field, value)
    db.commit()
    db.refresh(db_audit_log)
    log_action(db, "update_audit_log", current_user.id, "audit_log", db_audit_log.id, meta={"fields": list(audit_log.dict(exclude_unset=True).keys())})
    return db_audit_log

@router.delete("/{audit_log_id}")
def delete_audit_log(audit_log_id: int, db: Session = Depends(get_db), current_user = Depends(require_superuser)):
    db_audit_log = db.query(AuditLog).filter(AuditLog.id == audit_log_id).first()
    if not db_audit_log:
        raise HTTPException(status_code=404, detail="AuditLog not found")
    db.delete(db_audit_log)
    db.commit()
    log_action(db, "delete_audit_log", current_user.id, "audit_log", audit_log_id)
    return {"ok": True} 