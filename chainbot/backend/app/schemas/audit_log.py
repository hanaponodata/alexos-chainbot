from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

class AuditLogBase(BaseModel):
    action: str
    actor_id: int
    target_type: str
    target_id: int
    timestamp: datetime
    session_id: Optional[int] = None
    agent_id: Optional[int] = None
    workflow_id: Optional[int] = None
    entanglement_id: Optional[int] = None
    meta: Optional[Dict[str, Any]] = None

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogRead(AuditLogBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class AuditLogUpdate(BaseModel):
    action: Optional[str]
    actor_id: Optional[int]
    target_type: Optional[str]
    target_id: Optional[int]
    timestamp: Optional[datetime]
    session_id: Optional[int]
    agent_id: Optional[int]
    workflow_id: Optional[int]
    entanglement_id: Optional[int]
    meta: Optional[Dict[str, Any]] 