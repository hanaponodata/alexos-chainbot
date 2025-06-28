from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from app.db import Base
from app.models.base import BaseModel

class AuditLog(Base, BaseModel):
    __tablename__ = "audit_logs"
    action = Column(String, nullable=False)
    actor_id = Column(Integer, nullable=False)
    target_type = Column(String, nullable=False)
    target_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=True)
    entanglement_id = Column(Integer, ForeignKey("entanglements.id"), nullable=True)
    meta = Column(JSON, nullable=True) 